import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const membershipFile = "src/screens/CustomerMembershipScreen.tsx";

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("customer membership dark mode surfaces", () => {
  it("billing section shell > given dark theme > then matches other account sub-pages", () => {
    const source = readMobileFile(membershipFile);

    expect(source).toMatch(/billingSection:[\s\S]*backgroundColor: colors\.card/);
    expect(source).toMatch(/billingSection:[\s\S]*borderColor: colors\.border/);
  });

  it("plan cards > given dark theme > then use themed surfaces instead of light-only mint fills", () => {
    const source = readMobileFile(membershipFile);

    expect(source).toMatch(
      /billingChoice:[\s\S]*backgroundColor: pickThemed\(colors, "#F7FAF8", colors\.fieldMuted\)/,
    );
    expect(source).toMatch(
      /billingChoiceActive:[\s\S]*backgroundColor: pickThemed\(colors, "#EAFBF6", colors\.primarySoft\)/,
    );
    expect(source).toMatch(/billingChoiceActive:[\s\S]*borderColor: colors\.primary/);
    expect(source).not.toMatch(/billingChoice:[\s\S]*backgroundColor: "#F7FAF8"/);
    expect(source).not.toMatch(/billingChoiceActive:[\s\S]*backgroundColor: "#EAFBF6"/);
  });

  it("plan copy > given dark theme > then use readable ink and muted tokens", () => {
    const source = readMobileFile(membershipFile);

    expect(source).toMatch(/billingLabel:[\s\S]*color: colors\.ink/);
    expect(source).toMatch(/billingHint:[\s\S]*color: colors\.muted/);
    expect(source).toMatch(/billingAmount:[\s\S]*color: colors\.primaryDark/);
    expect(source).toMatch(/bestValue:[\s\S]*backgroundColor: colors\.primary/);
    expect(source).toMatch(/bestValue:[\s\S]*color: colors\.white/);
  });

  it("checkout unavailable banner > given dark theme > then uses themed info surface and ink", () => {
    const source = readMobileFile(membershipFile);

    expect(source).toMatch(
      /disabledNotice:[\s\S]*backgroundColor: pickThemed\(colors, "#F3FBF8", colors\.fieldMuted\)/,
    );
    expect(source).toMatch(/disabledText:[\s\S]*color: pickThemed\(colors, colors\.accent, colors\.ink\)/);
    expect(source).not.toMatch(/disabledNotice:[\s\S]*backgroundColor: "#F3FBF8"/);
  });
});
