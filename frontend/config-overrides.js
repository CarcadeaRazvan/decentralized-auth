const webpack = require("webpack");

module.exports = function override(config) {
  // Add '.mjs' to the extensions
  config.resolve.extensions = [...config.resolve.extensions, '.mjs'];

  // Fallback to polyfill Node.js modules in the browser
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve("crypto-browserify"),
    stream: require.resolve("stream-browserify"),
    vm: require.resolve("vm-browserify"),
    process: require.resolve("process/browser"),
    buffer: require.resolve("buffer/"),
  };

  // Provide global variables like Buffer and process for the browser
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],  // Ensure Buffer is available
      process: "process/browser",    // Ensure process is available
    }),
  ];

  config.module.rules = [
    ...config.module.rules,
    {
      test: /\.m?js/,
      resolve: {
        fullySpecified: false,  // This handles ESModules (fixes issues with strict modules)
      },
    },
  ];

  return config;
};
