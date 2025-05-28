const express = require("express");
const {
  decryptWithSharedSecret,
  encryptWithSharedSecret,
  getSharedSecret,
} = require("../utils/cryptoUtils");
const { getBalance, getNonce } = require("../utils/blockchainUtils");
const { verifyJWT } = require("../utils/jwtUtils");

const router = express.Router();

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyJWT(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

router.post("/balance", authenticateJWT, async (req, res) => {
  try {
    const payload = req.body.payload;
    const sharedSecret = getSharedSecret(req.user.address);
    if (!sharedSecret) {
      return res.status(403).json({ error: "No shared secret for user" });
    }
    const decryptedData = decryptWithSharedSecret(payload, sharedSecret);
    const { address, nonce } = JSON.parse(decryptedData);

    const storedNonce = await getNonce(address);

    if (address !== req.user.address || nonce != storedNonce) {
      return res.status(403).json({ error: "Auth mismatch" });
    }

    const balance = await getBalance(address);
    const encryptedData = encryptWithSharedSecret(
      JSON.stringify({ balance: balance }),
      sharedSecret
    );
    res.json(encryptedData);
  } catch (err) {
    console.error("Error details:", err);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

module.exports = router;
