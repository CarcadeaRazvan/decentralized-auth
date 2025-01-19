const { ethers } = require("ethers");
const { abi, contractAddress, wallet } = require("../config/constants");

const contract = new ethers.Contract(contractAddress, abi, wallet);

async function registerPublicKey(address, publicKey) {
  const tx = await contract.registerPublicKey(publicKey, { from: address });
  await tx.wait();
}

async function storeNonce(address, nonce) {
  const tx = await contract.storeNonce(address, nonce, {
    gasLimit: 100000,
    gasPrice: ethers.utils.parseUnits("20", "gwei"),
  });
  console.log("Transaction Sent:", tx.hash);
  await tx.wait();
}

async function getPublicKey(address) {
  return await contract.getPublicKey(address);
}

async function getNonce(address) {
  return await contract.getNonce(address);
}

async function getBalance(address) {
  const balance = await wallet.provider.getBalance(address);
  return ethers.utils.formatEther(balance);
}

function verifyMessage(message, signedMessage) {
  return ethers.utils.verifyMessage(message, signedMessage);
}

module.exports = {
  registerPublicKey,
  storeNonce,
  getPublicKey,
  getNonce,
  getBalance,
  verifyMessage,
};
