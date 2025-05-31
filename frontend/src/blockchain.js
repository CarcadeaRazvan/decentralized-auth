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
    const contract = await loadContract();

    const address = await contract.signer.getAddress();
    try {
      const tx = await contract.registerPublicKeyAndNonce(
        address,
        signedNonce,
        { gasLimit: 2000000 }
      );
      await tx.wait();
      const updatedNonce = await contract.getSignedNonce(address, {
        gasLimit: 2000000,
      });

      console.log("Successfully registered signed nonce!");
    } catch (err) {
      console.error("Transaction failed:", err);

      if (err.reason) {
        console.error("Revert reason:", err.reason);
      }

      alert("Error registering nonce on-chain: " + err.message);
    }
  } catch (err) {
    console.error("Error registering nonce on-chain:", err);
    alert(err.message);
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
