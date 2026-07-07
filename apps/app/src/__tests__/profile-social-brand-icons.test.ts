import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const iconSource = fs.readFileSync(
  path.join(testDir, "../components/ProfileSocialBrandIcons.tsx"),
  "utf8",
);

describe("ProfileSocialBrandIcon dark mode", () => {
  it("uses theme-aware fills for monochrome X and Apple marks", () => {
    expect(iconSource).toContain("useTheme");
    expect(iconSource).toContain("pickThemed");
    expect(iconSource).toContain("const xFill = pickThemed(colors, \"#000000\", colors.white)");
    expect(iconSource).toContain("const appleFill = pickThemed(colors, \"#3B3B3B\", colors.white)");
    expect(iconSource).toContain("fill={xFill}");
    expect(iconSource).toContain("fill={appleFill}");
    expect(iconSource).not.toContain('fill="#000000"');
    expect(iconSource).not.toContain('fill="#3B3B3B"');
  });
});
