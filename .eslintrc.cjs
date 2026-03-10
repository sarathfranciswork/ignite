/** @type {import("eslint").Linter.Config} */
const config = {
  extends: ["next/core-web-vitals", "next/typescript"],
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-explicit-any": "error",
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "coverage/",
    "playwright-report/",
    "test-results/",
    "_bmad/",
    "_bmad-output/",
    "docs/",
    "terraform/",
  ],
};

module.exports = config;
