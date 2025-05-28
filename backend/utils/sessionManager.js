const sessions = new Map();

function createSession(address, dh) {
  sessions.set(address, { dh, createdAt: Date.now() });
}

function getSession(address) {
  return sessions.get(address);
}

function setSharedSecret(address, secret) {
  const session = getSession(address);
  if (session) session.sharedSecret = secret;
}

function getSharedSecret(address) {
  const session = getSession(address);
  return session?.sharedSecret;
}

module.exports = { createSession, getSession, setSharedSecret, getSharedSecret };