const jwt = require("jsonwebtoken");
require("dotenv").config();

function generateJWT(payload) {
  return jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "1h" });
}

function verifyJWT(token) {
  return jwt.verify(token, process.env.SECRET_KEY);
}

module.exports = {
  generateJWT,
  verifyJWT,
};
