const webpack = require("webpack");
const path = require("path");
const HttpProxyAgent = require("http-proxy-agent");

module.exports = {
  webpack: {
    configure: (config) => {
      const isDevelopment = process.env.NODE_ENV === "development";

      config.resolve.extensions = [...config.resolve.extensions, ".mjs"];

      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        vm: require.resolve("vm-browserify"),
        process: require.resolve("process/browser"),
        buffer: require.resolve("buffer/"),
      };

      config.plugins = [
        ...config.plugins,
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser",
        }),
      ];

      config.module.rules = [
        ...config.module.rules,
        {
          test: /\.m?js/,
          resolve: {
            fullySpecified: false,
          },
        },
      ];

      config.resolve.modules = [config.resolve.modules[0], "node_modules"];

      enableImportsFromExternalPaths(config, [
        path.resolve(__dirname, "../frontend"),
      ]);

      return config;
    },
  },

  devServer: {
    proxy: {
      "/nonce": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        agent: new HttpProxyAgent("http://host.docker.internal:8080"),
      },
      "/verify": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        agent: new HttpProxyAgent("http://host.docker.internal:8080"),
      },
      "/store-data": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        agent: new HttpProxyAgent("http://host.docker.internal:8080"),
      },
      "/fetch-data": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        agent: new HttpProxyAgent("http://host.docker.internal:8080"),
      },
      "/logout": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        agent: new HttpProxyAgent("http://host.docker.internal:8080"),
      },
      "/refresh": {
        target: "http://localhost:4000",
        changeOrigin: true,
        secure: false,
        agent: new HttpProxyAgent("http://host.docker.internal:8080"),
      },
    },
  },
  historyApiFallback: true,
};

const findWebpackPlugin = (webpackConfig, pluginName) =>
  webpackConfig.resolve.plugins.find(
    ({ constructor }) => constructor && constructor.name === pluginName
  );

const enableTypescriptImportsFromExternalPaths = (
  webpackConfig,
  newIncludePaths
) => {
  const oneOfRule = webpackConfig.module.rules.find((rule) => rule.oneOf);
  if (oneOfRule) {
    const tsxRule = oneOfRule.oneOf.find(
      (rule) => rule.test && rule.test.toString().includes("tsx")
    );

    if (tsxRule) {
      tsxRule.include = Array.isArray(tsxRule.include)
        ? [...tsxRule.include, ...newIncludePaths]
        : [tsxRule.include, ...newIncludePaths];
    }
  }
};

const addPathsToModuleScopePlugin = (webpackConfig, paths) => {
  const moduleScopePlugin = findWebpackPlugin(
    webpackConfig,
    "ModuleScopePlugin"
  );
  if (!moduleScopePlugin) {
    throw new Error(`Expected to find plugin "ModuleScopePlugin", but didn't.`);
  }
  moduleScopePlugin.appSrcs = [...moduleScopePlugin.appSrcs, ...paths];
};

const enableImportsFromExternalPaths = (webpackConfig, paths) => {
  enableTypescriptImportsFromExternalPaths(webpackConfig, paths);
  addPathsToModuleScopePlugin(webpackConfig, paths);
};
