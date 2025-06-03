import crypto from "crypto-browserify";
import { Buffer } from "./buffer";

export function encryptWithSharedSecret(data, sharedSecret) {
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

export function decryptWithSharedSecret(encryptedData, sharedSecret) {
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
