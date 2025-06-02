import React, { useState, useEffect } from "react";
import {
  Tooltip,
  Box,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  connectWallet,
  signNonce,
  registerPublicKeyAndNonceOnChain,
} from "./blockchain";
import { ethers } from "ethers";
import crypto from "crypto-browserify";
import { Buffer } from "./buffer";

const BN = require("bn.js");

const steps = [
  "Connect Wallet",
  "Request login",
  "Sign Nonce and generate Diffie Hellman",
];

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
  const [connectedWallet, setConnectedWallet] = useState(false);
  const [address, setAddress] = useState("");
  const [nonce, setNonce] = useState("");
  const [signature, setSignature] = useState("");
  const [token, setToken] = useState("");
  const [userPublicKey, setUserPublicKey] = useState("");
  const [sharedSecret, setSharedSecret] = useState("");
  const [jwtRefreshToken, setJwtRefreshToken] = useState("");
  const [customText, setCustomText] = useState("");
  const [storedData, setStoredData] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!connected) {
      navigate("/login");
    } else {
      navigate("/home");
    }
  }, [connected, navigate]);

  useEffect(() => {
    if (connectedWallet && activeStep === 0) {
      setActiveStep(1);
    }
  }, [connectedWallet, activeStep]);

  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  async function disconnectWallet() {
    try {
      const response = await fetch("/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-address": address,
        },
        credentials: "include",
      });

      await response.json();
      document.cookie = `auth_token_${address}=; path=/; max-age=0; Secure; SameSite=Strict;`;
      document.cookie = `refresh_token_${address}=; path=/; max-age=0; Secure; SameSite=Strict;`;
      setConnected(false);
      setConnectedWallet(false);
      setAddress("");
      setNonce("");
      setSignature("");
      setToken("");
      setCustomText("");
      setStoredData("");
      setActiveStep(0);
      alert("Your session has been disconnected.");
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Typography
              variant="body1"
              sx={{
                marginBottom: 2,
                textAlign: "center",
                color: "text.primary",
                fontWeight: "bold",
              }}
            >
              Step 1: Connect your wallet
            </Typography>

            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Button onClick={handleConnectWallet}>Connect Wallet</Button>
            </Box>
          </Box>
        );
      case 1:
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Typography
              variant="body1"
              sx={{
                marginBottom: 2,
                textAlign: "center",
                color: "text.primary",
                fontWeight: "bold",
              }}
            >
              Step 2: Requesting a nonce for verification
            </Typography>

            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Button onClick={requestNonce}>Request Nonce</Button>
            </Box>
          </Box>
        );
      case 2:
        return (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
            }}
          >
            <Typography
              variant="body1"
              sx={{
                marginBottom: 2,
                textAlign: "center",
                color: "text.primary",
                fontWeight: "bold",
              }}
            >
              Step 3: Sign the nonce to authenticate
            </Typography>

            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Button onClick={handleSignNonce}>Sign Nonce</Button>
            </Box>
          </Box>
        );
      default:
        return null;
    }
  };

  async function handleConnectWallet() {
    try {
      const { address } = await connectWallet();
      setAddress(address);
      setConnectedWallet(true);
      console.log("Wallet connected:", address);
      handleNext();
    } catch (err) {
      alert(err.message);
    }
  }

  async function requestNonce() {
    try {
      const response = await fetch("/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();
      setNonce(data.nonce);
      console.log("Nonce received:", data.nonce);
      handleNext();
    } catch (err) {
      console.error("Error requesting nonce:", err);
    }
  }

  async function handleSignNonce() {
    try {
      if (!connectedWallet)
        throw new Error("Please connect your wallet first.");
      console.log("Wallet is connected.");

      const dh = crypto.getDiffieHellman("modp14");
      dh.generateKeys();
      const userPublicKey = dh.getPublicKey("hex");
      setUserPublicKey(userPublicKey);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const signedNonce = await signNonce(signer, nonce);
      setSignature(signedNonce);

      console.log(
        "Registering Ethereum public key and signed nonce on-chain..."
      );
      await registerPublicKeyAndNonceOnChain(userPublicKey, signedNonce);

      const backendResponse = await fetch("/verify", {
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

      if (result.encryptedToken) {
        const sharedSecret = computeSharedSecret(
          result.publicKey,
          dh.getPrivateKey("hex"),
          dh.getPrime("hex")
        );
        setSharedSecret(sharedSecret);

        document.cookie = `auth_token_${address}=${encodeURIComponent(
          JSON.stringify({
            token: result.encryptedToken,
            address: address,
            httpOnly: true,
          })
        )}; path=/; max-age=3600`;

        document.cookie = `refresh_token_${address}=${encodeURIComponent(
          JSON.stringify({
            token: result.encryptedRefreshToken,
          })
        )}; path=/; max-age=7200`;

        let { ciphertext, iv: ivHex, authTag } = result.encryptedToken;
        let iv = Buffer.from(ivHex, "hex");
        let key = Buffer.from(sharedSecret, "hex").slice(0, 32);

        let decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(Buffer.from(authTag, "hex"));
        let decryptedToken = decipher.update(ciphertext, "hex", "utf8");
        decryptedToken += decipher.final("utf8");

        setToken(decryptedToken);

        let {
          ciphertext: refreshCipertext,
          iv: refreshIvHex,
          authTag: refreshAuthTag,
        } = result.encryptedRefreshToken;
        let refreshIv = Buffer.from(refreshIvHex, "hex");
        let refreshKey = Buffer.from(sharedSecret, "hex").slice(0, 32);

        let refreshDecipher = crypto.createDecipheriv(
          "aes-256-gcm",
          refreshKey,
          refreshIv
        );
        refreshDecipher.setAuthTag(Buffer.from(refreshAuthTag, "hex"));
        let decryptedRefreshToken = refreshDecipher.update(
          refreshCipertext,
          "hex",
          "utf8"
        );
        decryptedRefreshToken += refreshDecipher.final("utf8");

        setJwtRefreshToken(decryptedRefreshToken);
        setConnected(true);
        handleNext();
      }
    } catch (err) {
      alert("Verification failed: " + err.message);
      console.error("Error in handleSignNonce:", err);
    }
  }

  const handleStoreData = async () => {
    try {
      if (!connected) {
        alert("Session expired. Please log in again.");
        return;
      }

      const response = await fetch("/store-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Address": address,
        },
        body: JSON.stringify({ customText }),
        credentials: "include",
      });

      if (response.status === 401) {
        const data = await response.json();

        console.log("Token expired, attempting refresh...");

        if (connected) {
          await refreshToken();
        }
        return;
      }

      const data = await response.json();
      alert(data.message);
    } catch (error) {
      console.error("Error storing data:", error);
      alert("Error storing data");
    }
  };

  const handleFetchData = async () => {
    try {
      if (!connected) {
        alert("You are not connected! Please log in again.");
        return;
      }

      const response = await fetch("/fetch-data", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "user-address": address,
        },
        credentials: "include",
      });

      if (response.status === 401) {
        const data = await response.json();

        console.log("Token expired, attempting refresh...");

        if (connected) {
          await refreshToken();
        }
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setStoredData(data.data);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Error fetching data");
    }
  };

  async function refreshToken() {
    try {
      const response = await fetch("/refresh", {
        method: "GET",
        headers: {
          "user-address": address,
        },
        credentials: "include",
      });

      const data = await response.json();
      if (response.ok) {
        console.log("Token refreshed successfully:", data);

        let { ciphertext, iv: ivHex, authTag } = data.encryptedToken;
        let iv = Buffer.from(ivHex, "hex");
        let key = Buffer.from(sharedSecret, "hex").slice(0, 32);

        let decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(Buffer.from(authTag, "hex"));
        let decryptedToken = decipher.update(ciphertext, "hex", "utf8");
        decryptedToken += decipher.final("utf8");

        setToken(decryptedToken);
        setConnected(true);

        document.cookie = `auth_token_${address}=${encodeURIComponent(
          JSON.stringify({
            token: data.encryptedToken,
            address: address,
            httpOnly: true,
          })
        )}; path=/; max-age=3600`;
      } else {
        console.log("Failed to refresh token:", data);
        await disconnectWallet();
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      await disconnectWallet();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        padding: "20px",
      }}
    >
      <Card
        sx={{
          width: "100%",
          maxWidth: 800,
          padding: 3,
          backgroundColor: "#333",
          boxShadow: 3,
          borderRadius: "10px",
        }}
      >
        <CardContent>
          <Typography variant="h4" align="center" sx={{ marginBottom: 4 }}>
            Decentralized Authentication Framework
          </Typography>
          {connected && (
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Button
                variant="contained"
                color="secondary"
                onClick={disconnectWallet}
                sx={{
                  marginBottom: 2,
                  padding: "8px 20px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  borderRadius: "20px",
                  boxShadow: 2,
                  "&:hover": {
                    backgroundColor: "#d32f2f",
                  },
                }}
              >
                Logout
              </Button>
            </Box>
          )}
          <Box sx={{ width: "100%" }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step key={label}>
                  <Tooltip
                    title={
                      index === 0
                        ? "In order to proceed with the login process, the user has to connect an active Ethereum account"
                        : index === 1
                        ? "The user has to request a nonce from the server in order to validate the ownership of the previously used wallet."
                        : "The user will generate a Diffie-Hellman key pair, sign the received nonce with its Eth private key, then submit the signed nonce on the blockchain and send back to the server its Diffie Hellman public key."
                    }
                    arrow
                    placement="bottom"
                    sx={{ fontSize: "1.6" }}
                  >
                    <StepLabel>{label}</StepLabel>
                  </Tooltip>
                </Step>
              ))}
            </Stepper>
          </Box>

          <Box sx={{ mt: 3, mb: 3 }}>{renderStepContent()}</Box>

          {connected && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Typography variant="h6" sx={{ marginBottom: 2 }}>
                Welcome, {address}
              </Typography>

              {token && (
                <Box sx={{ width: "100%", marginBottom: 2 }}>
                  <Typography variant="h6" sx={{ marginBottom: 1 }}>
                    Store Custom Text
                  </Typography>
                  <TextField
                    label="Enter your custom text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{ marginBottom: 2 }}
                  />
                  <Box
                    sx={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Button
                      color="secondary"
                      onClick={handleStoreData}
                      sx={{ marginBottom: 2 }}
                    >
                      Store Data
                    </Button>
                  </Box>
                </Box>
              )}

              {token && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleFetchData}
                >
                  Fetch Data
                </Button>
              )}

              {storedData && (
                <Typography variant="body1" sx={{ marginTop: 2 }}>
                  Stored Data: {storedData}
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
