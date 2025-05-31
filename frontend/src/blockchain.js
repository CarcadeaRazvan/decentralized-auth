import { ethers } from "ethers";

let contract = null;

export async function loadContract() {
  if (contract) return contract;

  const res = await fetch("http://localhost:4000/contract");
  const { abi, contractAddress } = await res.json();

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = provider.getSigner();
  contract = new ethers.Contract(contractAddress, abi, signer);
  return contract;
}

export async function registerPublicKeyAndNonceOnChain(publicKey, signedNonce) {
  try {
    // Load the contract dynamically
    const contract = await loadContract();

    // contract.on('NonceRegistered', (user, nonce) => {
    //   console.log(`Nonce registered: User ${user} with nonce ${nonce}`);
    // });

    const address = await contract.signer.getAddress();

    console.log("Registering Public Key and Signed Nonce:");
    console.log("Public Key: ", publicKey);
    console.log("Address: ", address)
    console.log("Signed Nonce: ", signedNonce);

    // Check if the public key is already registered
    // const existingPublicKey = await contract.getPublicKey(address);
    // const existingNonce = await contract.getSignedNonce(address);
    // const nonceExpired = await contract.isNonceExpired(address);

    // if (existingNonce !== "" && !nonceExpired) {
    //   throw new Error("Signed nonce already registered for this address.");
    // }

    // const existingNonce = await contract.getSignedNonce(address); // Retrieve the latest nonce

    // if (existingNonce === signedNonce) {
    //   throw new Error("This nonce has already been used.");
    // }

    // Call the contract method to register the public key and signed nonce
    try {
      const tx = await contract.registerPublicKeyAndNonce(address, signedNonce, { gasLimit: 2000000 });
      console.log("Transaction Hash:", tx.hash);
    
      // Wait for the transaction to be mined
      const receipt = await tx.wait();  // Wait for the transaction confirmation
      console.log("Transaction confirmed, Receipt:", receipt);
    
      // After the transaction is confirmed, fetch the latest nonce to confirm the update
      const updatedNonce = await contract.getSignedNonce(address, { gasLimit: 2000000 });
      console.log("Updated nonce after transaction:", updatedNonce);
    
      console.log("Successfully registered signed nonce!");
    } catch (err) {
      console.error("Transaction failed:", err);
    
      // If the error has a revert reason, log it
      if (err.reason) {
        console.error("Revert reason:", err.reason);
      }
    
      alert("Error registering nonce on-chain: " + err.message);
    }
  } catch (err) {
    console.error("Error registering nonce on-chain:", err);
    alert(err.message); // Provide a user-friendly message
    throw new Error("Failed to register nonce on-chain");
  }
}


export async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask is not installed!");

  await window.ethereum.request({
    method: "wallet_requestPermissions",
    params: [{ eth_accounts: {} }],
  });

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  return { address: accounts[0] };
}

export async function signNonce(signer, nonce) {
  try {
    return await signer.signMessage(nonce);
  } catch (err) {
    console.error("Error signing nonce:", err);
    throw new Error("Failed to sign nonce");
  }
}
