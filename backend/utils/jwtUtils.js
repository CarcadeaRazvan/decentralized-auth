const jwt = require("jsonwebtoken");
require("dotenv").config();

function generateJWT(payload) {
  return jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "30s" });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.SECRET_REFRESH_TOKEN, {
    expiresIn: "5m",
  });
}

function verifyJWT(token) {
  return jwt.verify(token, process.env.SECRET_KEY);
}

function verifyRefreshJWT(token) {
  return jwt.verify(token, process.env.SECRET_REFRESH_TOKEN);
}

module.exports = {
  generateJWT,
  generateRefreshToken,
  verifyJWT,
  verifyRefreshJWT,
};
