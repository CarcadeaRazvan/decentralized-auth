const express = require("express");
const crypto = require("crypto");
const { getNonce, verifyMessage } = require("../utils/blockchainUtils");
const {
  computeSharedSecret,
  encryptWithSharedSecret,
  generateKeys,
  dh,
} = require("../utils/cryptoUtils");
// const { createSession, getSession, setSharedSecret } = require("../utils/sessionManager");
const { generateJWT } = require("../utils/jwtUtils");
const { abi, contractAddress, provider } = require('../config/constants')

const router = express.Router();

router.post("/nonce", async (req, res) => {
  try {
    const { address } = req.body;
    console.log("Received nonce request for address:", address);

    // Generate a random nonce
    const nonce = crypto.randomBytes(16).toString("hex");
    console.log("Generated nonce:", nonce);

    // // Store the nonce
    // await storeNonce(address, nonce);
    // console.log("Nonce stored successfully for address:", address);

    // // Generate DH keys
    // const { dh, publicKey } = generateKeys();
    // console.log("Generated Diffie-Hellman public key:", publicKey);

    // // Create the session
    // createSession(address, dh);
    // console.log("Session created for address:", address);

    // Send response with nonce and DH public key
    res.json({nonce});
  } catch (error) {
    console.error("Error in /nonce endpoint:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post("/verify", async (req, res) => {
  const { address, nonce, signature, userPublicKey } = req.body;
  const storedNonce = await getNonce(address);
  console.log("stored nonce: ", storedNonce);
    console.log("signature: ", signature)
  if (storedNonce !== signature) {
    
    console.log("Invalid nonce")
    return res.status(400).json({ error: "Invalid nonce" });
  }
  const recoveredAddress = verifyMessage(nonce, signature);
  if (recoveredAddress.toLowerCase() !== address.toLowerCase()) return res.status(401).json({ error: "Invalid signature" });
  // const session = getSession(address);
  const { dh, publicKey, privateKey, prime } = generateKeys();
  const sharedSecret = computeSharedSecret(userPublicKey, dh.getPrivateKey("hex"), dh.getPrime("hex"));
  console.log("sharedSecret: ", sharedSecret)
  // setSharedSecret(address, sharedSecret);
  const token = generateJWT({ address });
  console.log("token ", token)
  const encryptedToken = encryptWithSharedSecret(token, sharedSecret);
  console.log("encrypted token: ", encryptedToken)
  res.json({ encryptedToken, publicKey });
});

// const CONTRACT_PATH = path.resolve(__dirname, "../../build/contracts/AuthenticationRegistry.json");
// const artifact = JSON.parse(fs.readFileSync(CONTRACT_PATH));

// const latestNetworkId = Object.keys(artifact.networks).sort((a, b) => b - a)[0];
// const contractAddress = artifact.networks[latestNetworkId].address;
// const abi = artifact.abi;
// 

router.post('/is-nonce-expired', async (req, res) => {
  const { address } = req.body;

  try {
    // Query the smart contract to check if the nonce has expired
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const isExpired = await contract.isNonceExpired(address);

    res.json({ isExpired });
  } catch (err) {
    console.error('Error checking nonce expiration:', err);
    res.status(500).json({ error: 'Failed to check nonce expiration' });
  }
});


module.exports = router;