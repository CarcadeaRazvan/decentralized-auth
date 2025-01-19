// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AuthenticationRegistry {
    mapping(address => string) public publicKeys;
    mapping(address => string) public nonces;

    event PublicKeyRegistered(address indexed user, string publicKey);
    event NonceGenerated(address indexed user, string nonce);

    function registerPublicKey(string memory publicKey) public {
        publicKeys[msg.sender] = publicKey;
        emit PublicKeyRegistered(msg.sender, publicKey);
    }

    function getPublicKey(address user) public view returns (string memory) {
        return publicKeys[user];
    }

    function storeNonce(address user, string memory nonce) public {
        require(bytes(publicKeys[user]).length != 0, "User not registered");
        nonces[user] = nonce;
        emit NonceGenerated(user, nonce);
    }

    function getNonce(address user) public view returns (string memory) {
        return nonces[user];
    }
}
