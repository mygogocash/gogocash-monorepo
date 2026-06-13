// Sync the web app's next-intl ICU message catalogs into the mobile package so
// react-intl can reuse them (single source of truth lives in the web app).
// Mobile ships en + th only (jp is web-only). Run: `npm run sync:i18n`.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../.."); // apps/mobile/scripts -> repo root
const srcDir = resolve(repoRoot, "src/messages");
const destDir = resolve(here, "../src/messages");

const LOCALES = ["en", "th"];

mkdirSync(destDir, { recursive: true });
for (const locale of LOCALES) {
  const from = resolve(srcDir, `${locale}.json`);
  const to = resolve(destDir, `${locale}.json`);
  copyFileSync(from, to);
  console.log(`[sync:i18n] ${locale}.json -> src/messages/${locale}.json`);
}
console.log(`[sync:i18n] done (${LOCALES.length} locales)`);
