import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

describe("Remaining customer route parity", () => {
  it("route handoff > given deep-scan generic shells > then dedicated Expo screens own each Next.js flow", () => {
    const dedicatedRoutes = [
      {
        file: "app/age-verification.tsx",
        screen: "CustomerAgeVerificationScreen",
        oldScreen: "CustomerUtilityScreen",
      },
      {
        file: "app/membership.tsx",
        screen: "CustomerMembershipScreen",
        oldScreen: "CustomerUtilityScreen",
      },
      {
        file: "app/link-mycashback/my-cashback-sign-in.tsx",
        screen: "CustomerMyCashbackSignInScreen",
        oldScreen: "CustomerLinkCashbackScreen",
      },
      {
        file: "app/profile/offer.tsx",
        screen: "CustomerProfileOffersScreen",
        oldScreen: "CustomerProfileDetailScreen",
      },
      {
        file: "app/profile/cf-phone.tsx",
        screen: "CustomerProfilePhoneScreen",
        oldScreen: "CustomerProfileDetailScreen",
      },
      {
        file: "app/profile/verify-phone.tsx",
        screen: "CustomerProfilePhoneScreen",
        oldScreen: "CustomerProfileDetailScreen",
      },
    ] as const;

    for (const route of dedicatedRoutes) {
      const routeFile = readMobileFile(route.file);

      expect(routeFile).toContain(route.screen);
      expect(routeFile).not.toContain(route.oldScreen);
    }

    const ratingRoute = readMobileFile("app/profile/my-rating.tsx");

    expect(ratingRoute).toContain("Redirect");
    expect(ratingRoute).toContain('href="/credit-score"');
    expect(ratingRoute).not.toContain("CustomerProfileDetailScreen");
  });

  it("auth callback > given a Firebase callback > then Expo exchanges or persists the handoff and redirects safely", () => {
    const callbackScreen = readMobileFile("src/screens/CustomerAuthCallbackScreen.tsx");

    expect(callbackScreen).toContain("useLocalSearchParams");
    expect(callbackScreen).toContain("createExpoSecureSessionStore");
    expect(callbackScreen).toContain("createWebSessionStore");
    expect(callbackScreen).toContain("sanitizeCallbackPath");
    expect(callbackScreen).toContain("exchangeMobileAuthCode");
    expect(callbackScreen).toContain("createDevRawTokenSession");
    expect(callbackScreen).toContain("access_token");
    expect(callbackScreen).toContain('provider: "firebase"');
    expect(callbackScreen).toContain('auth_flow: "telegram"');
    expect(callbackScreen).toContain("router.replace(callbackUrl");
    expect(callbackScreen).not.toContain("GoGoCash is completing the secure session handoff.");
  });

  it("protected route loading > given session verification states > then Expo uses the shared Next typography tokens", () => {
    const guardFile = readMobileFile("src/auth/AuthRouteGuard.tsx");
    const stateFile = readMobileFile("src/components/CustomerRouteState.tsx");

    expect(guardFile).toContain("CustomerRouteState");
    expect(stateFile).toContain("ActivityIndicator");
    expect(guardFile).toContain("Checking session");
    expect(guardFile).toContain("Sign in required");
    expect(stateFile).toContain("fontWeight: typography.titleWeight");
    expect(stateFile).toContain("lineHeight: typography.titleLineHeight");
    expect(stateFile).toContain("fontWeight: typography.bodyWeight");
    expect(stateFile).toContain("lineHeight: typography.bodyLineHeight");
    expect(guardFile).not.toContain('fontWeight: "700"');
    expect(guardFile).not.toContain("lineHeight: 22");
  });

  it("auth callback loading > given Firebase session handoff states > then Expo uses the shared Next typography tokens", () => {
    const callbackScreen = readMobileFile("src/screens/CustomerAuthCallbackScreen.tsx");
    const stateFile = readMobileFile("src/components/CustomerRouteState.tsx");

    expect(callbackScreen).toContain("CustomerRouteState");
    expect(stateFile).toContain("ActivityIndicator");
    expect(callbackScreen).toContain("Signing you in");
    expect(callbackScreen).toContain("Signed in");
    expect(stateFile).toContain("fontWeight: typography.titleWeight");
    expect(stateFile).toContain("lineHeight: typography.titleLineHeight");
    expect(stateFile).toContain("fontWeight: typography.bodyWeight");
    expect(stateFile).toContain("lineHeight: typography.bodyLineHeight");
    expect(callbackScreen).not.toContain('fontWeight: "700"');
    expect(callbackScreen).not.toContain("lineHeight: 22");
  });

  it("mycashback sign-in > given the Next desktop reference > then Expo renders a dedicated selection screen", () => {
    const signInScreen = readMobileFile("src/screens/CustomerMyCashbackSignInScreen.tsx");

    expect(signInScreen).toContain("MyCashback sign-in screen (desktop reference)");
    expect(signInScreen).toContain("Select Your Preferred Link");
    expect(signInScreen).toContain("Link Selected Account");
    expect(signInScreen).toContain("Connected account");
    expect(signInScreen).toContain("CustomerDesktopHeader");
    expect(signInScreen).toContain("CustomerDesktopFooter");
  });

  it("age verification > given the PDPA Next flow > then Expo validates over-20 birth dates", () => {
    const ageScreen = readMobileFile("src/screens/CustomerAgeVerificationScreen.tsx");

    expect(ageScreen).toContain("pdpaAgeVerifyTitle");
    expect(ageScreen).toContain("pdpaAgeVerifyBody");
    expect(ageScreen).toContain("pdpaAgeVerifyUnder20");
    expect(ageScreen).toContain("pdpaAgeVerifyIncompleteCode");
    expect(ageScreen).toContain("isOver20");
    expect(ageScreen).toContain("TextInput");
  });

  it("subscription routes > given Stripe is disabled locally > then Expo shows the real disabled billing contract", () => {
    const subscriptionScreen = readMobileFile("src/screens/CustomerSubscriptionScreen.tsx");

    expect(subscriptionScreen).toContain("Stripe checkout is not enabled in this environment.");
    expect(subscriptionScreen).toContain("GoGoPass Annual");
    expect(subscriptionScreen).toContain("49 THB");
    expect(subscriptionScreen).toContain("490 THB");
    expect(subscriptionScreen).toContain("No active subscription");
    expect(subscriptionScreen).toContain("Manage Subscription");
    expect(subscriptionScreen).not.toContain("Ready");
  });

  it("profile detail routes > given offer and phone flows > then Expo keeps the Next data and OTP contracts visible", () => {
    const offerScreen = readMobileFile("src/screens/CustomerProfileOffersScreen.tsx");
    const phoneScreen = readMobileFile("src/screens/CustomerProfilePhoneScreen.tsx");

    expect(offerScreen).toContain("offer_id");
    expect(offerScreen).toContain("deeplink");
    expect(offerScreen).toContain("createdAt");
    expect(offerScreen).toContain("copyToClipboard");

    expect(phoneScreen).toContain("Change Your Phone Number");
    expect(phoneScreen).toContain("Verification Code");
    expect(phoneScreen).toContain("Invalid phone number");
    expect(phoneScreen).toContain("/profile/cf-phone");
    expect(phoneScreen).toContain("#00B14F");
  });

  it("rn web warnings > given account image screens > then resizeMode is passed as an Image prop", () => {
    const walletScreen = readMobileFile("src/screens/CustomerWalletScreen.tsx");
    const questScreen = readMobileFile("src/screens/CustomerQuestScreen.tsx");

    expect(walletScreen).not.toContain("resizeMode:");
    expect(questScreen).not.toContain("resizeMode:");
  });
});
