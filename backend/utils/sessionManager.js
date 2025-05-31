const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const sessions = new Map();
const refreshSessions = new Map();

function createSession(address, dh, sessionId) {
  sessions.set(address, { dh, createdAt: Date.now() });
}

function getSession(address) {
  return sessions.get(address);
}

function setSharedSecret(address, secret) {
  const session = getSession(address);
  if (session) {
    session.sharedSecret = secret;
  } else {
    throw new Error("Session does not exist");
  }
}

function getSharedSecret(address) {
  const session = getSession(address);
  return session?.sharedSecret;
}

function sessionExists(address) {
  return sessions.has(address);
}

function deleteSession(address) {
  sessions.delete(address);
}

function deleteExpiredSessions() {
  const currentTime = Date.now();
  sessions.forEach((session, address) => {
    if (currentTime - session.createdAt > 6000) {
      console.log(`Deleting expired session for address: ${address}`);
    }
  });
}

function generateSessionId() {
  return crypto.randomBytes(64).toString("hex");
}

function storeRefreshToken(address, refreshToken) {
  const decoded = jwt.decode(refreshToken);
  const expiryTime = decoded.exp * 1000;
  refreshSessions.set(address, { refreshToken, expiryTime });
}

function isRefreshTokenValid(address) {
  const session = refreshSessions.get(address);
  if (!session) return false;

  const currentTime = Date.now();
  return currentTime < session.expiryTime;
}

function deleteRefreshToken(address) {
  refreshSessions.delete(address);
}

function getRefreshToken(address) {
  const session = refreshSessions.get(address);
  return session ? session.refreshToken : null;
}

module.exports = {
  createSession,
  getSession,
  setSharedSecret,
  getSharedSecret,
  sessionExists,
  deleteSession,
  deleteExpiredSessions,
  generateSessionId,
  storeRefreshToken,
  isRefreshTokenValid,
  deleteRefreshToken,
  getRefreshToken,
};
