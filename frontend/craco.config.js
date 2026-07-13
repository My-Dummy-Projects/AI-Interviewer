const path = require("path");

module.exports = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  devServer: (devServerConfig) => {
    // Migrate deprecated onBeforeSetupMiddleware / onAfterSetupMiddleware
    // (CRA 5 emits these) to setupMiddlewares (required by webpack-dev-server 5).
    const before = devServerConfig.onBeforeSetupMiddleware;
    const after = devServerConfig.onAfterSetupMiddleware;
    delete devServerConfig.onBeforeSetupMiddleware;
    delete devServerConfig.onAfterSetupMiddleware;
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      if (typeof before === "function") before(devServer);
      if (typeof after === "function") after(devServer);
      return middlewares;
    };
    // Migrate deprecated `https` option to `server` (webpack-dev-server 5)
    if (devServerConfig.https !== undefined) {
      const httpsVal = devServerConfig.https;
      delete devServerConfig.https;
      if (httpsVal === true) {
        devServerConfig.server = "https";
      } else if (httpsVal && typeof httpsVal === "object") {
        devServerConfig.server = { type: "https", options: httpsVal };
      } else {
        devServerConfig.server = "http";
      }
    }
    // Allow all hosts (preview / cloudflare tunnels)
    devServerConfig.allowedHosts = "all";
    return devServerConfig;
  },
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure: (webpackConfig) => {
      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/build/**',
          '**/dist/**',
          '**/coverage/**',
          '**/public/**',
        ],
      };
      return webpackConfig;
    },
  },
};
