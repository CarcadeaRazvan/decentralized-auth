module.exports = function (api) {
  api.cache(true);

  return {
    plugins: [["react-refresh/babel"]],
  };
};
