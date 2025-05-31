import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const [sensitiveData, setSensitiveData] = useState("");
  const [jwtRefreshToken, setJwtRefreshToken] = useState("");
  const [isDisconnected, setIsDisconnected] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate("/login"); // Redirect to login if token is not available
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!connected) {
      // If user is disconnected, navigate to login
      navigate("/login");
    }
  }, [connected, navigate]);

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

  async function handleSignNonce() {
    try {
      if (!connected) throw new Error("Please connect your wallet first.");
      console.log("Wallet is connected.");
  
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

        console.log("encrypted tokn: ", result.encryptedToken)
        // const sessionId = generateSessionId();
        document.cookie = `auth_token_${address}=${encodeURIComponent(JSON.stringify({
          token: result.encryptedToken,
          address: address,
          httpOnly: true,
        }))}; path=/; max-age=3600`;

        document.cookie = `refresh_token_${address}=${encodeURIComponent(JSON.stringify({
          token: result.encryptedRefreshToken,
        }))}; path=/; max-age=7200`;
  
        let { ciphertext, iv: ivHex, authTag } = result.encryptedToken;
        let iv = Buffer.from(ivHex, "hex");
        let key = Buffer.from(sharedSecret, "hex").slice(0, 32);
  
        let decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(Buffer.from(authTag, "hex"));
        let decryptedToken = decipher.update(ciphertext, "hex", "utf8");
        decryptedToken += decipher.final("utf8");
  
        console.log("sharedSecret: ", sharedSecret)
        console.log("Decrypted JWT:", decryptedToken);
        setToken(decryptedToken);

        let { ciphertext: refreshCipertext, iv: refreshIvHex, authTag: refreshAuthTag } = result.encryptedRefreshToken;
        let refreshIv = Buffer.from(refreshIvHex, "hex");
        let refreshKey = Buffer.from(sharedSecret, "hex").slice(0, 32);
  
       let refreshDecipher = crypto.createDecipheriv("aes-256-gcm", refreshKey, refreshIv);
       refreshDecipher.setAuthTag(Buffer.from(refreshAuthTag, "hex"));
        let decryptedRefreshToken = refreshDecipher.update(refreshCipertext, "hex", "utf8");
        decryptedRefreshToken += refreshDecipher.final("utf8");
  
        console.log("Decrypted Refresh:", decryptedRefreshToken);
        setJwtRefreshToken(decryptedRefreshToken);
      }
    } catch (err) {
      alert("Verification failed: " + err.message);
      console.error("Error in handleSignNonce:", err);
    }
  }
  

  function disconnectWallet() {
    document.cookie = `auth_token_${address}=; path=/; max-age=0; Secure; SameSite=Strict;`;
  document.cookie = `refresh_token_${address}=; path=/; max-age=0; Secure; SameSite=Strict;`;
    setConnected(false);
    setAddress("");
    setNonce("");
    setSignature("");
    setToken(""); // Clear the JWT
    setCustomText("");
    // setIsDisconnected(true);
    setStoredData("")
    alert("Your session has expired. Please log in again.");
    // navigate("/login"); // Redirect to login page
  }

  const [customText, setCustomText] = useState("");
  const [storedData, setStoredData] = useState(null);

  function setJwtInCookie(token) {
    // Set the JWT token in the client-side cookie
    document.cookie = `auth_token_${address}=${encodeURIComponent(token)}; path=/; max-age=3600; Secure; SameSite=Strict;`;
}

  const handleStoreData = async () => {
    try {
      if (!connected) {
        alert("Session expired. Please log in again.");
        return;  // Exit the function early if the user is disconnected
      }

      const response = await fetch('http://localhost:4000/store-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          "User-Address": address,
        },
        body: JSON.stringify({ customText }),
        credentials: 'include', // To send the cookie with the request
      });

      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.error('Error storing data:', error);
      alert("Error storing data");
    }
  };

  const handleFetchData = async () => {
    try {
      console.log("disconnected fetch: ", !connected)
      if (!connected) {
        // disconnectWallet();
        alert("Session expired. Please log in again.");
        return;  // Exit the function early if the user is disconnected
      }

      const response = await fetch('http://localhost:4000/fetch-data', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          "user-address": address,
        },
        credentials: 'include', // To send the cookie with the request
      });

      console.log("response ", response)

      console.log("status: ", response.status)

      if (response.status === 401) {
        const data = await response.json();
        console.log("dataaaa@@@@@: ", data)

        // if (data.isDisconnected) {
        //   console.log("set isDisconnected to true")
        //   // Set the isDisconnected flag to true and stop the function
        //   setIsDisconnected(true); // This will stop any further retries
        //   alert("Your session has expired. Please log in again.");
        //   return;
        // }
        
        console.log("Token expired, attempting refresh...");
        
        // After the refresh, try to fetch data again if the token is refreshed
        if (connected) {
          console.log("will go to refresh token from handle fetch")
          await refreshToken();
          // console.log("$$$$$$ ", refreshed)
          // console.log("connected is: ", connected)
          // if (!connected) {
          //   // disconnectWallet();
          //   return;
          // }
          // await handleFetchData();  // Retry fetching data if refresh succeeded
        }
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setStoredData(data.data); // Display the fetched data
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert("Error fetching data");
    }
  };

  async function refreshToken() {
    try {
      // console.log("disconnected: ", !connected)
      // if (!connected) return; // Prevent multiple calls if already refreshing or disconnected
      

      console.log("before call")
      const response = await fetch("http://localhost:4000/refresh", {
        method: "GET",
        headers: {
          // 'Content-Type': 'application/json',
          'user-address': address, // Send user address to identify the refresh token
        },
        credentials: 'include', // Include cookies with the request
      });

      console.log("after call")
  
      const data = await response.json();
      console.log("data: ", data)
      console.log("response ok:", response.ok)
      // if(data.isDisconnected){
      //   setIsDisconnected(true);
      //   // disconnectWallet();
      //   return;
      // }
      if (response.ok) {
        console.log("Token refreshed successfully:", data);

        let { ciphertext, iv: ivHex, authTag } = data.encryptedToken;
        let iv = Buffer.from(ivHex, "hex");
        let key = Buffer.from(sharedSecret, "hex").slice(0, 32);
  
        let decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(Buffer.from(authTag, "hex"));
        let decryptedToken = decipher.update(ciphertext, "hex", "utf8");
        decryptedToken += decipher.final("utf8");

        setToken(decryptedToken); // Set the new JWT
        setConnected(true);

        document.cookie = `auth_token_${address}=${encodeURIComponent(JSON.stringify({
          token: data.encryptedToken,
          address: address,
          httpOnly: true,
        }))}; path=/; max-age=3600`;
      } else {
        console.log("Failed to refresh token:", data);
        // disconnectWallet(); // If refresh fails, log out user
        // setConnected(false);
        console.log("reached here: ", connected)
        disconnectWallet();
      }

      console.log(token)
    } catch (error) {
      console.error("Error refreshing token:", error);
      // setConnected(false);
      disconnectWallet();
      // disconnectWallet();  // Log out user on error
    }
  }

  return (
    <div>
      <h1>Client Data Management</h1>
      {token && (
      <div>
      <h2>Store Custom Text</h2>
      <input
        type="text"
        value={customText}
        onChange={(e) => setCustomText(e.target.value)}
        placeholder="Enter your custom text"
      />
      <button onClick={handleStoreData}>Store Data</button>
    </div>
  )}

{/* <h2>Fetch Stored Data</h2> */}
{token && (<button onClick={handleFetchData}>Fetch Data</button>)}
      {storedData && <p>Stored Data: {storedData}</p>}

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
