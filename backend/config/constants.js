const path = require("path");
const fs = require("fs");
const { ethers } = require("ethers");

const CONTRACT_PATH = path.resolve(
  __dirname,
  "../../build/contracts/AuthenticationRegistry.json"
);
const artifact = JSON.parse(fs.readFileSync(CONTRACT_PATH));

const latestNetworkId = Object.keys(artifact.networks).sort((a, b) => b - a)[0];
const contractAddress = artifact.networks[latestNetworkId].address;
const abi = artifact.abi;
const provider = new ethers.providers.JsonRpcProvider("http://ganache:8545");

module.exports = {
  CONTRACT_PATH,
  artifact,
  contractAddress,
  abi,
  provider,
};
