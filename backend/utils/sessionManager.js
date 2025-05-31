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
  if (session) { session.sharedSecret = secret } else {
    throw new Error('Session does not exist');
  };
}

function getSharedSecret(address) {
  const session = getSession(address);
  return session?.sharedSecret;
}

function sessionExists(address) {
    return sessions.has(address);
  }
  
  // Function to delete a session
  function deleteSession(address) {
    sessions.delete(address);
  }

  function deleteExpiredSessions() {
    const currentTime = Date.now();
    sessions.forEach((session, address) => {
        if (currentTime - session.createdAt > 3600000) { // 1 hour expiration
        console.log(`Deleting expired session for address: ${address}`);
        sessions.delete(address); // Delete expired session
        }
    });
  }

  function generateSessionId() {
    // Generate a random 64-byte hex string and return it
    return crypto.randomBytes(64).toString("hex");
  }

  function storeRefreshToken(address, refreshToken) {
    const decoded = jwt.decode(refreshToken); // Decode to extract expiration or any other necessary info
    const expiryTime = decoded.exp * 1000; // Convert expiry to milliseconds
    refreshSessions.set(address, { refreshToken, expiryTime });
  }
  
  // Check if refresh token is valid (exists and not expired)
  function isRefreshTokenValid(address) {
    const session = refreshSessions.get(address);
    if (!session) return false;
  
    const currentTime = Date.now();
    return currentTime < session.expiryTime; // Token is valid if it's not expired
  }
  
  // Delete refresh token for a user
  function deleteRefreshToken(address) {
    refreshSessions.delete(address);
  }
  
  // Get the refresh token for a given address
  function getRefreshToken(address) {
    const session = refreshSessions.get(address);
    return session ? session.refreshToken : null;
  }
  
module.exports = { createSession, getSession, setSharedSecret, getSharedSecret, sessionExists, deleteSession, deleteExpiredSessions, generateSessionId,
    storeRefreshToken,
    isRefreshTokenValid,
    deleteRefreshToken,
    getRefreshToken
 };