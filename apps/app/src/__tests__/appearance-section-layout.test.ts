import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appearanceSource = fs.readFileSync(
  path.join(testDir, "../components/AppearanceSection.tsx"),
  "utf8",
);

describe("AppearanceSection layout", () => {
  it("uses a single-row segmented track with equal-width options", () => {
    expect(appearanceSource).toContain("segmentTrack");
    expect(appearanceSource).toMatch(/segmentTrack:[\s\S]*flexDirection: "row"/);
    expect(appearanceSource).not.toMatch(/segmentTrack:[\s\S]*flexWrap/);
    expect(appearanceSource).toMatch(/segment:[\s\S]*flex: 1/);
    expect(appearanceSource).toMatch(/segment:[\s\S]*flexBasis: 0/);
    expect(appearanceSource).not.toContain("flexWrap: \"wrap\"");
    expect(appearanceSource).not.toContain("minWidth: 100");
  });

  it("allows long labels to wrap inside each segment instead of breaking the row", () => {
    expect(appearanceSource).toContain("numberOfLines={2}");
  });
});
