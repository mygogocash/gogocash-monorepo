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
]);

export default eslintConfig;
