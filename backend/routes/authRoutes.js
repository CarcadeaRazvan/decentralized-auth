const express = require("express");
const crypto = require("crypto");
const { getNonce, verifyMessage } = require("../utils/blockchainUtils");
const {
  computeSharedSecret,
  encryptWithSharedSecret,
  generateKeys,
  dh,
} = require("../utils/cryptoUtils");
const { createSession, getSession, setSharedSecret, getSharedSecret, sessionExists, deleteSession, storeRefreshToken, isRefreshTokenValid } = require("../utils/sessionManager");
const { generateJWT, generateRefreshToken, verifyJWT, verifyRefreshJWT } = require("../utils/jwtUtils");
const { abi, contractAddress, provider } = require('../config/constants')
require("dotenv").config();
const router = express.Router();



router.post("/nonce", async (req, res) => {
  try {
    const { address } = req.body;
    console.log("Received nonce request for address:", address);

    // Generate a random nonce
    const nonce = crypto.randomBytes(16).toString("hex");
    console.log("Generated nonce:", nonce);

    // // Store the nonce
    // await storeNonce(address, nonce);
    // console.log("Nonce stored successfully for address:", address);

    // // Generate DH keys
    // const { dh, publicKey } = generateKeys();
    // console.log("Generated Diffie-Hellman public key:", publicKey);

    // // Create the session
    // createSession(address, dh);
    // console.log("Session created for address:", address);

    // Send response with nonce and DH public key
    res.json({nonce});
  } catch (error) {
    console.error("Error in /nonce endpoint:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.post("/verify", async (req, res) => {
  const { address, nonce, signature, userPublicKey } = req.body;
  const storedNonce = await getNonce(address);
  console.log("stored nonce: ", storedNonce);
    console.log("signature: ", signature)
  if (storedNonce !== signature) {
    
    console.log("Invalid nonce")
    return res.status(400).json({ error: "Invalid nonce" });
  }
  const recoveredAddress = verifyMessage(nonce, signature);
  if (recoveredAddress.toLowerCase() !== address.toLowerCase()) return res.status(401).json({ error: "Invalid signature" });
  // const session = getSession(address);

  let session;
  if (!sessionExists(address)) {
    // No session exists for this address, create a new session
    const { dh, publicKey } = generateKeys();
    createSession(address, dh); // Create a session for this user
    session = getSession(address);
    console.log("New session created for address:", address);
  } else {
    // Retrieve the existing session
    session = getSession(address);
    console.log("Existing session found for address:", address);
  }

  const { dh, publicKey, privateKey, prime } = generateKeys();
  const sharedSecret = computeSharedSecret(userPublicKey, dh.getPrivateKey("hex"), dh.getPrime("hex"));
  console.log("sharedSecret: ", sharedSecret)
  setSharedSecret(address, sharedSecret);
  const token = generateJWT({ address });
  const refreshToken = generateRefreshToken({address});
  storeRefreshToken(address, refreshToken);
  console.log("token ", token)
  console.log("refreshToken: ", refreshToken)
  const encryptedToken = encryptWithSharedSecret(token, sharedSecret);
  const encryptedRefreshToken = encryptWithSharedSecret(refreshToken, sharedSecret);
  console.log("encrypted token: ", encryptedToken)
  // res.cookie('auth_token', encryptedToken, {
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
  //   sameSite: 'Strict', // Prevent CSRF
  //   maxAge: 3600000 // 1 hour (or any expiration time)
  // });  
  res.json({ encryptedToken, encryptedRefreshToken, publicKey });
});

router.get('/refresh', async (req, res) => {
  const address = req.headers['user-address'];  // Get address from headers
    if (!address) {
        return res.status(400).json({ error: "No address provided" });
    }

    const cookieName = `refresh_token_${address}`;
    const token = req.cookies[cookieName];

    console.log(">address: ", address)
    console.log(">token: ", token)

    if (!token) {
      console.log("returned status 401")
      return res.status(401).json({ error: 'Unauthorized - No token provided', isDisconnected: true });
  }

  try {
      // Generate a new token for the user
      const cookieData = JSON.parse(decodeURIComponent(token));

        const encryptedRefreshToken = cookieData.token;

        console.log("encrypted refresh: ", encryptedRefreshToken)
        
        const sharedSecret = getSharedSecret(address);
        console.log("shared secret: ", sharedSecret)
        const { ciphertext, iv: ivHex, authTag } = encryptedRefreshToken;

        console.log("Ciphertext: ", ciphertext);
        console.log("IV Hex: ", ivHex);
        console.log("AuthTag: ", authTag);

        const iv = Buffer.from(ivHex, "hex");
        const key = Buffer.from(sharedSecret, "hex").slice(0, 32);

        // Create decipher object for AES-256-GCM
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(Buffer.from(authTag, "hex"));

        // Decrypt the token
        let decryptedToken = decipher.update(ciphertext, "hex", "utf8");
        decryptedToken += decipher.final("utf8");

        // if (!decryptedToken || !decryptedToken.exp || decryptedToken.exp < Date.now() / 1000) {
        //   // If the token has expired or the decoding failed, return 403 (Forbidden)
        //   return res.status(403).json({ error: "Invalid or expired refresh token" });
        // }

        console.log("Decrypted Refresh Token: ", decryptedToken);

        console.log("fails here")

        const decoded = verifyRefreshJWT(decryptedToken);
        console.log("refresh decoded: ", decoded)

        if (!isRefreshTokenValid(decoded.address)) {
          return res.status(403).json({ error: "Invalid or expired refresh token" });
        }

      const newToken = generateJWT({ address });
      const encryptedToken = encryptWithSharedSecret(newToken, sharedSecret);

      console.log("newToken: ", newToken);
      console.log("encryptedNewtoken: ", encryptedToken)

      // Send back the new token (you can set this in the cookie or response body)
    //   res.cookie(`auth_token_${address}=${encodeURIComponent(JSON.stringify({
    //     token: encryptedToken,
    //     address: address,  // Include address to ensure consistency
    //     httpOnly: true,  // Ensure httpOnly flag
    // }))}; path=/;  max-age=3600`);
      res.json({ message: 'Token refreshed successfully', encryptedToken });
  } catch (err) {
      res.status(500).json({ error: 'Failed to refresh token', isDisconnected: true });
  }
});

router.post("/logout", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required to logout" });
  }

  try {
    const decoded = jwt.decode(refreshToken);
    const address = decoded.address;
    deleteRefreshToken(address); // Remove the refresh token from the in-memory store

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("Error logging out:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// const CONTRACT_PATH = path.resolve(__dirname, "../../build/contracts/AuthenticationRegistry.json");
// const artifact = JSON.parse(fs.readFileSync(CONTRACT_PATH));

// const latestNetworkId = Object.keys(artifact.networks).sort((a, b) => b - a)[0];
// const contractAddress = artifact.networks[latestNetworkId].address;
// const abi = artifact.abi;
// 

// router.post('/is-nonce-expired', async (req, res) => {
//   const { address } = req.body;

//   try {
//     // Query the smart contract to check if the nonce has expired
//     const contract = new ethers.Contract(contractAddress, abi, provider);
//     const isExpired = await contract.isNonceExpired(address);

//     res.json({ isExpired });
//   } catch (err) {
//     console.error('Error checking nonce expiration:', err);
//     res.status(500).json({ error: 'Failed to check nonce expiration' });
//   }
// });


module.exports = router;