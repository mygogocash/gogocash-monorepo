import babelParser from "@babel/eslint-parser";
import reactHooks from "eslint-plugin-react-hooks";

const nextDirectiveCompatibility = {
  meta: {
    name: "gogocash-next-directive-compatibility",
    version: "1.0.0",
  },
  rules: {
    "no-img-element": {
      meta: {
        docs: {
          description: "Resolve the existing disabled Next image rule",
        },
        schema: [],
        type: "problem",
      },
      create() {
        return {};
      },
    },
  },
};

/** @type {import("eslint").Linter.Config[]} */
const config = [
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/.open-next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.turbo/**",
      "**/out/**",
    ],
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}", "lint-fixtures/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        babelOptions: { presets: ["next/babel"] },
        ecmaVersion: "latest",
        requireConfigFile: false,
        sourceType: "module",
      },
    },
    plugins: {
      "@next/next": nextDirectiveCompatibility,
      "react-hooks": reactHooks,
    },
    rules: {
      "react-hooks/purity": "error",
      "react-hooks/refs": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/static-components": "error",
    },
  },
];

export default config;
