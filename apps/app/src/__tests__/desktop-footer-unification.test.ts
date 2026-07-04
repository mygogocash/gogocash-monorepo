import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  getDesktopFooterHorizontalPadding,
  getDesktopShellOffset,
  webDesktopFooter,
} from "../design/webDesignParity";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("getDesktopFooterHorizontalPadding", () => {
  it("getDesktopFooterHorizontalPadding > given viewport width > then adds inner padding to shell offset", () => {
    const width = 1590;
    expect(getDesktopShellOffset(width)).toBe(75);
    expect(getDesktopFooterHorizontalPadding(width, 16)).toBe(91);
  });
});

describe("CustomerDesktopFooterSlot default breakout", () => {
  it("CustomerDesktopFooterSlot > given no horizontalPadding > then uses shell offset helper", () => {
    const slot = readMobileFile("src/components/CustomerDesktopFooterSlot.tsx");

    expect(slot).toContain("getDesktopFooterHorizontalPadding");
    expect(slot).toContain("horizontalPadding ?? getDesktopFooterHorizontalPadding");
    expect(slot).toContain("CustomerDesktopFooter");
  });
});

describe("webDesktopFooter contract", () => {
  it("webDesktopFooter > given the shared footer model > then includes all public sections and social links", () => {
    expect(webDesktopFooter.sections.map((section) => section.title)).toEqual([
      "Live on Platform",
      "Products",
      "Resources",
    ]);
    expect(webDesktopFooter.socialLinks.map((link) => link.label)).toEqual([
      "X",
      "Discord",
      "Telegram",
      "Line",
      "Threads",
      "LinkedIn",
      "GitHub",
      "YouTube",
    ]);
    expect(webDesktopFooter.cloudflare.label).toBe("Secured by");
    expect(webDesktopFooter.disclaimer.length).toBeGreaterThan(20);
  });
});

describe("desktop footer unification across screens", () => {
  it("self-chrome screens > given desktop footers > then none use horizontalPadding={0}", () => {
    const screens = [
      "src/screens/CustomerPrivacyPolicyScreen.tsx",
      "src/screens/CustomerLinkCashbackScreen.tsx",
      "src/screens/CustomerMyCashbackSignInScreen.tsx",
      "src/screens/CustomerAccountSetupScreen.tsx",
    ];

    for (const screenPath of screens) {
      const source = readMobileFile(screenPath);
      expect(source, screenPath).toContain("CustomerDesktopFooterSlot");
      expect(source, screenPath).not.toContain("horizontalPadding={0}");
    }
  });
});
