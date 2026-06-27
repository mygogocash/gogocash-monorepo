// Generate a native-review checklist for the MACHINE-AUTHORED Thai in the mobile overlay.
// The overlay (mobile-overlay.{en,th}.json) holds every mobile-only string that has no web-catalog
// equivalent; its Thai was produced by AI during the i18n pass and needs a human Thai-speaker pass.
// Re-run after adding overlay strings:  node scripts/gen-i18n-review.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const msg = (f) => resolve(here, "../src/messages", f);
const en = JSON.parse(readFileSync(msg("mobile-overlay.en.json"), "utf8"));
const th = JSON.parse(readFileSync(msg("mobile-overlay.th.json"), "utf8"));

const rows = Object.keys(en).map((key) => ({ key, en: en[key], th: th[key] ?? "" }));
const esc = (s) =>
  String(s)
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");

const lines = [];
lines.push("# Mobile i18n — Thai review checklist");
lines.push("");
lines.push(
  "> **AUTO-GENERATED — do not hand-edit.** Run `npm run gen:i18n-review` to regenerate from the overlay."
);
lines.push("");
lines.push(
  `These ${rows.length} strings are **mobile-only** copy with no web-catalog equivalent. Their Thai was ` +
    "**machine-authored** during the Phase 3 i18n pass and needs a native-speaker review. To correct one, " +
    "edit its value in `src/messages/mobile-overlay.th.json` (match the key), then re-run the generator."
);
lines.push("");
lines.push("| ✔ | Key | English | Thai (machine-authored) |");
lines.push("| --- | --- | --- | --- |");
for (const r of rows) {
  lines.push(`| ☐ | \`${esc(r.key)}\` | ${esc(r.en)} | ${esc(r.th)} |`);
}
lines.push("");

const outPath = resolve(here, "../docs/i18n-thai-review.md");
writeFileSync(outPath, lines.join("\n") + "\n");
console.log(`[gen:i18n-review] wrote ${rows.length} rows -> docs/i18n-thai-review.md`);
