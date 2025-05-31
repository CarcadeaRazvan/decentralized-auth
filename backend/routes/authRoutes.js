const express = require("express");
const crypto = require("crypto");
const { getNonce, verifyMessage } = require("../utils/blockchainUtils");
const {
  computeSharedSecret,
  encryptWithSharedSecret,
  generateKeys,
  dh,
} = require("../utils/cryptoUtils");
const {
  createSession,
  getSession,
  setSharedSecret,
  getSharedSecret,
  sessionExists,
  deleteSession,
  storeRefreshToken,
  isRefreshTokenValid,
} = require("../utils/sessionManager");
const {
  generateJWT,
  generateRefreshToken,
  verifyJWT,
  verifyRefreshJWT,
} = require("../utils/jwtUtils");
// const { abi, contractAddress, provider } = require('../config/constants')
require("dotenv").config();
const router = express.Router();

router.post("/nonce", async (req, res) => {
  try {
    const { address } = req.body;
    const nonce = crypto.randomBytes(16).toString("hex");
    console.log(`Generated nonce ${nonce} for address ${address}`);
    res.json({ nonce });
  } catch (error) {
    console.error("Error in /nonce endpoint:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/verify", async (req, res) => {
  const { address, nonce, signature, userPublicKey } = req.body;
  const storedNonce = await getNonce(address);
  if (storedNonce !== signature) {
    console.log("Invalid nonce");
    return res.status(400).json({ error: "Invalid nonce" });
  }
  const recoveredAddress = verifyMessage(nonce, signature);
  if (recoveredAddress.toLowerCase() !== address.toLowerCase())
    return res.status(401).json({ error: "Invalid signature" });
  let session;
  if (!sessionExists(address)) {
    const { dh, publicKey } = generateKeys();
    createSession(address, dh);
    session = getSession(address);
    console.log("New session created for address:", address);
  } else {
    session = getSession(address);
    console.log("Existing session found for address:", address);
  }

  const { dh, publicKey, privateKey, prime } = generateKeys();
  const sharedSecret = computeSharedSecret(
    userPublicKey,
    dh.getPrivateKey("hex"),
    dh.getPrime("hex")
  );
  setSharedSecret(address, sharedSecret);
  const token = generateJWT({ address });
  const refreshToken = generateRefreshToken({ address });
  storeRefreshToken(address, refreshToken);
  const encryptedToken = encryptWithSharedSecret(token, sharedSecret);
  const encryptedRefreshToken = encryptWithSharedSecret(
    refreshToken,
    sharedSecret
  );
  res.json({ encryptedToken, encryptedRefreshToken, publicKey });
});

router.get("/refresh", async (req, res) => {
  const address = req.headers["user-address"];
  if (!address) {
    return res.status(400).json({ error: "No address provided" });
  }

  const cookieName = `refresh_token_${address}`;
  const token = req.cookies[cookieName];

  if (!token) {
    return res.status(401).json({
      error: "Unauthorized - No token provided",
      isDisconnected: true,
    });
  }

  try {
    const cookieData = JSON.parse(decodeURIComponent(token));

    const encryptedRefreshToken = cookieData.token;

    const sharedSecret = getSharedSecret(address);
    const { ciphertext, iv: ivHex, authTag } = encryptedRefreshToken;

    const iv = Buffer.from(ivHex, "hex");
    const key = Buffer.from(sharedSecret, "hex").slice(0, 32);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decryptedToken = decipher.update(ciphertext, "hex", "utf8");
    decryptedToken += decipher.final("utf8");

    const decoded = verifyRefreshJWT(decryptedToken);

    if (!isRefreshTokenValid(decoded.address)) {
      return res
        .status(403)
        .json({ error: "Invalid or expired refresh token" });
    }

    const newToken = generateJWT({ address });
    const encryptedToken = encryptWithSharedSecret(newToken, sharedSecret);

    return res.json({
      message: "Token refreshed successfully",
      encryptedToken,
    });
  } catch (err) {
    deleteSession(address);
    return res
      .status(500)
      .json({ error: "Failed to refresh token", isDisconnected: true });
  }
});

module.exports = router;
