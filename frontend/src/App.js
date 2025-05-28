import React, { useState } from "react";
import { connectWallet, signNonce, registerPublicKeyAndNonceOnChain } from "./blockchain";
import { ethers } from "ethers";
import crypto from "crypto-browserify";
const BN = require("bn.js");

function computeSharedSecret(otherPublicKeyHex, privateKeyHex, primeHex) {
  const prime = new BN(primeHex, 16);
  const reducedContext = BN.red(prime);

  const otherPublicKey = new BN(otherPublicKeyHex, 16).toRed(reducedContext);
  const privateKey = new BN(privateKeyHex, 16);

  const sharedSecret = otherPublicKey.redPow(privateKey).fromRed();
  return sharedSecret.toString(16).padStart(primeHex.length, "0");
}

function App() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState("");
  const [nonce, setNonce] = useState("");
  const [signature, setSignature] = useState("");
  const [token, setToken] = useState("");
  const [userPublicKey, setUserPublicKey] = useState("");
  const [backendPublicKey, setBackendPublicKey] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [dh, setDh] = useState(null);
  const [balance, setBalance] = useState("");

  // 1. Connect wallet and remember address
  async function handleConnectWallet() {
    try {
      const { address } = await connectWallet();
      setAddress(address);
      setConnected(true);
      console.log("Wallet connected:", address);
    } catch (err) {
      alert(err.message);
    }
  }

  let nonceTimestamp = Date.now();

async function requestNonce() {
  try {
    const response = await fetch("http://localhost:4000/nonce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address }),
    });

    const data = await response.json();
    nonceTimestamp = Date.now(); // Update timestamp when nonce is received
    setNonce(data.nonce);
    console.log("Nonce received:", data.nonce);

  } catch (err) {
    console.error("Error requesting nonce:", err);
  }
}

function isNonceExpired() {
  return Date.now() > nonceTimestamp + 60000; // Check if 1 minute has passed
}

  async function handleSignNonce() {
    try {
      if (!connected) throw new Error("Please connect your wallet first.");
      console.log("Wallet is connected.");
  
      // const response = await fetch("http://localhost:4000/nonce", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ address }),
      // });
      
      // console.log("Nonce request sent. Awaiting response...");
      
      // const data = await response.json();
      // console.log("Nonce received:", data);
      
  
      // Step 2: Check if the nonce is expired
      // const isExpired = await checkNonceExpiration(address);
      // console.log("Is nonce expired:", isExpired);
      // if (isExpired) {
      //   alert("The nonce has expired. Please request a new one.");
      //   return;
      // }
  
      // Step 3: Sign the nonce with the Ethereum private key
      const dh = crypto.getDiffieHellman("modp14");
      dh.generateKeys();
      const userPublicKey = dh.getPublicKey("hex");
      setUserPublicKey(userPublicKey);
      console.log("User's Diffie-Hellman Public Key:", userPublicKey);
  
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const signedNonce = await signNonce(signer, nonce);
      setSignature(signedNonce);
      console.log("Signed nonce:", signedNonce);
  
      // Step 4: Register the Ethereum public key and signed nonce on-chain
      console.log("Registering Ethereum public key and signed nonce on-chain...");
      await registerPublicKeyAndNonceOnChain(userPublicKey, signedNonce);
  
      console.log("before verify")

      const backendResponse = await fetch("http://localhost:4000/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          nonce,
          signature: signedNonce,
          userPublicKey,
        }),
      });
  
      const result = await backendResponse.json();
      console.log("Backend response:", result);
  
      if (result.encryptedToken) {
        const sharedSecret = computeSharedSecret(
          result.publicKey,
          dh.getPrivateKey("hex"),
          dh.getPrime("hex")
        );
        setSharedSecret(sharedSecret);
  
        const { ciphertext, iv: ivHex, authTag } = result.encryptedToken;
        const iv = Buffer.from(ivHex, "hex");
        const key = Buffer.from(sharedSecret, "hex").slice(0, 32);
  
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(Buffer.from(authTag, "hex"));
        let decryptedToken = decipher.update(ciphertext, "hex", "utf8");
        decryptedToken += decipher.final("utf8");
  
        console.log("sharedSecret: ", sharedSecret)
        console.log("Decrypted JWT:", decryptedToken);
        setToken(decryptedToken);
      }
    } catch (err) {
      alert("Verification failed: " + err.message);
      console.error("Error in handleSignNonce:", err);
    }
  }
  
  

  // 4. Fetch encrypted balance
  async function fetchBalance() {
    if (!token) return alert("Login required");

    try {
      const key = Buffer.from(sharedSecret, "hex").slice(0, 32);
      const iv = crypto.randomBytes(12);

      const payload = JSON.stringify({ address, nonce });
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      let encryptedBody = cipher.update(payload, "utf8", "hex");
      encryptedBody += cipher.final("hex");

      const requestBody = {
        ciphertext: encryptedBody,
        iv: iv.toString("hex"),
        authTag: cipher.getAuthTag().toString("hex"),
      };

      const response = await fetch("http://localhost:4000/balance", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: requestBody }),
      });

      const data = await response.json();
      const { ciphertext, iv: ivHex, authTag } = data;

      const decryptIv = Buffer.from(ivHex, "hex");
      const decryptKey = Buffer.from(sharedSecret, "hex").slice(0, 32);

      const decipher = crypto.createDecipheriv("aes-256-gcm", decryptKey, decryptIv);
      decipher.setAuthTag(Buffer.from(authTag, "hex"));

      let decryptedBody = decipher.update(ciphertext, "hex", "utf8");
      decryptedBody += decipher.final("utf8");

      const parsedBody = JSON.parse(decryptedBody);
      setBalance(parsedBody.balance);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  }

  function disconnectWallet() {
    setConnected(false);
    setAddress("");
    setNonce("");
    setSignature("");
    setToken("");
    setBalance("");
    alert("Wallet disconnected.");
  }

  return (
    <div>
      <button onClick={fetchBalance}>Fetch Balance</button>
      {balance && <p>Your Balance: {balance} ETH</p>}

      {connected ? (
        <div>
          <p>Connected Address: {address}</p>
          <button onClick={disconnectWallet}>Disconnect</button>
          <button onClick={requestNonce}>Request Login Nonce</button>
          {nonce && <button onClick={handleSignNonce}>Sign Nonce</button>}
          {token && <p>JWT: {token}</p>}
        </div>
      ) : (
        <button onClick={handleConnectWallet}>Connect Wallet</button>
      )}
    </div>
  );
}

export default App;
