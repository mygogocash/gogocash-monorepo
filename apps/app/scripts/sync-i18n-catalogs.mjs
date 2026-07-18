// Sync the web app's next-intl ICU message catalogs into the shared
// @gogocash/i18n package so react-intl can reuse them (single source of truth
// lives in the web app; see issue #19 P4-2). Mobile ships en + th only (jp is
// web-only). The hand-edited mobile-overlay.* catalogs in apps/app/src/messages
// are deliberately NOT touched by this sync. Run: `npm run sync:i18n`.
//
// NOTE: srcDir points at the future apps/landing web source (not yet imported
// into the monorepo — see MONOREPO_MIGRATION_PLAN); until then this script has
// no source to copy from and exits with a clear error.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../.."); // apps/app/scripts -> repo root
const srcDir = resolve(repoRoot, "apps/landing/src/messages");
const destDir = resolve(repoRoot, "packages/i18n/messages");

const LOCALES = ["en", "th"];

if (!existsSync(srcDir)) {
  console.error(
    `[sync:i18n] web catalog source not found: ${srcDir}\n` +
      "[sync:i18n] the web app has not been imported as apps/landing yet — nothing to sync.",
  );
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
for (const locale of LOCALES) {
  const from = resolve(srcDir, `${locale}.json`);
  const to = resolve(destDir, `${locale}.json`);
  copyFileSync(from, to);
  console.log(`[sync:i18n] ${locale}.json -> packages/i18n/messages/${locale}.json`);
}
console.log(`[sync:i18n] done (${LOCALES.length} locales)`);
