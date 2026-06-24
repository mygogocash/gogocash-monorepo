import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { translateCopy } from "@mobile/i18n/messages";
import { readHomeSources } from "../test-support/homeSource";

// Source-of-truth coverage for the parallel-wrapped wave-2 screens: extract every static string literal
// passed to tc("...") / tc('...') directly from each screen's source, and assert it resolves to Thai.
// Because the literals come from the REAL screen files (not a hand-maintained list), this catches both
// missed strings and any overlay `en` value that does not match the screen verbatim — the failure mode
// that would otherwise show English silently in Thai mode.
const screensDir = resolve(dirname(fileURLToPath(import.meta.url)), "../screens");
const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const WAVE2_SCREENS = [
  "CustomerProfileDetailScreen.tsx",
  "CustomerAccountSetupScreen.tsx",
  "CustomerQuestScreen.tsx",
  "CustomerMoneyActionScreen.tsx",
  "CustomerGoGoSenseScreen.tsx",
  "CustomerGoLinkScreen.tsx",
  "CustomerCategoryDetailScreen.tsx",
  // secondary-copy pass
  "CustomerHomeScreen.tsx",
  "CustomerDiscoveryScreen.tsx",
];

// Literals intentionally left in English: brand/product proper-nouns, tier names, and embedded-data
// tokens. These render identically in both locales (like "LINE"); see the i18n plan doc.
const ENGLISH_ALLOWLIST = new Set<string>([
  "ภาษาไทย", // already-Thai placeholder wrapped for consistency; tc() returns it unchanged
]);

function extractTcLiterals(source: string): string[] {
  const out = new Set<string>();
  // tc("...") and tc('...') — double/single quoted, allowing escaped quotes; skips tc(varName)/tc(`tmpl`).
  const re = /\btc\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    try {
      // m[1] is a JS string literal (double or single quoted) — JSON-normalize to its value.
      const raw = m[1];
      const value =
        raw[0] === "'"
          ? raw.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, "\\")
          : JSON.parse(raw);
      if (typeof value === "string" && value.trim().length > 0) out.add(value);
    } catch {
      // ignore unparseable matches
    }
  }
  return [...out];
}

describe("i18n wave-2 tc() literal coverage (source-of-truth)", () => {
  for (const file of WAVE2_SCREENS) {
    it(`every tc() literal in ${file} resolves to Thai`, () => {
      const source =
        file === "CustomerHomeScreen.tsx"
          ? readHomeSources(mobileRoot)
          : readFileSync(resolve(screensDir, file), "utf8");
      const literals = extractTcLiterals(source);
      // Note: prop/constant-wrapped screens (e.g. AccountSetup, GoGoSense) expose few/no inline tc("...")
      // literals — their copy is bare string props rendered via tc(prop). Those are covered by the
      // overlay-integrity test below + visual spot-checks; here we only assert the inline literals resolve.
      const untranslated = literals.filter(
        (s) => !ENGLISH_ALLOWLIST.has(s) && translateCopy(s, "th") === s
      );
      expect(untranslated).toEqual([]);
    });
  }
});

describe("i18n mobile-overlay integrity", () => {
  // Two overlay access patterns:
  //  - Reverse-lookup entries (the bulk): consumed via tc(), resolved by English value -> key. A web-
  //    catalog collision shadows them (translateCopy returns the web Thai), so they MUST reverse-resolve
  //    to their own Thai or they render English silently.
  //  - Keyed-ICU entries (A6 route/resource states): consumed via formatMessage({ id }), resolved straight
  //    into MESSAGES.th[key]. The reverse-index is irrelevant, so an English collision with the web catalog
  //    is harmless — they only need a real (non-empty) Thai value present under their key.
  const KEYED_BY_ID_PREFIXES = ["mobileState", "mobileResource"];

  it("every overlay entry resolves to its own Thai (reverse-lookup) or has Thai by id (keyed-ICU)", async () => {
    const overlayEn = (await import("@mobile/messages/mobile-overlay.en.json")).default as Record<
      string,
      string
    >;
    const overlayTh = (await import("@mobile/messages/mobile-overlay.th.json")).default as Record<
      string,
      string
    >;
    const shadowed: string[] = [];
    const missingThai: string[] = [];
    for (const [key, en] of Object.entries(overlayEn)) {
      const th = overlayTh[key];
      if (KEYED_BY_ID_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        // Keyed-ICU: accessed by id via formatMessage, not by English value. Require a real Thai string.
        if (typeof th !== "string" || th.length === 0) missingThai.push(key);
        continue;
      }
      // Reverse-lookup: the overlay only helps when its English value isn't already claimed by the web
      // catalog; if it is, translateCopy returns the web translation and this entry is dead weight.
      if (translateCopy(en, "th") !== th) shadowed.push(`${key}: ${JSON.stringify(en)}`);
    }
    expect(shadowed).toEqual([]);
    expect(missingThai).toEqual([]);
  });
});
