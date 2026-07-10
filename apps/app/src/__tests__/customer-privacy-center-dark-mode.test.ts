import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const privacyCenterFile = "src/screens/CustomerPrivacyCenterScreen.tsx";

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("customer privacy center dark mode surfaces", () => {
  it("consent preferences shell > given dark theme > then matches other account sub-pages", () => {
    const source = readMobileFile(privacyCenterFile);

    expect(source).toMatch(/surface:[\s\S]*backgroundColor: colors\.card/);
    expect(source).toMatch(/surface:[\s\S]*borderColor: colors\.border/);
    expect(source).toMatch(/privacyTintShell:[\s\S]*backgroundColor: "transparent"/);
    expect(source).toMatch(/topBar:[\s\S]*backgroundColor: colors\.card/);
    expect(source).not.toMatch(/privacyTintShell:[\s\S]*pickThemed\(colors, "#F3FCF9"/);
  });

  it("consent preferences cards > given dark theme > then use premium elevated panel surfaces", () => {
    const source = readMobileFile(privacyCenterFile);

    expect(source).not.toContain('backgroundColor: "rgba(243, 252, 249, 0.92)"');
    expect(source).not.toContain('backgroundColor: "rgba(243, 252, 249, 0.72)"');
    expect(source).toContain("premiumPanelCardStyle");
    expect(source).toMatch(/heroCard: premiumPanelCardStyle\(colors/);
    expect(source).toMatch(/optionalCard: premiumPanelCardStyle\(colors/);
    expect(source).toMatch(/requiredCard: premiumPanelCardStyle\(colors/);
  });

  it("consent preferences toggles > given dark theme > then use themed track and badge colors", () => {
    const source = readMobileFile(privacyCenterFile);

    expect(source).toMatch(/toggleTrack:[\s\S]*backgroundColor: colors\.border/);
    expect(source).not.toMatch(/toggleTrack:[\s\S]*backgroundColor: "#E4E4E4"/);
    expect(source).toMatch(/requiredBadge:[\s\S]*backgroundColor: pickThemed\(/);
    expect(source).toMatch(/acceptButtonDisabled:[\s\S]*backgroundColor: pickThemed\(/);
  });

  it("toggle thumbs > given dark theme > then stay white against the track (privacy + GoGoTrack)", () => {
    // Regression (user report 2026-07-10): the thumb used colors.field in dark
    // mode — a recessed dark surface — so the knob was invisible on the dark
    // off-track and read black on the mint on-track. A switch knob must
    // contrast with its TRACK, not recede into the card: it stays white in
    // both themes (matching the RN <Switch thumbColor={colors.white}> on the
    // account settings screen).
    for (const file of [privacyCenterFile, "src/gototrack/GoGoTrackPermissionGrantSection.tsx"]) {
      const source = readMobileFile(file);
      expect(source).toMatch(/toggleThumb:[\s\S]*?backgroundColor: colors\.white/);
      expect(source).not.toMatch(
        /toggleThumb:[\s\S]*?backgroundColor: pickThemed\(colors, colors\.white, colors\.field\)/,
      );
    }
  });

  it("consent preferences top bar > given dark theme > then uses themed divider border", () => {
    const source = readMobileFile(privacyCenterFile);

    expect(source).toMatch(/topBar:[\s\S]*borderBottomColor: colors\.border/);
    expect(source).not.toContain('borderBottomColor: "rgba(16, 53, 34, 0.12)"');
  });
});
