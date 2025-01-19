const express = require("express");
const crypto = require("crypto");
const {
  registerPublicKey,
  storeNonce,
  getPublicKey,
  getNonce,
  verifyMessage,
} = require("../utils/blockchainUtils");
const {
  computeSharedSecret,
  encryptWithSharedSecret,
  generateKeys,
  dh,
  setSharedSecret,
} = require("../utils/cryptoUtils");
const { generateJWT } = require("../utils/jwtUtils");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { address, publicKey } = req.body;

  try {
    await registerPublicKey(address, publicKey);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to register public key" });
  }
});

router.post("/nonce", async (req, res) => {
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }

  try {
    const nonce = crypto.randomBytes(16).toString("hex");
    console.log(`Calling storeNonce with address: ${address}, nonce: ${nonce}`);
    await storeNonce(address, nonce);
    const { publicKey } = generateKeys();
    console.log("Backend Generated Public Key:", publicKey);
    res.json({ nonce, backendPublicKey: publicKey });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate nonce" });
  }
});

router.post("/verify", async (req, res) => {
  const { address, nonce, signature, userPublicKey } = req.body;

  if (!address || !nonce || !signature || !userPublicKey) {
    return res.status(400).json({
      error: "Address, nonce, signature, and public key are required",
    });
  }

  try {
    const publicKey = await getPublicKey(address);

    if (!publicKey) {
      return res
        .status(404)
        .json({ error: "Public key not found for this address" });
    }

    const storedNonce = await getNonce(address);

    if (storedNonce !== nonce) {
      return res.status(400).json({ error: "Invalid nonce" });
    }

    const recoveredAddress = verifyMessage(nonce, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    console.log(`Signature verified for ${address}`);

    let sharedSecret = "";

    sharedSecret = computeSharedSecret(
      userPublicKey,
      dh.getPrivateKey("hex"),
      dh.getPrime("hex")
    );
    setSharedSecret(sharedSecret);

    console.log("Shared Secret Established with User:", sharedSecret);

    const token = generateJWT({ address, timestamp: Date.now() });
    const encryptedToken = encryptWithSharedSecret(token, sharedSecret);

    res.json({ encryptedToken });
  } catch (err) {
    res.status(500).json({ error: "Verification failed" });
  }
});

module.exports = router;
