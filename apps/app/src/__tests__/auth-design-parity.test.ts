import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { webAuthPage } from "@mobile/design/webDesignParity";

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

describe("Expo auth design parity", () => {
  it("auth desktop parity > given Next auth reference > then Expo keeps hero form social and OTP contract", () => {
    const authFile = readMobileFile("src/screens/CustomerAuthScreen.tsx");

    expect(webAuthPage).toMatchObject({
      heroAsset: "auth-login-hero",
      titleByMode: { login: "Sign in", register: "Sign up" },
      subtitle: "Get started earning cashback",
      defaultCountry: {
        code: "TH",
        dialCode: "+66",
        flag: "🇹🇭",
        label: "Thailand",
      },
      desktop: {
        cardHeight: 690,
        contentGap: 126,
        formCardWidth: 600,
        heroWidth: 588,
        maxWidth: 1440,
      },
    });
    expect(webAuthPage.socialProviders.map((provider) => provider.label)).toEqual([
      "Facebook",
      "Gmail",
      "Telegram",
      "Apple",
      "X",
      "Microsoft",
      "Connect Wallet",
    ]);
    expect(authFile).toContain("CustomerDesktopHeader");
    expect(authFile).toContain("CustomerCookieConsentBanner");
    expect(authFile).toContain("const authDesktopPageHorizontalPadding = 56;");
    expect(authFile).toContain("horizontalPadding={authDesktopPageHorizontalPadding}");
    expect(authFile).toContain("authHeroImage");
    expect(authFile).toContain("resolveAuthSocialProviders");
    expect(authFile).toContain("authSocialProviders.slice(0, 4)");
    expect(authFile).toContain("authSocialProviders.slice(4)");
    expect(authFile).toContain("PhoneOtpBoxes");
    expect(authFile).not.toContain('placeholder="Email"');
    expect(authFile).not.toContain('placeholder="Password"');
  });

  it("auth behavior contract > given phone privacy and OTP flow > then state labels and CTA rules are present", () => {
    const authFile = readMobileFile("src/screens/CustomerAuthScreen.tsx");

    expect(authFile).toContain("privacyAccepted && phoneDigits.length >= 9");
    expect(authFile).toContain('setAuthPhase("otp")');
    expect(authFile).toContain('setAuthPhase("phone")');
    expect(authFile).toContain('setOtpInput("")');
    expect(authFile).toContain("webAuthPage.privacyPolicyLabel");
    expect(authFile).toContain("webAuthPage.otp.changeNumber");
    expect(authFile).toContain("webAuthPage.otp.resend");
    expect(authFile).toContain("accessibilityLabel={provider.label}");
  });

  it("auth social icons > given Next CI brand assets > then Expo uses SVG marks instead of placeholder letters", () => {
    const authFile = readMobileFile("src/screens/CustomerAuthScreen.tsx");

    expect(authFile).toContain('from "react-native-svg"');
    expect(authFile).toContain("FacebookBrandIcon");
    expect(authFile).toContain("GoogleBrandIcon");
    expect(authFile).toContain("TelegramBrandIcon");
    expect(authFile).toContain("AppleBrandIcon");
    expect(authFile).toContain("XBrandIcon");
    expect(authFile).toContain("monochromeBrandFill");
    expect(authFile).toContain("MicrosoftBrandIcon");
    expect(authFile).toContain("WalletConnectBrandIcon");
    expect(authFile).toContain('fill="#1877F2"');
    expect(authFile).toContain('fill="#FBBB00"');
    expect(authFile).toContain('stopColor="#2AABEE"');
    expect(authFile).toContain('fill="#3B99FC"');
    expect(authFile).not.toContain('facebook: "f"');
    expect(authFile).not.toContain('google: "G"');
    expect(authFile).not.toContain('telegram: ">"');
    expect(authFile).not.toContain('apple: "A"');
    expect(authFile).not.toContain("providerIconText");
  });

  it("auth typography parity > given Next desktop login metrics > then Expo matches text scale weight and tracking", () => {
    const authFile = readMobileFile("src/screens/CustomerAuthScreen.tsx");
    const desktopBrandLinkFile = readMobileFile("src/components/CustomerDesktopBrandLink.tsx");

    expectStyleBlock(desktopBrandLinkFile, "logoText", [
      "fontSize: 20",
      'fontWeight: "700"',
      "letterSpacing: 0",
      "lineHeight: 28",
    ]);
    expectStyleBlock(authFile, "formTitle", [
      'color: "#00CC99"',
      "fontSize: 26",
      'fontWeight: "600"',
      "lineHeight: 32.5",
    ]);
    // Theme tokens (light value == the web hex): muted #7F7F7F, ink #3B3B3B.
    expectStyleBlock(authFile, "formSubtitle", [
      "color: colors.muted",
      "fontSize: 13",
      'fontWeight: "400"',
      "lineHeight: 17.875",
    ]);
    expectStyleBlock(authFile, "fieldLabel", [
      "color: colors.ink",
      'fontWeight: "500"',
      "lineHeight: 19.25",
    ]);
    expectStyleBlock(authFile, "countryText", ['fontWeight: "400"', "lineHeight: 23"]);
    expectStyleBlock(authFile, "primaryActionText", [
      "fontSize: 14",
      'fontWeight: "500"',
      "lineHeight: 20",
    ]);
    expectStyleBlock(authFile, "dividerText", [
      "color: colors.muted",
      "fontSize: 12",
      'fontWeight: "400"',
      "lineHeight: 16",
    ]);
    expectStyleBlock(authFile, "otpIntro", [
      'color: "#555555"',
      "fontSize: 14",
      'fontWeight: "400"',
      "lineHeight: 21",
    ]);
    expectStyleBlock(authFile, "changePhoneText", [
      "fontSize: 13",
      'fontWeight: "400"',
    ]);
    expectStyleBlock(authFile, "resendText", [
      "fontSize: 13",
      'fontWeight: "400"',
    ]);
    expectStyleBlock(authFile, "resendCountdown", [
      "fontSize: 13",
      'fontWeight: "400"',
    ]);
    expectStyleBlock(authFile, "socialLabel", [
      "color: colors.muted",
      "fontSize: 10",
      'fontWeight: "500"',
      "lineHeight: 12.5",
    ]);
    expectStyleBlock(authFile, "privacyLink", [
      'pickThemed(colors, "#3E3E3E", colors.link)',
      "fontSize: 13",
      'fontWeight: "600"',
    ]);
  });

  it("auth mobile cosmetic parity > given the Next mobile form > then Expo uses vertical fields and a two-column social grid", () => {
    const authFile = readMobileFile("src/screens/CustomerAuthScreen.tsx");

    expect(authFile).toContain("styles.pageAuthMobile");
    expect(authFile).toContain("styles.brandBlockMobile");
    expect(authFile).toContain("styles.cardInnerMobile");
    expect(authFile).toContain("styles.countryRowMobile");
    expect(authFile).toContain("styles.countrySelectMobile");
    expect(authFile).toContain("styles.formStackMobile");
    expect(authFile).toContain("styles.privacyWrapMobile");
    expect(authFile).toContain("styles.primaryActionMobile");
    expect(authFile).toContain("styles.socialBlockMobile");
    expect(authFile).toContain("styles.socialGridMobile");
    expect(authFile).toContain("styles.socialButtonMobile");
    expect(authFile).toContain("authSocialProviders.map");
    expect(authFile).toContain("usesMobileFormLayout ? dividerText.toUpperCase() : dividerText");
    expect(authFile).toContain("<CustomerCookieConsentBanner isDesktop={isDesktopShell} />");
    expectStyleBlock(authFile, "pageAuthMobile", ["paddingHorizontal: 24"]);
    expectStyleBlock(authFile, "cardInnerMobile", ["paddingHorizontal: 16", "paddingTop: 24"]);
    expectStyleBlock(authFile, "brandBlockMobile", ["gap: 8", "paddingBottom: 32"]);
    expectStyleBlock(authFile, "countryRowMobile", [
      'alignItems: "stretch"',
      'flexDirection: "column"',
    ]);
    expectStyleBlock(authFile, "countrySelectMobile", ['width: "100%"']);
    expectStyleBlock(authFile, "formStackMobile", ["gap: 20"]);
    expectStyleBlock(authFile, "privacyWrapMobile", ["height: 72"]);
    expectStyleBlock(authFile, "socialBlockMobile", ["marginTop: 24"]);
    expectStyleBlock(authFile, "socialGridMobile", [
      'flexWrap: "wrap"',
      'justifyContent: "space-between"',
    ]);
    expectStyleBlock(authFile, "socialButtonMobile", ["height: 72", 'width: "48%"']);
  });

  it("auth tablet parity > given the 768-1023 band > then Expo uses the centered tablet frame and desktop social rows", () => {
    const authFile = readMobileFile("src/screens/CustomerAuthScreen.tsx");

    expect(authFile).toContain("getDeviceClass");
    expect(authFile).toContain("getTabletContentFrame");
    expect(authFile).toContain("styles.tabletFrame");
    expect(authFile).toContain("styles.pageAuthTablet");
    expect(authFile).toContain("styles.cardInnerTablet");
    expect(authFile).toContain("styles.cardStackedTablet");
    expect(authFile).toContain("usesDesktopSocialLayout");
    expect(authFile).toContain("usesFullWidthPrimaryAction");
    expectStyleBlock(authFile, "tabletFrame", [
      "maxWidth: mobileShellLayout.tabletContentMaxWidth",
      'alignSelf: "center"',
    ]);
    expectStyleBlock(authFile, "pageAuthTablet", [
      "paddingHorizontal: mobileShellLayout.tabletContentHorizontalPadding",
    ]);
    expectStyleBlock(authFile, "cardInnerTablet", ["paddingHorizontal: 32", "paddingTop: 28"]);
  });
});
