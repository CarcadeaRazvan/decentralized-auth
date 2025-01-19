const crypto = require("crypto");
const DiffieHellman = require("diffie-hellman");
const BN = require("bn.js");

const dh = DiffieHellman.getDiffieHellman("modp14");

let sharedSecret = "";

function setSharedSecret(secret) {
  sharedSecret = secret;
}

function getSharedSecret() {
  return sharedSecret;
}

function generateKeys() {
  dh.generateKeys();
  return {
    publicKey: dh.getPublicKey("hex"),
    privateKey: dh.getPrivateKey("hex"),
    prime: dh.getPrime("hex"),
  };
}

function computeSharedSecret(otherPublicKeyHex, privateKeyHex, primeHex) {
  const prime = new BN(primeHex, 16);
  const reducedContext = BN.red(prime);

  const otherPublicKey = new BN(otherPublicKeyHex, 16).toRed(reducedContext);
  const privateKey = new BN(privateKeyHex, 16);

  const sharedSecret = otherPublicKey.redPow(privateKey).fromRed();

  return sharedSecret.toString(16).padStart(primeHex.length, "0");
}

function encryptWithSharedSecret(data, sharedSecret) {
  const key = Buffer.from(sharedSecret, "hex").slice(0, 32);
  const iv = Buffer.alloc(16, 0);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");

  return encrypted;
}

function decryptWithSharedSecret(encryptedData, sharedSecret) {
  const key = Buffer.from(sharedSecret, "hex").slice(0, 32);
  const iv = Buffer.alloc(16, 0);

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

module.exports = {
  dh,
  generateKeys,
  computeSharedSecret,
  encryptWithSharedSecret,
  decryptWithSharedSecret,
  setSharedSecret,
  getSharedSecret,
};
