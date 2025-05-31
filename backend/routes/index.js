const express = require("express");
const authRoutes = require("./authRoutes");
// const balanceRoutes = require("./balanceRoutes");
const contractRoutes = require("./contractRoutes");
const protectedRoutes = require("./protectedRoutes")

const router = express.Router();

router.use(authRoutes);
router.use(protectedRoutes);
router.use(contractRoutes);

module.exports = router;
