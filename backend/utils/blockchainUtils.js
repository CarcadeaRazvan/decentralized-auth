const { ethers } = require("ethers");
const { abi, contractAddress, provider } = require("../config/constants");

const contract = new ethers.Contract(contractAddress, abi, provider);

// Set the nonce expiration time (e.g., 10 minutes)
const NONCE_EXPIRATION_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

// Register the public key on-chain
// async function registerPublicKey(address, publicKey) {
//   const tx = await contract.registerPublicKey(publicKey);
//   await tx.wait();
// }

// Store the nonce on-chain with timestamp
// async function storeNonce(address, nonce) {
//   const tx = await contract.storeNonce(address, nonce);
//   await tx.wait();
//   console.log("Nonce stored:", tx.hash);
// }

// Get the public key of a user from the blockchain
async function getPublicKey(address) {
  return await contract.getPublicKey(address);
}

// Get the stored nonce of a user from the blockchain
async function getNonce(address) {
  return await contract.getSignedNonce(address);
}

// Retrieve the stored nonce timestamp for expiration check
async function getNonceTimestamp(address) {
  return await contract.nonceTimestamps(address);  // Assuming contract stores timestamp for nonce
}

// Check if the stored nonce has expired (based on timestamp)
async function isNonceExpired(address) {
  const nonceTimestamp = await getNonceTimestamp(address);
  const currentTime = Date.now();
  return currentTime > (nonceTimestamp + NONCE_EXPIRATION_TIME); // Expired if current time is greater than stored timestamp + expiration time
}

// Check if the stored nonce has been used (revoked)
async function isNonceUsed(address) {
  return await contract.nonceUsed(address);  // Assuming contract tracks nonce usage
}

// Mark a nonce as used (revoked) on-chain
async function markNonceAsUsed(address) {
  const tx = await contract.markNonceAsUsed(address);
  await tx.wait();
  console.log("Nonce marked as used:", tx.hash);
}

// Get the balance of an address
async function getBalance(address) {
  const balance = await wallet.provider.getBalance(address);
  return ethers.utils.formatEther(balance);
}

// Verify a message's signature using the Ethereum utilities
function verifyMessage(message, signedMessage) {
  return ethers.utils.verifyMessage(message, signedMessage);
}

module.exports = {
  getPublicKey,
  getNonce,
  getBalance,
  verifyMessage,
  getNonceTimestamp,
  isNonceExpired,
  isNonceUsed,
  markNonceAsUsed,
};
