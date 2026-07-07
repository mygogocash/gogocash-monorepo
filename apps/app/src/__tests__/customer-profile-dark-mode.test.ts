import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

const profileDarkModeFiles = [
  "src/screens/CustomerProfileScreen.tsx",
  "src/components/AccountPageShell.tsx",
  "src/components/CustomerProfileMenu.tsx",
  "src/screens/CustomerProfilePhoneScreen.tsx",
  "src/screens/CustomerProfileOffersScreen.tsx",
];

describe("customer profile section dark mode surfaces", () => {
  it.each(profileDarkModeFiles)(
    "%s does not keep unthemed light-only profile highlight surfaces",
    (relativePath) => {
      const source = readMobileFile(relativePath);

      expect(source, `${relativePath} still hardcodes invite/highlight blue`).not.toContain(
        'backgroundColor: "#DCEBFF"',
      );
      expect(source, `${relativePath} still hardcodes mint panel hex`).not.toMatch(
        /backgroundColor:\s*"#F3FBF8"/,
      );
    },
  );

  it("profile hub invite row > given dark theme > then adapts the referral card background via pickThemed", () => {
    const profileFile = readMobileFile("src/screens/CustomerProfileScreen.tsx");

    expect(profileFile).toContain("pickThemed(");
    expect(profileFile).toMatch(
      /inviteRow:[\s\S]*backgroundColor: pickThemed\(colors, "#DCEBFF"/,
    );
  });

  it("account shell profile surface > given dark theme > then uses themed border tokens", () => {
    const shellFile = readMobileFile("src/components/AccountPageShell.tsx");

    expect(shellFile).toMatch(/profileSurface:[\s\S]*borderColor: colors\.border/);
    expect(shellFile).not.toMatch(
      /profileSurface:[\s\S]*borderColor: webAccountPageSurface\.surfaceBorderColor/,
    );
  });

  it("profile menu divider > given dark theme > then uses colors.border", () => {
    const menuFile = readMobileFile("src/components/CustomerProfileMenu.tsx");

    expect(menuFile).toMatch(/divider:[\s\S]*backgroundColor: colors\.border/);
    expect(menuFile).not.toContain('backgroundColor: "#E4E4E4"');
  });
});
