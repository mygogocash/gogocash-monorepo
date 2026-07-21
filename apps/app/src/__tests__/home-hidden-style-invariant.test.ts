import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createHomeScreenStyles } from "@mobile/screens/home/customerHomeStyles";
import { lightColors } from "@mobile/theme/colorPalettes";
import { getThemeSurfaces } from "@mobile/theme/themeSurfaces";

// #497 — the browse-shortcuts dock shipped inside `display: "none"` and every test stayed
// green, because the parity suites only grep the home source blob for "<BrowseShortcuts />".
// A source grep is true of dead code, so it cannot answer "does the user see this".
//
// Two guards below:
//   1. the specific regression — the dock must not be display:none;
//   2. the class of bug — any style that hides itself must SAY SO IN ITS NAME, so an
//      unconditionally-applied wrapper can never silently swallow its subtree again.
const styles = createHomeScreenStyles(lightColors, getThemeSurfaces(lightColors, "light"));

const HOME_STYLES_PATH = path.join(
  __dirname,
  "..",
  "screens",
  "home",
  "customerHomeStyles.ts",
);

/** Style keys that are legitimately hidden must be named for it. */
const HIDDEN_STYLE_KEY_PATTERN = /(Hidden|Collapsed)$/;

/** Every `foo: {` block in the styles file that contains a `display: "none"` declaration. */
function styleKeysDeclaringDisplayNone(source: string): string[] {
  const keys: string[] = [];
  const blockPattern = /^ {2}([A-Za-z0-9_]+): \{$/gm;
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(source)) !== null) {
    const blockStart = match.index;
    const blockEnd = source.indexOf("\n  },", blockStart);
    const block = source.slice(blockStart, blockEnd === -1 ? undefined : blockEnd);
    if (block.includes('display: "none"')) {
      keys.push(match[1]);
    }
  }
  return keys;
}

describe("home styles > hidden-style invariants (#497)", () => {
  it("browse shortcuts > given the mobile/tablet header dock > then it is not display:none", () => {
    // The dock at MobileTabletHomeHeader.tsx:101 is the ONLY wrapper BrowseShortcuts lives in,
    // and it is applied unconditionally — so display:none removes the whole subtree from layout.
    // Read through an index signature on purpose: once the property is gone, TypeScript narrows
    // it off the style object, so neither a direct read nor an all-optional annotation compiles.
    // This keeps the assertion valid in BOTH the fixed and the regressed state.
    const dock = styles.mobileTabletHeaderShortcutDock as Record<string, unknown>;

    expect(dock.display).not.toBe("none");
  });

  it("home styles > given any style that hides itself > then its key is named Hidden or Collapsed", () => {
    // Cheap, permanent guard for the whole bug class. Legitimate hidden styles are applied
    // CONDITIONALLY by their consumer and are named accordingly; an unconditional wrapper that
    // hides its children is always a bug, and this makes it impossible to add one unnamed.
    const source = fs.readFileSync(HOME_STYLES_PATH, "utf8");
    const offenders = styleKeysDeclaringDisplayNone(source).filter(
      (key) => !HIDDEN_STYLE_KEY_PATTERN.test(key),
    );

    expect(offenders).toEqual([]);
  });
});
