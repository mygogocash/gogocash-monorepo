import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier";
import tanstackQuery from "@tanstack/eslint-plugin-query";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...tanstackQuery.configs["flat/recommended"],
  eslintConfigPrettier,
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "next-env.d.ts"]),
  {
    files: ["src/features/auth/component/link-mycashback/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next-intl",
              importNames: ["useTranslations"],
              message:
                "Do not use useTranslations/t() in link-mycashback — use useLocale + static messages JSON (avoids MISSING_MESSAGE with Turbopack).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/missing-orders/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next-intl",
              importNames: ["useTranslations"],
              message:
                "Do not use useTranslations/t() under features/missing-orders — use useLocale + missingOrdersStaticT (avoids MISSING_MESSAGE with Turbopack).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/missing-orders/components/MissingOrdersFormBody.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.type='Identifier'][callee.name='t']",
          message:
            "Do not call t() in MissingOrdersFormBody — use missingOrdersStaticT / mo() only (Turbopack drops next-intl flat keys).",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/clientDevLog.ts"],
    rules: {
      "no-console": "error",
    },
  },
]);

export default eslintConfig;
