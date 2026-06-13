import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

// Collapse all whitespace runs so JSX-structure assertions are indentation-agnostic.
function normalizeSource(source: string) {
  return source.replace(/\s+/g, " ");
}

// Desktop quest layout parity (regression guard).
//
// On desktop the Tasks / How-to-win tabs render a TWO-COLUMN flex row: the active
// content column beside the leaderboard column. react-native-web gives a plain View
// `flex-shrink: 0` (RN semantics, unlike the web default of 1). So a row sibling that
// declares `width: "100%"` (leaderboardPanel) will NOT shrink, and a neighboring
// `flex: 1` child collapses to width 0 — which made "Let's Got the Tasks Done!" wrap
// one glyph per line (height ~672px, width 0).
//
// The fix: wrap BOTH row children in the symmetric `questColumn` (flex: 1, minWidth: 0)
// so the row splits evenly and `width: "100%"` resolves against a real column width.
// These assertions pin that structure so the collapse cannot silently return.
describe("Quest desktop two-column layout parity", () => {
  const questScreen = readMobileFile("src/screens/CustomerQuestScreen.tsx");
  const normalized = normalizeSource(questScreen);

  it("desktop quest row > given the active content column > then it is wrapped in the symmetric questColumn", () => {
    expect(normalized).toContain(
      '<View style={styles.questColumn}> <QuestTaskPanel />'
    );
  });

  it("desktop quest row > given the leaderboard sibling > then it is wrapped in questColumn (not a bare flex-shrink:0 panel)", () => {
    // This is the exact regression: the desktop leaderboard sibling must be wrapped so
    // it cannot starve the flex:1 content column to width 0.
    expect(normalized).toContain(
      '<View style={styles.questColumn}> <QuestLeaderboardPanel mediaColumnWidth={mediaColumnWidth} />'
    );
  });

  it("questColumn style > given a desktop split column > then it can both grow and shrink (flex:1 + minWidth:0)", () => {
    const block = questScreen.match(/questColumn:\s*\{([^}]*)\}/);
    expect(block, "questColumn style block should exist").not.toBeNull();
    const body = block?.[1] ?? "";
    expect(body).toContain("flex: 1");
    // minWidth: 0 lets the column shrink below its intrinsic content width instead of
    // forcing the sibling to collapse.
    expect(body).toContain("minWidth: 0");
  });
});
