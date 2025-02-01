import React, { useState } from "react";
import { connectWallet, signNonce } from "./blockchain";
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

  //step1: user registers pk on eth through service
  async function handleConnectWallet() {
    try {
      const { address } = await connectWallet();
      setAddress(address);
      setConnected(true);

      const response = await fetch("http://localhost:4000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, publicKey: address }),
      });
      const data = await response.json();

      if (data.success) {
        console.log("Public key registered successfully:", address);
      } else {
        alert("Error registering public key: " + data.error);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  //step3: user initiates login request
  async function requestNonce() {
    try {
      const response = await fetch("http://localhost:4000/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await response.json();
      setNonce(data.nonce);
      setBackendPublicKey(data.backendPublicKey);
      console.log("Received Nonce:", data.nonce);
      console.log("Received backend diffie-hellman PK:", data.backendPublicKey);
    } catch (err) {
      console.error("Error requesting nonce:", err);
    }
  }

  //step6: user generates its dh keypair and signs the nonce with eth pk
  //step7: sends back the address, the nonce, the signed nonce, and the dh pk
  //step10: user generates S, then decrypts the jwt with it
  async function handleSignNonce() {
    try {
      if (!connected) {
        throw new Error("Please connect your wallet first.");
      }

      const dh = crypto.getDiffieHellman("modp14");
      setDh(dh);
      dh.generateKeys();
      const userPublicKey = dh.getPublicKey("hex");
      setUserPublicKey(userPublicKey);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      console.log("Signing nonce:", nonce);
      const signedNonce = await signNonce(signer, nonce);
      console.log("Signed Nonce:", signedNonce);
      setSignature(signedNonce);

      const response = await fetch("http://localhost:4000/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address,
          nonce,
          signature: signedNonce,
          userPublicKey,
        }),
      });

      const data = await response.json();
      if (data.encryptedToken) {
        console.log("Received Encrypted JWT Token:", data.encryptedToken);

        const sharedSecret = computeSharedSecret(
          backendPublicKey,
          dh.getPrivateKey("hex"),
          dh.getPrime("hex")
        );
        setSharedSecret(sharedSecret);

        console.log("Shared Secret - Frontend:", sharedSecret);

        const key = Buffer.from(sharedSecret, "hex").slice(0, 32);
        const iv = Buffer.alloc(16, 0);

        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        let decryptedToken = decipher.update(
          data.encryptedToken,
          "hex",
          "utf8"
        );
        decryptedToken += decipher.final("utf8");

        console.log("Decrypted JWT Token:", decryptedToken);
        setToken(decryptedToken);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function fetchBalance() {
    if (!token) {
      alert("You need to log in first!");
      return;
    }

    try {
      const key = Buffer.from(sharedSecret, "hex").slice(0, 32);
      const iv = Buffer.alloc(16, 0);

      const payload = JSON.stringify({ address, nonce });
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      let encryptedBody = cipher.update(payload, "utf8", "hex");
      encryptedBody += cipher.final("hex");

      const response = await fetch("http://localhost:4000/balance", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: encryptedBody }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch balance");
      }

      const data = await response.json();

      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decryptedBody = decipher.update(data, "hex", "utf8");
      decryptedBody += decipher.final("utf8");
      const parsedBody = JSON.parse(decryptedBody);

      const { balance } = parsedBody;
      setBalance(balance);
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  }

  function disconnectWallet() {
    setConnected(false);
    setAddress("");
    setNonce("");
    setSignature("");
    setToken("");
    setBalance("");

    alert("Wallet disconnected. Please connect again.");
  }

  return (
    <div>
      <button onClick={fetchBalance}>Fetch Balance</button>
      {balance && <p>Your Balance: {balance} ETH</p>}

      {connected ? (
        <div>
          <p>Connected Address: {address}</p>
          <button onClick={disconnectWallet}>Disconnect Wallet</button>
          <button onClick={requestNonce}>Initiate login request</button>
          {nonce ? <p>Nonce: {nonce}</p> : null}
          {nonce ? (
            <button onClick={handleSignNonce}>
              Sign Nonce and request token
            </button>
          ) : null}
          {token ? <p>JWT Token: {token}</p> : null}
        </div>
      ) : (
        <button onClick={handleConnectWallet}>Connect Wallet</button>
      )}
    </div>
  );
}

export default App;
