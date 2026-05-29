import js from "@eslint/js";
import globals from "globals";

const sharedRules = {
  "no-template-curly-in-string": "error",
  "no-use-before-define": ["error", { functions: false }],
  "accessor-pairs": "error",
  "arrow-body-style": ["error", "as-needed"],
  camelcase: "error",
  curly: "error",
  eqeqeq: ["error", "always"],
  "no-alert": "error",
  "no-console": "error",
  "no-nested-ternary": "error",
  "no-return-assign": "error",
  "no-shadow": ["error", { hoist: "all" }],
  "no-unneeded-ternary": "error",
  "no-unused-expressions": "error",
  "no-useless-concat": "error",
  "no-useless-return": "error",
  "no-var": "error",
  "prefer-arrow-callback": "error",
  "prefer-const": "error",
  "prefer-template": "error",
  radix: "error",
};

export default [
  {
    ignores: ["node_modules/**", "client/vendor/**"],
  },
  js.configs.recommended,
  {
    files: ["server/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: sharedRules,
  },
  {
    files: ["server/load-test.js"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["client/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    rules: sharedRules,
  },
];
