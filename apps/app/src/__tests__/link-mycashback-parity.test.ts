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
    expect(designFile).toContain('backgroundColor: "#F6F6F6"');
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
    expect(screenFile).toContain(
      "pickThemed(colors, webLinkMyCashbackIntro.backgroundColor, colors.background)"
    );
    expect(screenFile).toContain('pickThemed(colors, "#4F6C78", colors.muted)');
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

  it("connector dots > given the shared animated component > then both intro screens use it and it loops with reduce-motion support", () => {
    const component = readMobileFile("src/components/LinkMyCashbackConnectorDots.tsx");
    // The dots animate (a looping, staggered pulse) and honor the reduce-motion preference.
    expect(component).toContain("useReducedMotion");
    expect(component).toContain("Animated.loop");
    expect(component).toContain("Animated.stagger");

    // Both intro surfaces render the shared component, not duplicated inline static dots.
    const linkScreen = readMobileFile("src/screens/CustomerLinkCashbackScreen.tsx");
    const signInScreen = readMobileFile("src/screens/CustomerMyCashbackSignInScreen.tsx");
    expect(linkScreen).toContain("<LinkMyCashbackConnectorDots");
    expect(signInScreen).toContain("<LinkMyCashbackConnectorDots");
    expect(linkScreen).not.toContain("styles.connectorDot");
    expect(signInScreen).not.toContain("styles.connectorDot");
  });
});
