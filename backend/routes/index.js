const express = require("express");
const authRoutes = require("./authRoutes");
const balanceRoutes = require("./balanceRoutes");
const contractRoutes = require("./contractRoutes");

const router = express.Router();

router.use(authRoutes);
router.use(balanceRoutes);
router.use(contractRoutes);

module.exports = router;
