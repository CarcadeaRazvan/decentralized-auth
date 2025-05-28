const express = require("express");
const { authenticateJWT } = require("./middleware/authenticateJWT");
const { getSession } = require("../utils/sessionManager");
const { decryptWithSharedSecret } = require("../utils/cryptoUtils");
const { contract: accessContract } = require("../utils/accessRegistryContract"); // load AccessRegistry contract

const router = express.Router();

// Get encrypted message from chain for logged-in user
router.post("/get-message", authenticateJWT, async (req, res) => {
  const { address } = req.user;
  const session = getSession(address);
  if (!session) return res.status(403).json({ error: "No active session" });

  try {
    const encrypted = await accessContract.getEncryptedMessage(address);
    res.json({ ciphertext: encrypted });
  } catch (err) {
    console.error("Failed to fetch encrypted message:", err);
    res.status(500).json({ error: "Error reading from blockchain" });
  }
});

// Store new encrypted message to chain (E2EE)
router.post("/set-message", authenticateJWT, async (req, res) => {
  const { address } = req.user;
  const session = getSession(address);
  if (!session) return res.status(403).json({ error: "No active session" });

  const { ciphertext } = req.body;
  if (!ciphertext) return res.status(400).json({ error: "Missing ciphertext" });

  try {
    const tx = await accessContract.storeEncryptedMessage(ciphertext);
    await tx.wait();
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to write to blockchain:", err);
    res.status(500).json({ error: "Error writing to blockchain" });
  }
});

module.exports = router;
