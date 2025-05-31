import artifact from "../artifacts/AuthenticationRegistry.json";

const networkId = Object.keys(artifact.networks).sort((a, b) => b - a)[0];

export const CONTRACT_ABI = artifact.abi;
export const CONTRACT_ADDRESS = artifact.networks[networkId]?.address;
