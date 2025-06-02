module.exports = {
  networks: {
    development: {
      host: "host.docker.internal",
      port: 8545,
      network_id: "*",
    },
  },
  compilers: {
    solc: {
      version: "0.8.0",
    },
  },
};
