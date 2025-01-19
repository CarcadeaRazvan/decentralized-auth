const express = require("express");
const authRoutes = require("./authRoutes");
const balanceRoutes = require("./balanceRoutes");

const router = express.Router();

router.use(authRoutes);
router.use(balanceRoutes);

module.exports = router;
