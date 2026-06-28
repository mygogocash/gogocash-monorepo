import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { expoConversionRouteOwnership } from "@mobile/navigation/expoConversionMatrix";
import {
  getProtectedRouteIds,
  mobileParityRoutes,
  type MobileRouteId,
} from "@mobile/navigation/routes";
import { readDiscoverySources } from "../test-support/discoverySource";
import { readHomeSources } from "../test-support/homeSource";

type FrontendFlowContract = {
  appFile: string;
  expectedLinks?: string[];
  landmarks: string[];
  routeId: MobileRouteId;
  routeMarkers: string[];
  screenFiles: string[];
  userFlow: string;
};

const testDir = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(testDir, "../..");
const repoRoot = path.resolve(mobileRoot, "../..");

const frontendFlowContracts: FrontendFlowContract[] = [
  {
    appFile: "app/(tabs)/index.tsx",
    landmarks: ["webHomeSearchPlaceholder", "webGoLinkFeature", "CookieConsentBanner"],
    routeId: "home",
    routeMarkers: ["CustomerHomeScreen"],
    screenFiles: ["src/screens/CustomerHomeScreen.tsx"],
    userFlow:
      "Customer lands on Home, searches offers, opens GoGoLink, and reaches bottom navigation.",
  },
  {
    appFile: "app/(tabs)/discover.tsx",
    landmarks: ["CustomerProductDiscoveryScreen", "webProductDiscovery", "ProductDiscoveryMobileFilters"],
    routeId: "discover",
    routeMarkers: ["CustomerDiscoveryScreen", 'routeId="discover"'],
    screenFiles: ["src/screens/CustomerDiscoveryScreen.tsx"],
    userFlow: "Customer browses product discovery filters, cards, pagination, and details.",
  },
  {
    appFile: "app/brand.tsx",
    landmarks: ["CustomerBrandDirectoryScreen", "webBrandDirectory", "BrandDirectoryCategoryAside"],
    routeId: "brand",
    routeMarkers: ["CustomerDiscoveryScreen", 'routeId="brand"'],
    screenFiles: ["src/screens/CustomerDiscoveryScreen.tsx"],
    userFlow: "Customer browses the brand directory, searches, filters, sorts, and opens stores.",
  },
  {
    appFile: "app/category/index.tsx",
    landmarks: ["CustomerCategoryDirectoryScreen", "webCategoryDirectory", "resolveCategoryDirectoryCards"],
    routeId: "category",
    routeMarkers: ["CustomerDiscoveryScreen", 'routeId="category"'],
    screenFiles: ["src/screens/CustomerDiscoveryScreen.tsx"],
    userFlow: "Customer browses category cards and drills into a category detail route.",
  },
  {
    appFile: "app/category/[name].tsx",
    expectedLinks: ["encodeURIComponent(category)", '@mobile/components/BrandCard"'],
    landmarks: [
      "Explore your Favorite",
      "webCategoryExploreHealthBeauty",
      "resolveCategoryExploreStores",
    ],
    routeId: "categoryDetail",
    routeMarkers: ["useLocalSearchParams", "CustomerCategoryDetailScreen", "categoryName"],
    screenFiles: ["src/screens/CustomerCategoryDetailScreen.tsx"],
    userFlow:
      "Customer opens a category detail page, searches within it, sorts stores, and opens shop cards.",
  },
  {
    appFile: "app/(tabs)/shops.tsx",
    landmarks: ["CustomerShopDirectoryScreen", "webShopDirectory", "filterShopDirectoryStores"],
    routeId: "shops",
    routeMarkers: ["CustomerDiscoveryScreen", 'routeId="shops"'],
    screenFiles: ["src/screens/CustomerDiscoveryScreen.tsx"],
    userFlow:
      "Customer browses the all-shops directory, searches, filters, sorts, and opens a shop.",
  },
  {
    appFile: "app/shop/[id].tsx",
    expectedLinks: ["`/category/${encodeURIComponent(shop.category)}`", "`/shop/${store.id}`"],
    landmarks: ["webShopDetailGroceryGalaxy", "ShopHero", "ShopCashbackRail", "ShopTermsPanel"],
    routeId: "shopDetail",
    routeMarkers: ["useLocalSearchParams", "CustomerShopDetailScreen", "shopId"],
    screenFiles: ["src/screens/CustomerShopDetailScreen.tsx"],
    userFlow:
      "Customer views shop cashback, tracking period, terms, quest banner, and related shops.",
  },
  {
    appFile: "app/golink.tsx",
    landmarks: ["webGoLinkFeature", "goLinkShopNowRoute", "GoGoLink information"],
    routeId: "golink",
    routeMarkers: ["CustomerGoLinkScreen"],
    screenFiles: ["src/screens/CustomerGoLinkScreen.tsx"],
    userFlow:
      "Customer pastes a product/shop URL, validates it, previews GoGoLink, and continues to a shop.",
  },
  {
    appFile: "app/privacy-policy.tsx",
    landmarks: ["privacyPolicyMarkdown", "parseLegalMarkdown", "privacy-policy-article"],
    routeId: "privacyPolicy",
    routeMarkers: ["CustomerPrivacyPolicyScreen"],
    screenFiles: ["src/screens/CustomerPrivacyPolicyScreen.tsx"],
    userFlow:
      "Customer reads the GoGoCash privacy policy as native text without raw HTML rendering.",
  },
  {
    appFile: "app/login.tsx",
    expectedLinks: ["/privacy-policy", 'mode === "register" ? "/login" : "/register"'],
    landmarks: ["webAuthPage", "PhoneOtpBoxes", "privacyAccepted", "socialProviders"],
    routeId: "login",
    routeMarkers: ["CustomerAuthScreen", 'mode="login"'],
    screenFiles: ["src/screens/CustomerAuthScreen.tsx"],
    userFlow:
      "Customer signs in with phone/social auth, accepts privacy terms, enters OTP, or switches to register.",
  },
  {
    appFile: "app/register.tsx",
    expectedLinks: ["/privacy-policy", 'mode === "register" ? "/login" : "/register"'],
    landmarks: ["webAuthPage", "PhoneOtpBoxes", "privacyAccepted", "socialProviders"],
    routeId: "register",
    routeMarkers: ["CustomerAuthScreen", 'mode="register"'],
    screenFiles: ["src/screens/CustomerAuthScreen.tsx"],
    userFlow: "Customer registers through the same phone/social auth flow with sign-up copy.",
  },
  {
    appFile: "app/auth/callback.tsx",
    expectedLinks: ["router.replace(callbackUrl"],
    landmarks: ["Signing you in", "Sign-in link expired", "exchangeMobileAuthCode"],
    routeId: "authCallback",
    routeMarkers: ["CustomerAuthCallbackScreen"],
    screenFiles: ["src/screens/CustomerAuthCallbackScreen.tsx"],
    userFlow:
      "Customer returns from external auth, sees handoff state, and lands on a sanitized app callback or an error state.",
  },
  {
    appFile: "app/account-setup.tsx",
    expectedLinks: ['router.push("/method/create")', 'router.replace("/")'],
    landmarks: ["webAccountSetupFlow", "PromptPay", "registeredPhone", "SecondaryButton"],
    routeId: "accountSetup",
    routeMarkers: ["CustomerAccountSetupScreen"],
    screenFiles: ["src/screens/CustomerAccountSetupScreen.tsx"],
    userFlow: "Customer completes PromptPay account setup, verifies phone/OTP, or skips to Home.",
  },
  {
    appFile: "app/link-mycashback/index.tsx",
    expectedLinks: ["/method/create", "/link-mycashback/my-cashback-sign-in"],
    landmarks: ["webLinkMyCashbackIntro", "link-mycashback-intro", "connectorDots"],
    routeId: "linkMycashback",
    routeMarkers: ["CustomerLinkCashbackScreen", 'mode="link"'],
    screenFiles: ["src/screens/CustomerLinkCashbackScreen.tsx"],
    userFlow: "Customer sees MyCashback link intro, skips, or opens account-selection flow.",
  },
  {
    appFile: "app/link-mycashback/my-cashback-sign-in.tsx",
    expectedLinks: ["/link-mycashback", "/account-setup"],
    landmarks: ["mycashbackSignIn", "Select Your Preferred Link", "LinkOtpBoxes"],
    routeId: "linkMycashbackSignIn",
    routeMarkers: ["CustomerMyCashbackSignInScreen"],
    screenFiles: ["src/screens/CustomerMyCashbackSignInScreen.tsx"],
    userFlow: "Customer selects a MyCashback account and proceeds to link account details.",
  },
  {
    appFile: "app/(tabs)/profile.tsx",
    expectedLinks: ["profileHubSubNavItems", "profileHubMenuItems", "router.push(href as never)"],
    landmarks: ["webProfileWalletSummary", "profileHubMenuItems", "Open referral page"],
    routeId: "profile",
    routeMarkers: ["CustomerProfileScreen"],
    screenFiles: ["src/screens/CustomerProfileScreen.tsx"],
    userFlow:
      "Customer opens profile hub, expands profile submenu, copies/refers friends, and navigates account rows.",
  },
  {
    appFile: "app/profile/info.tsx",
    expectedLinks: ["/profile", "/withdraw"],
    landmarks: [
      "ProfilePersonalInformationPanel",
      "webProfileInfoCashbackCard",
      "ProfileCashbackSummaryCard",
    ],
    routeId: "profileInfo",
    routeMarkers: ["CustomerProfileDetailScreen", 'mode="info"'],
    // Wave 3: the personal-info + cashback-summary sections and the /withdraw link moved
    // out of the detail screen into the shared ProfileInfoPanel (so /profile desktop and
    // /profile/info share one source). Include the panel here so these landmarks/links
    // resolve at their new home; the detail screen still carries the /profile back link.
    screenFiles: [
      "src/screens/CustomerProfileDetailScreen.tsx",
      "src/components/ProfileInfoPanel.tsx",
    ],
    userFlow:
      "Customer views and edits personal information, cashback summary, tax ID, and profile details.",
  },
  {
    appFile: "app/profile/verify-phone.tsx",
    expectedLinks: ["/profile/info", 'router.push("/profile/cf-phone")'],
    landmarks: ["Mobile Number", "Invalid phone number", "Thailand (TH)"],
    routeId: "profileVerifyPhone",
    routeMarkers: ["CustomerProfilePhoneScreen", 'mode="phone"'],
    screenFiles: ["src/screens/CustomerProfilePhoneScreen.tsx"],
    userFlow: "Customer enters a phone number, handles validation, and moves to OTP confirmation.",
  },
  {
    appFile: "app/profile/cf-phone.tsx",
    expectedLinks: ["/profile/verify-phone"],
    landmarks: ["Verification Code", "Please wait for 1 minute", "Back"],
    routeId: "profileConfirmPhone",
    routeMarkers: ["CustomerProfilePhoneScreen", 'mode="otp"'],
    screenFiles: ["src/screens/CustomerProfilePhoneScreen.tsx"],
    userFlow: "Customer enters phone OTP, resends code, or changes number.",
  },
  {
    appFile: "app/profile/my-rating.tsx",
    expectedLinks: ['href="/credit-score"'],
    landmarks: ["Redirect", "/credit-score"],
    routeId: "profileRating",
    routeMarkers: ["Redirect", 'href="/credit-score"'],
    screenFiles: ["app/profile/my-rating.tsx"],
    userFlow: "Customer follows the legacy rating route and lands on the credit-score flow.",
  },
  {
    appFile: "app/profile/offer.tsx",
    expectedLinks: ["/profile"],
    landmarks: ["offer_id", "deeplink", "Copy Link"],
    routeId: "profileOffers",
    routeMarkers: ["CustomerProfileOffersScreen"],
    screenFiles: ["src/screens/CustomerProfileOffersScreen.tsx"],
    userFlow: "Customer views activated offers and copies each offer deeplink.",
  },
  {
    appFile: "app/wallet.tsx",
    expectedLinks: ["/profile", "https://lin.ee/7om5sAr"],
    landmarks: ["webWalletCashbackSummary", "webWalletTransactionTabs", "webWalletEmptyState"],
    routeId: "wallet",
    routeMarkers: ["CustomerWalletScreen"],
    screenFiles: ["src/screens/CustomerWalletScreen.tsx"],
    userFlow:
      "Customer views wallet support, cashback summary, transaction tabs, and empty transaction state.",
  },
  {
    appFile: "app/withdraw/index.tsx",
    expectedLinks: ["/method/create", "/wallet"],
    landmarks: ['mode === "withdraw"', "Withdraw", "0.00"],
    routeId: "withdraw",
    routeMarkers: ["CustomerMoneyActionScreen", 'mode="withdraw"'],
    screenFiles: ["src/screens/CustomerMoneyActionScreen.tsx"],
    userFlow: "Customer enters a withdrawal amount, reviews destination, and returns to wallet.",
  },
  {
    appFile: "app/withdraw/my-cashback.tsx",
    expectedLinks: ["/withdraw", "/wallet"],
    landmarks: ['mode === "myCashback"', "Withdraw", "0.00"],
    routeId: "withdrawMycashback",
    routeMarkers: ["CustomerMoneyActionScreen", 'mode="myCashback"'],
    screenFiles: ["src/screens/CustomerMoneyActionScreen.tsx"],
    userFlow: "Customer starts a MyCashback withdrawal flow and can return to withdraw or wallet.",
  },
  {
    appFile: "app/method/index.tsx",
    expectedLinks: ["/profile", "/method/create"],
    landmarks: ["webWithdrawMethodPage", "WithdrawMethodGrid", "defaultBadgeText"],
    routeId: "method",
    routeMarkers: ["CustomerWithdrawMethodScreen"],
    screenFiles: ["src/screens/CustomerWithdrawMethodScreen.tsx"],
    userFlow:
      "Customer reviews withdrawal methods, opens create/edit, and sees default method state.",
  },
  {
    appFile: "app/method/create.tsx",
    expectedLinks: ['router.push("/method")', 'mode === "methodCreate" ? "/method" : "/wallet"'],
    landmarks: ['mode === "methodCreate"', "Select bank", "Account Number", "0x..."],
    routeId: "methodCreate",
    routeMarkers: ["CustomerMoneyActionScreen", 'mode="methodCreate"'],
    screenFiles: ["src/screens/CustomerMoneyActionScreen.tsx"],
    userFlow: "Customer creates bank, PromptPay, or wallet payout method and returns to methods.",
  },
  {
    appFile: "app/favorite.tsx",
    expectedLinks: ["/profile", "/shops", "brand.href"],
    landmarks: ["webFavoriteBrandsPage", "RecentlyVisitedBrandsGrid", "FavoriteBrandsListPreview"],
    routeId: "favorite",
    routeMarkers: ["CustomerFavoriteBrandsScreen"],
    screenFiles: ["src/screens/CustomerFavoriteBrandsScreen.tsx"],
    userFlow: "Customer views recent/favorite brands, searches favorites, and opens shop cards.",
  },
  {
    appFile: "app/referral.tsx",
    expectedLinks: ["/profile"],
    landmarks: ["webReferralPage", "Copy referral link", "ReferralInvitationTable"],
    routeId: "referral",
    routeMarkers: ["CustomerReferralScreen"],
    screenFiles: ["src/screens/CustomerReferralScreen.tsx"],
    userFlow:
      "Customer views referral reward, copies invite link, shares socially, and expands FAQs.",
  },
  {
    appFile: "app/pricing.tsx",
    expectedLinks: ["/membership"],
    landmarks: ["GoGo Membership", "Unlock GoGoPass", "PricingPanel"],
    routeId: "pricing",
    routeMarkers: ["CustomerSubscriptionScreen", 'mode="pricing"'],
    screenFiles: ["src/screens/CustomerSubscriptionScreen.tsx"],
    userFlow: "Customer compares GoGoPass monthly/annual pricing while checkout remains disabled.",
  },
  {
    appFile: "app/subscription.tsx",
    expectedLinks: ["/pricing"],
    landmarks: ["SubscriptionStatusPanel", "No active subscription", "View pricing"],
    routeId: "subscription",
    routeMarkers: ["CustomerSubscriptionScreen", 'mode="subscription"'],
    screenFiles: ["src/screens/CustomerSubscriptionScreen.tsx"],
    userFlow: "Customer sees subscription status, disabled checkout notice, and route to pricing.",
  },
  {
    appFile: "app/billing.tsx",
    expectedLinks: ["/pricing"],
    landmarks: ["BillingPanel", "Manage Subscription", "Status: No active subscription"],
    routeId: "billing",
    routeMarkers: ["CustomerSubscriptionScreen", 'mode="billing"'],
    screenFiles: ["src/screens/CustomerSubscriptionScreen.tsx"],
    userFlow: "Customer sees billing portal placeholder and disabled manage-subscription state.",
  },
  {
    appFile: "app/membership.tsx",
    expectedLinks: ["/profile", "/pricing"],
    landmarks: ["GoGoPass", "Fee-free withdrawals", "Reward boosts"],
    routeId: "membership",
    routeMarkers: ["CustomerMembershipScreen"],
    screenFiles: ["src/screens/CustomerMembershipScreen.tsx"],
    userFlow: "Customer reviews GoGoPass membership benefits and navigates to pricing.",
  },
  {
    appFile: "app/credit-score.tsx",
    expectedLinks: ["/profile", "/profile/info"],
    landmarks: ["webCreditScorePage", "CreditScoreBreakdown", "CreditScoreBenefits"],
    routeId: "creditScore",
    routeMarkers: ["CustomerCreditScoreScreen"],
    screenFiles: ["src/screens/CustomerCreditScoreScreen.tsx"],
    userFlow:
      "Customer reviews score, completed actions, locked benefits, and profile completion CTA.",
  },
  {
    appFile: "app/missing-orders.tsx",
    expectedLinks: ["/profile"],
    landmarks: ["webMissingOrdersPage", "MissingOrdersFormPanel", "MissingOrdersQuickCards"],
    routeId: "missingOrders",
    routeMarkers: ["CustomerMissingOrdersScreen"],
    screenFiles: ["src/screens/CustomerMissingOrdersScreen.tsx"],
    userFlow: "Customer reviews missing-order guidance, disabled submit state, and claim examples.",
  },
  {
    appFile: "app/age-verification.tsx",
    expectedLinks: ["/profile"],
    landmarks: ["Age verification", "Birth date", "Verification complete"],
    routeId: "ageVerification",
    routeMarkers: ["CustomerAgeVerificationScreen"],
    screenFiles: ["src/screens/CustomerAgeVerificationScreen.tsx"],
    userFlow: "Customer enters birth date, receives validation, and completes age verification.",
  },
  {
    appFile: "app/language.tsx",
    expectedLinks: ["/profile"],
    landmarks: ["webAccountSettingsPage", "NotificationSection", "CommunitySection"],
    routeId: "language",
    routeMarkers: ["CustomerAccountSettingsScreen"],
    screenFiles: ["src/screens/CustomerAccountSettingsScreen.tsx"],
    userFlow:
      "Customer opens account settings for subscription, notifications, and community links.",
  },
  {
    appFile: "app/privacy-center.tsx",
    expectedLinks: ["/profile"],
    landmarks: ["webPrivacyCenterPage", 'accessibilityRole="switch"', "allOptionalEnabled"],
    routeId: "privacyCenter",
    routeMarkers: ["CustomerPrivacyCenterScreen"],
    screenFiles: ["src/screens/CustomerPrivacyCenterScreen.tsx"],
    userFlow:
      "Customer reviews privacy center, toggles consent purposes, and opens data-rights actions.",
  },
  {
    appFile: "app/(tabs)/quest.tsx",
    expectedLinks: ["/quest/history", "/brand", "getTopBrandHref(card.brand)"],
    landmarks: ["webQuestTabs", "QuestTaskPanel", "QuestLeaderboardPanel"],
    routeId: "quest",
    routeMarkers: ["CustomerQuestScreen"],
    screenFiles: ["src/screens/CustomerQuestScreen.tsx"],
    userFlow: "Customer views quest tasks, leaderboard, history link, and related shops.",
  },
  {
    appFile: "app/quest/history.tsx",
    expectedLinks: ["/quest/history"],
    landmarks: ['history ? "leaderboard" : "how-to-win"', "QuestLeaderboardPanel", "Quest History"],
    routeId: "questHistory",
    routeMarkers: ["CustomerQuestScreen", "history"],
    screenFiles: ["src/screens/CustomerQuestScreen.tsx"],
    userFlow: "Customer opens quest history directly into leaderboard/history state.",
  },
  {
    appFile: "app/gogosense/index.tsx",
    expectedLinks: [
      "/gogosense/onboarding",
      "/gogosense/permissions",
      "/gogosense/timeline",
      "/gogosense/settings",
      "/gogosense/recovery",
    ],
    landmarks: ["gogoSenseFlowCopy", "Permission checklist", "Tracking timeline"],
    routeId: "gogosense",
    routeMarkers: ["CustomerGoGoSenseScreen", 'mode="hub"'],
    screenFiles: ["src/screens/CustomerGoGoSenseScreen.tsx"],
    userFlow:
      "Customer opens the GoGoSense protected hub and chooses setup, permissions, timeline, settings, or recovery.",
  },
  {
    appFile: "app/gogosense/onboarding.tsx",
    expectedLinks: ["/gogosense/permissions"],
    landmarks: ["Set up GoGoSense", "Install native detector", "Continue to permissions"],
    routeId: "gogosenseOnboarding",
    routeMarkers: ["CustomerGoGoSenseScreen", 'mode="onboarding"'],
    screenFiles: ["src/screens/CustomerGoGoSenseScreen.tsx"],
    userFlow:
      "Customer enters GoGoSense onboarding, reviews setup steps, and continues to permission setup.",
  },
  {
    appFile: "app/gogosense/permissions.tsx",
    expectedLinks: ["/gogosense/settings", "/gogosense/timeline"],
    landmarks: ["Permission checklist", "Usage access", "Usage access disclosure"],
    routeId: "gogosensePermissions",
    routeMarkers: ["CustomerGoGoSenseScreen", 'mode="permissions"'],
    screenFiles: ["src/screens/CustomerGoGoSenseScreen.tsx"],
    userFlow:
      "Customer opens GoGoSense permissions, reviews OS permission rationale, and moves to settings or timeline.",
  },
  {
    appFile: "app/gogosense/timeline.tsx",
    expectedLinks: ["/gogosense/recovery", "/gogosense/settings"],
    landmarks: ["Tracking timeline", "Detected shopping session", "Cashback pending"],
    routeId: "gogosenseTimeline",
    routeMarkers: ["CustomerGoGoSenseScreen", 'mode="timeline"'],
    screenFiles: ["src/screens/CustomerGoGoSenseScreen.tsx"],
    userFlow:
      "Customer opens GoGoSense timeline, reviews detection history, and starts recovery when tracking is missing.",
  },
  {
    appFile: "app/gogosense/settings.tsx",
    expectedLinks: ["/gogosense/permissions"],
    landmarks: ["Tracking controls", "PII minimization", "Permission checklist"],
    routeId: "gogosenseSettings",
    routeMarkers: ["CustomerGoGoSenseScreen", 'mode="settings"'],
    screenFiles: ["src/screens/CustomerGoGoSenseScreen.tsx"],
    userFlow:
      "Customer opens GoGoSense settings, reviews privacy toggles, and can return to permissions.",
  },
  {
    appFile: "app/gogosense/recovery.tsx",
    expectedLinks: ["/gogosense/timeline"],
    landmarks: ["Screenshot recovery", "Manual merchant review", "Back to timeline"],
    routeId: "gogosenseRecovery",
    routeMarkers: ["CustomerGoGoSenseScreen", 'mode="recovery"'],
    screenFiles: ["src/screens/CustomerGoGoSenseScreen.tsx"],
    userFlow:
      "Customer opens GoGoSense recovery, submits missing tracking evidence, and returns to timeline.",
  },
  {
    appFile: "app/gogosense/merchant/[id].tsx",
    expectedLinks: ["/gogosense/timeline", "/gogosense/recovery"],
    landmarks: ["Merchant tracking detail", "Catalog status", "Android package detection"],
    routeId: "gogosenseMerchant",
    routeMarkers: [
      "useLocalSearchParams",
      "CustomerGoGoSenseScreen",
      'mode="merchant"',
      "merchantId",
    ],
    screenFiles: ["src/screens/CustomerGoGoSenseScreen.tsx"],
    userFlow:
      "Customer opens a GoGoSense merchant detail screen, reviews detection methods, and starts recovery if tracking is missing.",
  },
];

