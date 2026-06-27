import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as webDesignParity from "@mobile/design/webDesignParity";
import { readHomeSources } from "../test-support/homeSource";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

describe("GoGoLink feature parity", () => {
  it("golink parity > given Next web GoGoLink copy > then Expo keeps the same modal contract", () => {
    expect((webDesignParity as { webGoLinkFeature?: unknown }).webGoLinkFeature).toEqual({
      title: "GoGoLink – Easy to earn cashback by just copy, paste and shop!",
      inputPlaceholder: "Paste your product or shop link here",
      inputLabel: "Product or shop link",
      ctaLabel: "Paste and Go",
      emptyError: "Paste a product or shop link first.",
      invalidUrlError: "Please paste a valid product or shop link.",
      resultSuccess: "Link pasted successfully!",
      demoCashbackAmount: "5.80",
      demoCashbackPercent: "(2%)",
      shopNowLabel: "Shop Now",
    });
  });

  it("golink validation > given pasted URLs with optional scheme > then web-style merchant links pass", async () => {
    const goLinkFeature = await import("@mobile/features/golink").catch(() => null);

    expect(goLinkFeature).toBeTruthy();
    const { isValidGoLinkUrl } = goLinkFeature as {
      isValidGoLinkUrl: (value: string) => boolean;
    };

    expect(isValidGoLinkUrl("https://shopee.co.th/product/123")).toBe(true);
    expect(isValidGoLinkUrl("http://lazada.co.th/item/456")).toBe(true);
    expect(isValidGoLinkUrl("www.lazada.co.th/products/demo")).toBe(true);
    expect(isValidGoLinkUrl("lazada.co.th/products/demo")).toBe(true);
    expect(isValidGoLinkUrl("ftp://shopee.co.th/product/123")).toBe(false);
    expect(isValidGoLinkUrl("javascript:alert(1)")).toBe(false);
    expect(isValidGoLinkUrl("not a url")).toBe(false);
    expect(isValidGoLinkUrl("shopee")).toBe(false);
    expect(isValidGoLinkUrl("")).toBe(false);
  });

  it("golink result > given pasted merchant URL > then Expo can show a clean source host", async () => {
    const goLinkFeature = await import("@mobile/features/golink").catch(() => null);

    expect(goLinkFeature).toBeTruthy();
    const { getGoLinkSourceHost } = goLinkFeature as {
      getGoLinkSourceHost: (value: string) => string;
    };

    expect(getGoLinkSourceHost("https://www.shopee.co.th/product/123?utm_source=test")).toBe(
      "shopee.co.th"
    );
    expect(getGoLinkSourceHost("www.lazada.co.th/products/demo")).toBe("lazada.co.th");
    expect(getGoLinkSourceHost("lazada.co.th/products/demo")).toBe("lazada.co.th");
    expect(getGoLinkSourceHost("not a url")).toBe("");
  });

  it("golink screen > given route source > then it wires input validation and result state", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerGoLinkScreen.tsx"),
      "utf8"
    );

    expect(screenFile).toContain("TextInput");
    expect(screenFile).toContain("goLinkInput");
    expect(screenFile).toContain("goLinkResultOpen");
    expect(screenFile).toContain("handlePasteAndGo");
    expect(screenFile).toContain("GoLinkResultDialog");
    expect(screenFile).toContain("webGoLinkFeature");
    expect(screenFile).not.toContain("inputMock");
    expect(screenFile).not.toContain("Paste product link");
  });

  it("golink modal > given staging mobile bottom sheet > then Expo matches the sheet art spacing and hidden overflow contract", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerGoLinkScreen.tsx"),
      "utf8"
    );

    expect(screenFile).toContain("golinkBannerIllustrationImage");
    expect(screenFile).toContain("golink-banner-illustration.png");
    expect(screenFile).toContain("sheetChrome");
    expect(screenFile).toContain("sheetScroller");
    expect(screenFile).toContain("modalHeroCard");
    expect(screenFile).toContain("modalHeroBackdrop");
    expect(screenFile).toContain("modalIllustrationWrap");
    expect(screenFile).toContain("offscreenGuideCard");
    expect(screenFile).toContain("webGoLinkModalLayout");
    expect(screenFile).toContain("backgroundColor: colors.background");
    // Mint/blue hero tint keeps its light literal but adapts in dark via pickThemed.
    expect(screenFile).toContain('"#F8FBFF"');
    expect(screenFile).toContain('borderTopLeftRadius: 28');
    expect(screenFile).toContain("height: webGoLinkModalLayout.sheetMobileHeight");
    expect(screenFile).toContain("minHeight: webGoLinkModalLayout.sheetMobileHeight");
    expect(screenFile).toContain("height: webGoLinkModalLayout.illustrationMobileHeight");
    expect(screenFile).toContain("marginHorizontal: webGoLinkModalLayout.cardMarginHorizontal");
    expect(screenFile).toContain("paddingHorizontal: spacing.md");
    expect(screenFile).toContain('top: 9999');
  });

  it("golink home banner > given dark mode > then frosted pills and controls adapt via pickThemed", () => {
    const homeFile = readHomeSources(mobileRoot);

    expect(homeFile).toMatch(
      /desktopGoLinkStep:\s*\{[\s\S]*?backgroundColor: pickThemed\(colors, "rgba\(255, 255, 255, 0\.6\)", colors\.fieldMuted\)/,
    );
    expect(homeFile).toMatch(
      /desktopGoLinkStep:\s*\{[\s\S]*?borderColor: pickThemed\(colors, "rgba\(255, 255, 255, 0\.75\)", colors\.borderStrong\)/,
    );
    expect(homeFile).toMatch(
      /desktopGoLinkStepText:\s*\{[\s\S]*?color: pickThemed\(colors, "#0A5C4A", colors\.accent\)/,
    );
    expect(homeFile).toMatch(
      /desktopGoLinkStepArrow:\s*\{[\s\S]*?color: pickThemed\(colors, "rgba\(10, 92, 74, 0\.45\)", colors\.accentSoft\)/,
    );
    expect(homeFile).toContain(
      "pickThemed(colors, colors.primaryDark, colors.accent)",
    );
    expect(homeFile).toMatch(
      /desktopGoLinkEyebrow:\s*\{[\s\S]*?backgroundColor: pickThemed\(colors/,
    );
    const desktopGoLinkEyebrowTextBlock =
      homeFile.match(/desktopGoLinkEyebrowText:\s*\{[\s\S]*?\n  \},/)?.[0] ?? "";
    expect(desktopGoLinkEyebrowTextBlock).toContain("fontWeight: typography.bodyWeight");
    expect(desktopGoLinkEyebrowTextBlock).not.toContain('fontWeight: "700"');
    expect(homeFile).toMatch(
      /desktopGoLinkIllustrationWrap:\s*\{[\s\S]*?backgroundColor: pickThemed\(colors/,
    );
    expect(homeFile).toMatch(
      /desktopGoLinkInputShell:\s*\{[\s\S]*?backgroundColor: pickThemed\(colors/,
    );
    const desktopGoLinkInputBlock =
      homeFile.match(/desktopGoLinkInput:\s*\{[\s\S]*?\n  \},/)?.[0] ?? "";
    expect(desktopGoLinkInputBlock).toContain("fontWeight: typography.bodyWeight");
    expect(desktopGoLinkInputBlock).not.toContain("fontWeight: typography.labelWeight");
    const desktopGoLinkErrorBlock =
      homeFile.match(/desktopGoLinkError:\s*\{[\s\S]*?\n  \},/)?.[0] ?? "";
    expect(desktopGoLinkErrorBlock).toContain("fontWeight: typography.bodyWeight");
    expect(desktopGoLinkErrorBlock).not.toContain('fontWeight: "600"');
    expect(desktopGoLinkErrorBlock).not.toContain("marginTop: -14");
    const bannerFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/home/DesktopGoLinkBanner.tsx"),
      "utf8"
    );
    expect(homeFile).toContain("desktopGoLinkInputField");
    expect(bannerFile).toContain("styles.desktopGoLinkInputField");
    expect(bannerFile).toMatch(
      /desktopGoLinkInputField[\s\S]*?desktopGoLinkInputShell[\s\S]*?desktopGoLinkError[\s\S]*?desktopGoLinkAction/
    );
    expect(homeFile).toMatch(
      /mobileTabletGoLinkControls:\s*\{[\s\S]*?alignItems: "stretch"[\s\S]*?width: "100%"/
    );
    expect(homeFile).toContain('pickThemed(colors, "rgba(10, 92, 74, 0.55)"');
  });

  it("golink modal input > given paste field > then Expo uses normal body weight like the home banner", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerGoLinkScreen.tsx"),
      "utf8"
    );
    const inputBlock =
      screenFile.match(/input:\s*\{[\s\S]*?\n  \},/)?.[0] ?? "";

    expect(inputBlock).toContain("fontWeight: typography.bodyWeight");
    expect(inputBlock).toContain("fontFamily: typography.family");
    expect(inputBlock).not.toContain("fontWeight: typography.labelWeight");
    expect(inputBlock).not.toContain('fontWeight: "600"');
    const errorTextBlock =
      screenFile.match(/errorText:\s*\{[\s\S]*?\n  \},/)?.[0] ?? "";
    expect(errorTextBlock).toContain("fontWeight: typography.bodyWeight");
    expect(errorTextBlock).not.toContain('fontWeight: "600"');
  });

  it("golink home modal > given selected Next home sheet > then Expo keeps measured first viewport layout and close contract", () => {
    expect((webDesignParity as { webGoLinkModalLayout?: unknown }).webGoLinkModalLayout).toEqual({
      sheetMobileHeight: 464,
      toolbarHeight: 60,
      cardMarginHorizontal: 12,
      cardMobileMinHeight: 384,
      cardRadius: 24,
      illustrationMobileHeight: 160,
      inputHeight: 48,
      actionHeight: 48,
      inputActionGap: 12,
    });

    const homeFile = readHomeSources(mobileRoot);
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerGoLinkScreen.tsx"),
      "utf8"
    );

    expect(homeFile).toContain("goLinkSheetOpen");
    expect(homeFile).toContain("onGoLinkPress");
    expect(homeFile).toContain('presentation="homeSheet"');
    expect(screenFile).toContain("webGoLinkModalLayout");
    expect(screenFile).toContain("Close GoGoLink backdrop");
    expect(screenFile).toContain("presentation = \"route\"");
  });

  it("golink close motion > given sheet and nested dialogs are dismissed > then Expo runs exit animations before unmounting", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerGoLinkScreen.tsx"),
      "utf8"
    );

    expect(screenFile).toContain("useDismissableOverlayMotion");
    expect(screenFile).toContain("runExitAnimation");
    expect(screenFile).toContain("isClosing");
    expect(screenFile).toContain("motion.easing.in");
    expect(screenFile).toContain("toValue: 0");
    expect(screenFile).toContain("onPress={() => runExitAnimation()}");
    expect(screenFile).toContain('pointerEvents: isClosing ? "none" : "auto"');
    expect(screenFile).toContain("overlayHitArea");
    expect(screenFile).toContain("Animated.View");
  });

  it("golink guideline dialog > given Next web info modal > then Expo keeps the copy-paste flow and three-step layout contract", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerGoLinkScreen.tsx"),
      "utf8"
    );

    expect(screenFile).toContain("GoLinkGuidelineFlowIllustration");
    expect(screenFile).toContain("GoLinkGuidelineStepIllustration");
    expect(screenFile).not.toContain("golink-guideline-copy-paste-flow.png");
    expect(screenFile).not.toContain("golink-guideline-step-preview-1.png");
    expect(screenFile).toContain("guidelineOpen");
    expect(screenFile).toContain("GoLinkGuidelineDialog");
    expect(screenFile).toContain("Easy to earn cashback by GoGoLink");
    expect(screenFile).toContain("Follow these 3 steps to shop and earn with GoGoCash");
    expect(screenFile).toContain("Go to marketplace to look for the products you want");
    expect(screenFile).toContain("guidelineDialog");
    expect(screenFile).toContain("guidelineFlowWrap");
    expect(screenFile).toContain("guidelineStepThumb");
    expect(screenFile).toMatch(/guidelineSubtitle:\s*\{[\s\S]*?color: colors\.muted/);
    expect(screenFile).toContain("CloseIcon color={colors.ink}");
    expect(screenFile).toContain('backgroundColor: "rgba(0, 0, 0, 0.45)"');
    expect(screenFile).toContain('borderRadius: 24');
    expect(screenFile).toContain('maxWidth: 560');
    expect(screenFile).toContain('minHeight: 90');
    expect(screenFile).toContain('height: 96');
    expect(screenFile).toContain('paddingTop: 56');
    expect(screenFile).toContain('paddingHorizontal: 24');
  });

  it("golink result dialog > given valid pasted URL > then Expo matches Next product preview, cashback, terms, and shop handoff", () => {
    const screenFile = fs.readFileSync(
      path.join(mobileRoot, "src/screens/CustomerGoLinkScreen.tsx"),
      "utf8"
    );

    expect(screenFile).toContain("golinkResultProductImage");
    expect(screenFile).toContain("golink-result-product-demo.png");
    expect(screenFile).toContain("golinkResultShopBadgeImage");
    expect(screenFile).toContain("golink-result-shop-badge.png");
    expect(screenFile).toContain("GoLinkResultDialog");
    expect(screenFile).toContain("LA GLACE Pads");
    expect(screenFile).toContain("Earn cashback");
    expect(screenFile).toContain("5.80");
    expect(screenFile).toContain("Check exclusions and T&Cs");
    expect(screenFile).toContain("Link pasted successfully!");
    expect(screenFile).toContain("Shop Now");
    expect(screenFile).toContain("Terms and Exclusions");
    expect(screenFile).toContain("termsPanelOpen");
    expect(screenFile).toContain("resultDialog");
    expect(screenFile).toContain("resultProductImage");
    expect(screenFile).toContain('maxWidth: 640');
    expect(screenFile).toContain('borderRadius: 24');
    expect(screenFile).toContain('backgroundColor: "#052F5F"');
  });
});
