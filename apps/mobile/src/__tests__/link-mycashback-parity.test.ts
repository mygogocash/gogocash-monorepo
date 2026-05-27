import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

function expectStyleBlock(file: string, styleName: string, expected: string[]) {
  const blockMatch = file.match(new RegExp(`${styleName}: \\{[\\s\\S]*?\\n  \\}`));

  expect(blockMatch?.[0], `${styleName} style block`).toBeDefined();

  for (const snippet of expected) {
    expect(blockMatch?.[0]).toContain(snippet);
  }
}

describe("Link MyCashback parity", () => {
  it("link mycashback intro > given the selected Next reference > then Expo renders the same intro contract", () => {
    const designFile = readMobileFile("src/design/webDesignParity.ts");
    const screenFile = readMobileFile("src/screens/CustomerLinkCashbackScreen.tsx");

    expect(designFile).toContain("webLinkMyCashbackIntro");
    expect(designFile).toContain("Sign in");
    expect(designFile).toContain("Manage your activities in one centralized account");
    expect(designFile).toContain("Link MyCashback with GoGoCash");
    expect(designFile).toContain(
      "For MyCashBack users, you may link all of the accounts to your GoGoCash profile here to manage your balances and activities from one centralized location."
    );
    expect(designFile).toContain("Skip");
    expect(designFile).toContain("Link Account");
    expect(designFile).toContain('backgroundColor: "#DCEBFF"');
    expect(designFile).toContain("connectorDots");

    expect(screenFile).toContain("CustomerDesktopHeader");
    expect(screenFile).toContain("CustomerDesktopFooter");
    expect(screenFile).toContain("getDesktopShellHorizontalPadding");
    expect(screenFile).toContain("useWindowDimensions");
    expect(screenFile).toContain("webLinkMyCashbackIntro");
    expect(screenFile).toContain("link-mycashback-gogocash.png");
    expect(screenFile).toContain("link-mycashback-shop.png");
    expect(screenFile).toContain("logoMarkImage");
    expect(screenFile).toContain("linkHeroBand");
    expect(screenFile).toContain("connectorDots");
    expect(screenFile).toContain("introActions");
    expect(screenFile).toContain('href="/method/create"');
    expect(screenFile).toContain('href="/link-mycashback/my-cashback-sign-in"');
    expect(screenFile).not.toContain("TextInput");
    expect(screenFile).not.toContain("Cashback account");
  });

  it("link mycashback typography > given the Next reference text styles > then Expo uses the same family scale and weights", () => {
    const screenFile = readMobileFile("src/screens/CustomerLinkCashbackScreen.tsx");

    expectStyleBlock(screenFile, "title", [
      "fontFamily: typography.family",
      "fontSize: typography.pageTitle",
      "fontWeight: typography.pageTitleWeight",
      "lineHeight: typography.pageTitleLineHeight",
    ]);
    expectStyleBlock(screenFile, "subtitle", [
      "fontFamily: typography.family",
      "fontSize: typography.body",
      "fontWeight: typography.bodyWeight",
      "lineHeight: typography.bodyLineHeight",
    ]);
    expectStyleBlock(screenFile, "cardTitle", [
      "fontFamily: typography.family",
      "fontSize: 18",
      "fontWeight: typography.titleWeight",
      "lineHeight: 24",
    ]);
    expectStyleBlock(screenFile, "cardDescription", [
      "fontFamily: typography.family",
      "fontSize: typography.label",
      "fontWeight: typography.bodyWeight",
      "lineHeight: 22",
    ]);
    expectStyleBlock(screenFile, "skipActionText", [
      "fontFamily: typography.family",
      "fontSize: typography.action",
      "fontWeight: typography.actionWeight",
      "lineHeight: typography.actionLineHeight",
    ]);
    expectStyleBlock(screenFile, "linkActionText", [
      "fontFamily: typography.family",
      "fontSize: typography.action",
      "fontWeight: typography.actionWeight",
      "lineHeight: typography.actionLineHeight",
    ]);
  });
});
