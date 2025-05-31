const crypto = require("crypto");
const DiffieHellman = require("diffie-hellman");
const BN = require("bn.js");

function generateKeys() {
  const dh = DiffieHellman.getDiffieHellman("modp14");
  dh.generateKeys();
  return {
    dh,
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
  return otherPublicKey
    .redPow(privateKey)
    .fromRed()
    .toString(16)
    .padStart(primeHex.length, "0");
}

function encryptWithSharedSecret(data, sharedSecret) {
  const key = Buffer.from(sharedSecret, "hex").slice(0, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

function decryptWithSharedSecret(encryptedData, sharedSecret) {
  if (!encryptedData || !sharedSecret)
    throw new Error("Missing encrypted data or shared secret");
  const { ciphertext, iv, authTag } = encryptedData;
  const key = Buffer.from(sharedSecret, "hex").slice(0, 32);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = {
  generateKeys,
  computeSharedSecret,
  encryptWithSharedSecret,
  decryptWithSharedSecret,
};
