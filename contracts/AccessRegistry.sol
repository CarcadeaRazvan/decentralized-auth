// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AccessRegistry {
    mapping(address => string) private userData;
    event DataUpdated(address indexed user, string data);

    function setUserData(string memory data) public {
        userData[msg.sender] = data;
        emit DataUpdated(msg.sender, data);
    }

    function getUserData(address user) public view returns (string memory) {
        return userData[user];
    }
}
