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
  const { payload } = req.body;

  try {
    const decryptedData = decryptWithSharedSecret(payload, getSharedSecret());
    const { address, nonce } = JSON.parse(decryptedData);

    const storedNonce = await getNonce(address);
    console.log(storedNonce);

    if (address !== req.user.address || nonce != storedNonce) {
      return res.status(403).json({ error: "Auth mismatch" });
    }

    const balance = await getBalance(address);
    const encryptedData = encryptWithSharedSecret(
      JSON.stringify({ balance: balance }),
      getSharedSecret()
    );
    res.json(encryptedData);
    console.log(encryptedData);
  } catch (err) {
    console.error("Error details:", err);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

module.exports = router;
