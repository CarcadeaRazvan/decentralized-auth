// backend/routes/contractInfo.js
const express = require("express");
const { getSharedSecret } = require("../utils/sessionManager");
const router = express.Router();
const crypto = require("crypto");
const {verifyJWT} = require("../utils/jwtUtils")
const { getSession } = require("../utils/sessionManager")

const clientData = new Map();

function authenticateJWT(req, res, next) {
    const address = req.headers['user-address'];  // Get address from headers
    if (!address) {
        return res.status(400).json({ error: "No address provided" });
    }

    const cookieName = `auth_token_${address}`;
    const token = req.cookies[cookieName];  // Retrieve the correct cookie by name

    // If there's no token, return an error
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
  
    try {
        const cookieData = JSON.parse(decodeURIComponent(token));

        const { token: encryptedToken, address } = cookieData;
        
        console.log("auth token: ", encryptedToken);
        console.log("address: ", address);

        const sharedSecret = getSharedSecret(address);
        const { ciphertext, iv: ivHex, authTag } = encryptedToken;
        const iv = Buffer.from(ivHex, "hex");
        const key = Buffer.from(sharedSecret, "hex").slice(0, 32);
    
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(Buffer.from(authTag, "hex"));
        let decryptedToken = decipher.update(ciphertext, "hex", "utf8");
        decryptedToken += decipher.final("utf8");

        console.log("decrypted auth: ", decryptedToken)

        const decoded = verifyJWT(decryptedToken);
        console.log("decoded auth: ", decoded)
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized - Token expired or invalid' });  // Send 401
   }
  }

  router.post("/store-data", authenticateJWT, (req, res) => {
    const { address } = req.user; // Address is retrieved from the JWT
    const { customText } = req.body;
  
    if (!customText) {
      return res.status(400).json({ message: "Text is required" });
    }
  
    // Store the custom text associated with the address
    clientData.set(address, customText);
  
    return res.status(200).json({ message: "Data saved successfully" });
  });

router.get("/fetch-data", authenticateJWT ,async (req, res) => {
    const { address } = req.user;
    const data = clientData.get(address);

  if (!data) {
    return res.status(404).json({ error: "No data found for this user" });
  }

  return res.status(200).json({ message: "Fetched data", data });
  });

module.exports = router;