function readMobileFile(relativePath: string) {
  return fs.readFileSync(path.join(mobileRoot, relativePath), "utf8");
}

function readScreenContractSources(screenFiles: string[]) {
  if (
    screenFiles.length === 1 &&
    screenFiles[0] === "src/screens/CustomerDiscoveryScreen.tsx"
  ) {
    return readDiscoverySources(mobileRoot);
  }

  if (
    screenFiles.length === 1 &&
    screenFiles[0] === "src/screens/CustomerHomeScreen.tsx"
  ) {
    return readHomeSources(mobileRoot);
  }

  return screenFiles.map((file) => readMobileFile(file)).join("\n");
}

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

describe("Expo frontend user-flow parity", () => {
  it("frontend flow catalog > given the mobile route catalog > then every route has a named user flow", () => {
    expect(frontendFlowContracts.map((contract) => contract.routeId).sort()).toEqual(
      mobileParityRoutes.map((route) => route.id).sort()
    );

    for (const contract of frontendFlowContracts) {
      expect(contract.userFlow, contract.routeId).toMatch(/^Customer .+\.$/);
      expect(contract.landmarks.length, contract.routeId).toBeGreaterThanOrEqual(2);
    }
  });

  it("frontend route handoff > given every flow contract > then each route file renders the intended screen and mode", () => {
    for (const contract of frontendFlowContracts) {
      const routeFile = readMobileFile(contract.appFile);

      for (const marker of contract.routeMarkers) {
        expect(routeFile, `${contract.routeId} route marker: ${marker}`).toContain(marker);
      }
    }
  });

  it("frontend landmarks > given every flow contract > then screens keep the expected user-facing state anchors", () => {
    for (const contract of frontendFlowContracts) {
      const screenText = normalizeWhitespace(readScreenContractSources(contract.screenFiles));

      for (const landmark of contract.landmarks) {
        expect(screenText, `${contract.routeId} landmark: ${landmark}`).toContain(landmark);
      }
    }
  });

  it("frontend navigation > given flow contracts with expected links > then linked next steps stay present", () => {
    for (const contract of frontendFlowContracts.filter((flow) => flow.expectedLinks?.length)) {
      const flowText = normalizeWhitespace(
        [contract.appFile, ...contract.screenFiles].map((file) => readMobileFile(file)).join("\n")
      );

      for (const link of contract.expectedLinks ?? []) {
        expect(flowText, `${contract.routeId} expected link: ${link}`).toContain(link);
      }
    }
  });

  it("frontend auth boundary > given the route catalog > then flow contracts preserve public vs protected posture", () => {
    const protectedIds = new Set(getProtectedRouteIds());

    for (const contract of frontendFlowContracts) {
      const route = mobileParityRoutes.find((candidate) => candidate.id === contract.routeId);

      expect(route, contract.routeId).toBeDefined();
      expect(protectedIds.has(contract.routeId), contract.routeId).toBe(route?.requiresAuth);
    }
  });

  it("frontend fallback cleanup > given Next-derived migrated flows > then no route uses the generic parity placeholder", () => {
    const nextDerivedRouteIds = new Set(
      expoConversionRouteOwnership.map((route) => route.expoRouteId)
    );
    const forbiddenPlaceholderText = [
      "Screen contract",
      "Matches the GoGoCash web mobile shell",
      "Related web screens",
    ];

    for (const contract of frontendFlowContracts.filter((flow) =>
      nextDerivedRouteIds.has(flow.routeId)
    )) {
      const routeFile = readMobileFile(contract.appFile);
      const screenText = readScreenContractSources(contract.screenFiles);

      expect(routeFile, `${contract.routeId} route file`).not.toContain("NativeParityScreen");
      for (const text of forbiddenPlaceholderText) {
        expect(screenText, `${contract.routeId} placeholder text: ${text}`).not.toContain(text);
      }
    }
  });

  it("frontend flow scripts > given package scripts > then flow parity can run alone or in the full app gate", () => {
    const rootPackage = JSON.parse(readRepoFile("package.json")) as {
      scripts: Record<string, string>;
    };
    const appPackage = JSON.parse(readMobileFile("package.json")) as {
      scripts: Record<string, string>;
    };

    // Run alone: the app exposes a dedicated flow-parity script.
    expect(appPackage.scripts["test:flows"]).toBe(
      "vitest run --config vitest.config.ts src/__tests__/frontend-user-flow-parity.test.ts"
    );
    // Run inside the full app gate: test:full chains the whole vitest suite
    // (npm run test) which includes this flow-parity file.
    expect(appPackage.scripts["test:full"]).toContain("npm run test");
    // Run inside the full monorepo gate: the Turborepo root delegates `test`
    // across workspaces, which invokes this app's test script. (The standalone
    // `mobile:test:*` root scripts were retired when apps/mobile became apps/app.)
    expect(rootPackage.scripts.test).toBe("turbo run test");
  });

  it("GoGoSense frontend parity > given native detector scope > then dedicated onboarding permissions timeline settings recovery and merchant flows replace placeholders", () => {
    const gogosenseContracts = frontendFlowContracts.filter((contract) =>
      contract.routeId.startsWith("gogosense")
    );

    expect(gogosenseContracts).toHaveLength(7);
    for (const contract of gogosenseContracts) {
      const routeFile = readMobileFile(contract.appFile);
      const screenText = readScreenContractSources(contract.screenFiles);

      expect(routeFile, `${contract.routeId} route`).toContain("CustomerGoGoSenseScreen");
      expect(routeFile, `${contract.routeId} route`).not.toContain("NativeParityScreen");
      expect(screenText, `${contract.routeId} screen`).toContain("gogoSenseFlowCopy");
      expect(screenText, `${contract.routeId} screen`).not.toContain("Related web screens");
    }
  });

  it("frontend browser flow QA > given customer flow coverage > then rendered smoke tests include every GoGoSense native route and critical Next-derived flows", () => {
    const designQa = readMobileFile("e2e/design-parity.spec.ts");
    const playwrightConfig = readMobileFile("playwright.config.ts");
    const requiredSmokeRoutes = [
      "/",
      "/profile",
      "/referral",
      "/link-mycashback",
      "/link-mycashback/my-cashback-sign-in",
      "/wallet",
      "/quest",
      "/gogosense",
      "/gogosense/onboarding",
      "/gogosense/permissions",
      "/gogosense/timeline",
      "/gogosense/settings",
      "/gogosense/recovery",
      "/gogosense/merchant/grocery-galaxy",
    ];

    for (const route of requiredSmokeRoutes) {
      expect(designQa, `missing rendered smoke route: ${route}`).toContain(`path: "${route}"`);
    }
    expect(designQa).toContain("placeholderText");
    expect(designQa).toContain("attachPageErrorCollector");
    expect(playwrightConfig).toContain("backend-mobile");
    expect(playwrightConfig).toContain("backend-desktop");
  });
});
