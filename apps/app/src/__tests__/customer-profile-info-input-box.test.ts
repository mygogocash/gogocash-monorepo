import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Personal Information inputs rendered "strange" (pinched/flared top corners) when focused.
// Root cause: inputBox/dropdownBox have borderRadius + a thin border but NO overflow:hidden, so the
// rounded corners rasterize with artifacts under the focus compositing layer; and the focus border
// was applied to the square inner <TextInput> (border-width 0 → invisible/broken) instead of the
// rounded wrapper. Fix: clip the field boxes to their radius and move focus to the rounded wrapper.

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const read = (rel: string): string => fs.readFileSync(path.join(mobileRoot, rel), "utf8");

function styleBlock(src: string, name: string): string {
  const start = src.indexOf(`${name}: {`);
  if (start < 0) return "";
  const end = src.indexOf("},", start);
  return end < 0 ? src.slice(start) : src.slice(start, end);
}

describe("Profile Personal Information — clean rounded input boxes", () => {
  const panel = read("src/components/ProfileInfoPanel.tsx");

  it("inputs > given a rounded field box > then it clips to its radius (overflow hidden, no corner artifact)", () => {
    expect(styleBlock(panel, "inputBox")).toContain('overflow: "hidden"');
    expect(styleBlock(panel, "dropdownBox")).toContain('overflow: "hidden"');
  });

  it("inputs > given focus > then the rounded wrapper highlights, not the square inner input", () => {
    // The focus affordance lives on the wrapper so the green border follows the rounded box.
    expect(styleBlock(panel, "inputBoxFocused")).toContain("colors.primary");
    expect(panel).toContain("styles.inputBoxFocused");
    // The broken border-on-the-square-input focus style must be gone.
    expect(panel).not.toContain("textInputFocused");
  });
});
