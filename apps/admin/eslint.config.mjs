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
      "e2e/**",
      "scripts/**",
      "**/*.config.js",
      "**/*.config.mjs",
      "eslint.config.mjs",
    ],
  },
  {
    settings: {
      // eslint-plugin-react still uses legacy context.getFilename() for version
      // auto-detection, which ESLint 10 removed — pin version to avoid the crash.
      react: {
        version: "19.2",
      },
    },
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
