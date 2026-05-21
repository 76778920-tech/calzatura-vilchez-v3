const js = require("@eslint/js");
const vitestGlobals = {
  describe: "readonly",
  expect: "readonly",
  it: "readonly",
  vi: "readonly",
};

module.exports = [
  {
    ignores: ["node_modules/**", "vitest.config.js"],
  },
  js.configs.recommended,
  {
    files: ["*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        AbortSignal: "readonly",
        console: "readonly",
        exports: "writable",
        fetch: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
        URL: "readonly",
      },
    },
    rules: {
      indent: ["error", 2],
      "object-curly-spacing": ["error", "always"],
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
    },
  },
  {
    files: ["__tests__/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...vitestGlobals,
        require: "readonly",
      },
    },
    rules: {
      indent: ["error", 2],
      "object-curly-spacing": ["error", "always"],
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
    },
  },
];
