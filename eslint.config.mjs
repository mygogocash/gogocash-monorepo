import eslintConfig from "eslint-config-next/core-web-vitals";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...eslintConfig,
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/.open-next/**",
      "**/.claude/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/out/**",
    ],
  },
  {
    rules: {
      // Stricter in eslint-plugin-react-hooks v7; codebase predates these patterns.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default config;
