const AuthenticationRegistry = artifacts.require("AuthenticationRegistry");

module.exports = function (deployer) {
  deployer.deploy(AuthenticationRegistry);
};
