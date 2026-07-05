import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const ageVerificationFile = "src/screens/CustomerAgeVerificationScreen.tsx";

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("customer age verification dark mode surfaces", () => {
  it("shell > given dark theme > then matches other account sub-pages", () => {
    const source = readMobileFile(ageVerificationFile);

    expect(source).toMatch(/surface:[\s\S]*backgroundColor: colors\.card/);
    expect(source).toMatch(/surface:[\s\S]*borderColor: colors\.border/);
    expect(source).not.toMatch(/surface:[\s\S]*pickThemed\(colors, "#F3FCF9"/);
  });

  it("birth date field > given dark theme > then uses recessed field surface on card", () => {
    const source = readMobileFile(ageVerificationFile);

    expect(source).toMatch(
      /input:[\s\S]*backgroundColor: pickThemed\(colors, colors\.fieldMuted, colors\.field\)/,
    );
    expect(source).not.toMatch(/input:[\s\S]*backgroundColor: colors\.card/);
    expect(source).toMatch(/input:[\s\S]*borderColor: colors\.border/);
  });

  it("copy and actions > given dark theme > then use themed text and premium outline button", () => {
    const source = readMobileFile(ageVerificationFile);

    expect(source).toMatch(/title:[\s\S]*color: colors\.ink/);
    expect(source).toMatch(/body:[\s\S]*color: colors\.muted/);
    expect(source).toContain("premiumOutlineButtonStyle(colors)");
    expect(source).toMatch(/iconFrame:[\s\S]*backgroundColor: colors\.primary/);
  });
});
