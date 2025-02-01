// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AuthenticationRegistry {
    // mapping between user address and the public key
    mapping(address => string) public publicKeys;
    // mapping between user address and a random nonce
    mapping(address => string) public nonces;

    // events triggered when either a public key or a nonce is 
    // registered on the blockchain
    event PublicKeyRegistered(address indexed user, string publicKey);
    event NonceGenerated(address indexed user, string nonce);

    // functions used to store / retrieve data from the blockchain
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
