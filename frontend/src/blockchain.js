export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed!");
  }

  try {
    // Request MetaMask to prompt the user to reconnect
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });

    // Fetch the connected accounts
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const address = accounts[0];

    console.log("Connected Address:", address);
    return { address };
  } catch (err) {
    console.error("Wallet connection error:", err);
    throw new Error("Failed to connect wallet");
  }
}

export async function signNonce(signer, nonce) {
  try {
    return await signer.signMessage(nonce);
  } catch (err) {
    console.error("Error signing nonce:", err);
    throw new Error("Failed to sign nonce");
  }
}
