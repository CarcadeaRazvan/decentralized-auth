const AuthenticationRegistry = artifacts.require("AuthenticationRegistry");
const crypto = require("crypto");

contract("Service-to-Service Authentication", (accounts) => {
  let contractInstance;
  const serviceA = accounts[0];
  const serviceB = accounts[1];

  before(async () => {
    contractInstance = await AuthenticationRegistry.deployed();
  });

  it("should complete the full mutual authentication flow", async () => {
    // Step 1: Register both services' public keys
    const publicKeyA = serviceA;
    const publicKeyB = serviceB;

    await contractInstance.registerPublicKey(publicKeyA, { from: serviceA });
    await contractInstance.registerPublicKey(publicKeyB, { from: serviceB });

    const storedPublicKeyA = await contractInstance.getPublicKey(serviceA);
    const storedPublicKeyB = await contractInstance.getPublicKey(serviceB);

    assert.equal(
      storedPublicKeyA,
      publicKeyA,
      "Service A's public key should be registered"
    );
    assert.equal(
      storedPublicKeyB,
      publicKeyB,
      "Service B's public key should be registered"
    );

    // Step 2: Service A generates nonce and stores it
    const nonceA = crypto.randomBytes(16).toString("hex");
    await contractInstance.storeNonce(serviceA, nonceA, { from: serviceA });

    const storedNonceA = await contractInstance.getNonce(serviceA);
    assert.equal(storedNonceA, nonceA, "Service A's nonce should be stored");

    // Step 3: Service B verifies Service A's nonce
    const signatureA = await web3.eth.sign(nonceA, serviceA);
    const recoveredAddressA = await web3.eth.accounts.recover(
      nonceA,
      signatureA
    );
    assert.equal(
      recoveredAddressA,
      serviceA,
      "Service A's signature should be valid"
    );

    // Step 4: Service B generates nonce and stores it
    const nonceB = crypto.randomBytes(16).toString("hex");
    await contractInstance.storeNonce(serviceB, nonceB, { from: serviceB });

    const storedNonceB = await contractInstance.getNonce(serviceB);
    assert.equal(storedNonceB, nonceB, "Service B's nonce should be stored");

    // Step 5: Service A verifies Service B's nonce
    const signatureB = await web3.eth.sign(nonceB, serviceB);
    const recoveredAddressB = await web3.eth.accounts.recover(
      nonceB,
      signatureB
    );
    assert.equal(
      recoveredAddressB,
      serviceB,
      "Service B's signature should be valid"
    );

    // Step 6: Diffie-Hellman Key Exchange
    const p = crypto.createDiffieHellman(2048).getPrime("hex");
    const g = "2";

    // Service A generates keys
    const dhA = crypto.createDiffieHellman(p, "hex", g);
    dhA.generateKeys();
    const dhPublicKeyA = dhA.getPublicKey("hex");

    // Service B generates keys
    const dhB = crypto.createDiffieHellman(p, "hex", g);
    dhB.generateKeys();
    const dhPublicKeyB = dhB.getPublicKey("hex");

    // Compute shared secrets
    const sharedSecretA = dhA.computeSecret(dhPublicKeyB, "hex", "hex");
    const sharedSecretB = dhB.computeSecret(dhPublicKeyA, "hex", "hex");

    console.log("Service A DH Public Key:", dhPublicKeyA);
    console.log("Service B DH Public Key:", dhPublicKeyB);
    console.log("Service A Shared Secret:", sharedSecretA);
    console.log("Service B Shared Secret:", sharedSecretB);

    assert.equal(
      sharedSecretA,
      sharedSecretB,
      "Shared secrets should match between Service A and Service B"
    );

    // Step 7: Token Exchange
    const tokenA = crypto
      .createHmac("sha256", sharedSecretA)
      .update("Service A Token")
      .digest("hex");
    const tokenB = crypto
      .createHmac("sha256", sharedSecretB)
      .update("Service B Token")
      .digest("hex");

    console.log("Service A Token:", tokenA);
    console.log("Service B Token:", tokenB);

    assert.equal(
      crypto
        .createHmac("sha256", sharedSecretB)
        .update("Service A Token")
        .digest("hex"),
      tokenA,
      "Service B should validate Service A's token"
    );

    assert.equal(
      crypto
        .createHmac("sha256", sharedSecretA)
        .update("Service B Token")
        .digest("hex"),
      tokenB,
      "Service A should validate Service B's token"
    );
  });
});
