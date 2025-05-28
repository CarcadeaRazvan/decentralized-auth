// backend/routes/contractInfo.js
const express = require("express");
const router = express.Router();
const { abi, contractAddress, provider } = require('../config/constants')

router.get("/contract", (req, res) => {
  res.json({ contractAddress, abi});
});

module.exports = router;
