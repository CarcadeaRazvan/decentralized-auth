// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AuthenticationRegistry {
    // Mapping to store public keys, signed nonces, and timestamps for each address
    // mapping(address => string) public publicKeys;
    mapping(address => string[]) public userNonces;
    mapping(address => uint256) public nonceTimestamps;

    // uint256 public constant NONCE_EXPIRATION_TIME = 1 minutes;

    // Event to log when a public key and nonce are registered
    event NonceRegistered(address indexed user, string signedNonce);

    // Register the Ethereum public key, signed nonce, and nonce timestamp
    event NonceChecked(address indexed user, string signedNonce, bool isDuplicate);

    function registerPublicKeyAndNonce(address user, string memory signedNonce) public {
        bool isDuplicate = false;
        require(bytes(signedNonce).length > 0, "Invalid nonce.");
        for (uint256 i = 0; i < userNonces[user].length; i++) {
            if (keccak256(bytes(userNonces[user][i])) == keccak256(bytes(signedNonce))) {
                isDuplicate = true;
                break;
            }
        }

        // Emit event to log the check
        emit NonceChecked(user, signedNonce, isDuplicate);

        if (isDuplicate) {
            revert("This nonce has already been used.");
        }

        // Register the new nonce and store the timestamp
        userNonces[user].push(signedNonce);
        nonceTimestamps[user] = block.timestamp;

        emit NonceRegistered(user, signedNonce);
    }


    function getUserNoncesLength(address user) public view returns (uint256) {
        return userNonces[user].length;
    }

    // function isNonceExpired(address user) public view returns (bool) {
    //     // Check if the nonce has expired (for example, 15 minutes expiration)
    //     return block.timestamp > nonceTimestamps[user] + nonceExpirationTime;
    // }

    // // Get the stored public key for a user
    // function getPublicKey(address user) public view returns (string memory) {
    //     return publicKeys[user];
    // }

    // Get the signed nonce for a user
    function getSignedNonce(address user) public view returns (string memory) {
        // Ensure that the user has at least one nonce in the list
        if (userNonces[user].length == 0) {
            return "";  // No nonce registered for this user
        }
        
        // Return the last nonce from the list
        return userNonces[user][userNonces[user].length - 1];
    }

    // Check if the nonce has expired for a given user
    // function isNonceExpired(address user) public view returns (bool) {
    //     return block.timestamp > (nonceTimestamps[user] + NONCE_EXPIRATION_TIME);
    // }
}
