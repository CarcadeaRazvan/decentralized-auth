const jwt = require("jsonwebtoken");
const { secretKey } = require("../config/constants");

function generateJWT(payload) {
  return jwt.sign(payload, secretKey, { expiresIn: "1h" });
}

function verifyJWT(token) {
  return jwt.verify(token, secretKey);
}

module.exports = {
  generateJWT,
  verifyJWT,
};
