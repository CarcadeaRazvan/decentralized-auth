// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AuthenticationRegistry {
    mapping(address => string[]) public userNonces;
    mapping(address => uint256) public nonceTimestamps;

    event NonceRegistered(address indexed user, string signedNonce);
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

        emit NonceChecked(user, signedNonce, isDuplicate);

        if (isDuplicate) {
            revert("This nonce has already been used.");
        }

        userNonces[user].push(signedNonce);
        nonceTimestamps[user] = block.timestamp;

        emit NonceRegistered(user, signedNonce);
    }


    function getUserNoncesLength(address user) public view returns (uint256) {
        return userNonces[user].length;
    }

    function getSignedNonce(address user) public view returns (string memory) {
        if (userNonces[user].length == 0) {
            return "";
        }
        
        return userNonces[user][userNonces[user].length - 1];
    }
}
