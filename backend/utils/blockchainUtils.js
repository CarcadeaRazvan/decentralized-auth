const { ethers } = require("ethers");
const { abi, contractAddress, provider } = require("../config/constants");

const contract = new ethers.Contract(contractAddress, abi, provider);

const NONCE_EXPIRATION_TIME = 10 * 60 * 1000;

async function getPublicKey(address) {
  return await contract.getPublicKey(address);
}

async function getNonce(address) {
  return await contract.getSignedNonce(address, { gasLimit: 500000 });
}

async function getNonceTimestamp(address) {
  return await contract.nonceTimestamps(address);
}

async function isNonceExpired(address) {
  const nonceTimestamp = await getNonceTimestamp(address);
  const currentTime = Date.now();
  return currentTime > nonceTimestamp + NONCE_EXPIRATION_TIME;
}

async function isNonceUsed(address) {
  return await contract.nonceUsed(address);
}

async function markNonceAsUsed(address) {
  const tx = await contract.markNonceAsUsed(address);
  await tx.wait();
  console.log("Nonce marked as used:", tx.hash);
}

async function getBalance(address) {
  const balance = await wallet.provider.getBalance(address);
  return ethers.utils.formatEther(balance);
}

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
