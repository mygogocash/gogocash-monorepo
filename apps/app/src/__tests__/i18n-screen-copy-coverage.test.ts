import { describe, expect, it } from "vitest";

import { translateCopy } from "@mobile/i18n/messages";
import {
  profileHubMenuItems,
  webCreditScorePage,
  webFavoriteBrandsPage,
  webLinkMyCashbackIntro,
  webMembershipLanding,
  webMissingOrdersPage,
  webReferralPage,
  webWalletCashbackSummary,
  webWalletEmptyState,
  webWalletSupportBanner,
  webWalletTransactionTabs,
  webWithdrawMethodPage,
} from "@mobile/design/webDesignParity";

// Phase 3 screen keying guards the one failure mode `tc()` wrapping can hit silently: a screen wraps an
// English string that has NO catalog match, so Thai mode falls back to English with no error. For each
// migrated screen we assert the *prose* it renders resolves to a non-English Thai string. Numeric/brand
// data (amounts, currency, "LINE") is intentionally excluded — it is not translated copy.
function expectAllTranslatedToThai(strings: readonly string[]): void {
  const untranslated = strings.filter((s) => translateCopy(s, "th") === s);
  expect(untranslated).toEqual([]);
}

describe("i18n screen copy coverage — CustomerWalletScreen", () => {
  it("translates all wallet prose copy to Thai", () => {
    expectAllTranslatedToThai([
      // Transaction tabs
      ...webWalletTransactionTabs,
      // Support banner
      webWalletSupportBanner.line1,
      webWalletSupportBanner.line2,
      webWalletSupportBanner.title,
      webWalletSupportBanner.subtitle,
      // Cashback summary
      webWalletCashbackSummary.title,
      webWalletCashbackSummary.subtitle,
      ...webWalletCashbackSummary.metrics.map((m) => m.label),
      ...webWalletCashbackSummary.metrics.map((m) => m.hint),
      // Empty state
      webWalletEmptyState.title,
      webWalletEmptyState.subtitle,
      // Inline screen literals (header, filter pills, not-ready state, image alt)
      "My Wallet",
      "Back to Profile",
      "Search",
      "Date Range",
      "Status",
      "No wallet activity yet",
      "Your cashback wallet does not have any backend activity yet.",
      "Wallet empty state illustration",
    ]);
  });
});

// Brand names render identically in en/th (like "LINE"), so they are excluded from the translate check.
const BRAND_LABELS = new Set<string>(["GoGoPass"]);

describe("i18n screen copy coverage — AccountPageShell (shared chrome)", () => {
  it("translates the desktop profile rail labels to Thai", () => {
    // The rail renders the first 9 hub items; the rest are external legal/help links handled elsewhere.
    const railLabels = profileHubMenuItems
      .slice(0, 9)
      .map((item) => item.label)
      .filter((label) => !BRAND_LABELS.has(label));
    expectAllTranslatedToThai(railLabels);
  });

  it("translates the wallet hero card prose to Thai", () => {
    // Only AccountWalletHeroCard is rendered (by the profile screens). CashbackSummaryBreakdown +
    // webWalletSummaryMetrics are an unused export, so their copy is intentionally not keyed here.
    expectAllTranslatedToThai(["Total Cashback Available", "Withdraw", "Profile avatar"]);
  });
});

describe("i18n screen copy coverage — CustomerMissingOrdersScreen", () => {
  it("translates all missing-orders prose copy to Thai", () => {
    expectAllTranslatedToThai([
      webMissingOrdersPage.title,
      webMissingOrdersPage.intro,
      webMissingOrdersPage.supportActionLabel,
      webMissingOrdersPage.clearActionLabel,
      webMissingOrdersPage.submitActionLabel,
      webMissingOrdersPage.faqTitle,
      ...webMissingOrdersPage.sections.map((s) => s.title),
      ...webMissingOrdersPage.sections.map((s) => s.help),
      ...webMissingOrdersPage.sections.flatMap((s) => s.fields.map((f) => f.label)),
      ...webMissingOrdersPage.sections.flatMap((s) => s.fields.map((f) => f.helper)),
      ...webMissingOrdersPage.bullets,
      ...webMissingOrdersPage.quickCards.map((c) => c.title),
      ...webMissingOrdersPage.quickCards.map((c) => c.accent),
      ...webMissingOrdersPage.faqs.flatMap((f) => [f.question, f.answer]),
      // The image field's value is an action label (not example data).
      "Add images",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerReferralScreen", () => {
  it("translates all referral prose copy to Thai", () => {
    expectAllTranslatedToThai([
      webReferralPage.title,
      // hero.alt / steps.alt describe English marketing banner PNGs (non-localized assets) — left in English.
      webReferralPage.earn.title,
      webReferralPage.earn.subtitle,
      webReferralPage.earn.shareTitle,
      webReferralPage.earn.inviteLinkLabel,
      webReferralPage.earn.socialTitle,
      webReferralPage.invitation.title,
      ...webReferralPage.invitation.tabs,
      ...webReferralPage.invitation.columns,
      webReferralPage.faq.title,
      ...webReferralPage.faq.items.flatMap((i) => [i.question, i.answer]),
      // Inline a11y + not-ready state literals
      "Copy referral link",
      "No referral activity yet",
      "Invite friends to start building referral activity.",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerMembershipScreen", () => {
  it("translates all membership prose copy to Thai", () => {
    expectAllTranslatedToThai([
      // memberBenefits (local const)
      "2 fee-free withdrawals",
      "20% boost for GoGoQuest",
      "20% boost for My Rating Score",
      "Priority customer support",
      // faqItems (local const)
      "What currency am I charged in?",
      "All membership charges are in Thai Baht (THB). The price you see is the price you pay.",
      "Can I cancel anytime?",
      "Cancel from your account whenever you like. You keep access until the end of the period.",
      "When do member benefits start?",
      "Membership benefits start after checkout completes and follow the in-app eligibility rules.",
      // hero + billing inline
      "Membership offer",
      "Go premium for less than a coffee a week.",
      "Unlock GoGoPass for ฿49/month or ฿490/year:",
      "Choose your billing",
      "Same membership - pick monthly flexibility or annual savings.",
      "Billing period",
      "Monthly",
      "Billed monthly - cancel anytime",
      "Best value",
      "Annual",
      "~฿41/mo effective when billed yearly",
      "Online checkout is not available.",
      "Get ฿490/year",
      "Start for ฿49/month",
      // perks
      "Fee-free withdrawals",
      "Two member withdrawals each month.",
      "Reward boosts",
      "GoGoQuest and My Rating Score earn a 20% lift.",
      "Priority support",
      "Member requests move through the support queue first.",
      "Billing & membership FAQ",
      // webMembershipLanding savings + social proof (prose only; ฿ amounts/percentages are data)
      webMembershipLanding.savings.heading,
      webMembershipLanding.savings.subtitle,
      webMembershipLanding.savings.monthlyLine,
      webMembershipLanding.savings.annualLine,
      webMembershipLanding.savings.youSaveLabel,
      webMembershipLanding.savings.footnote,
      webMembershipLanding.socialProof.heading,
      webMembershipLanding.socialProof.subtitle,
      ...webMembershipLanding.socialProof.stats.map((s) => s.caption),
    ]);
  });
});

describe("i18n screen copy coverage — CustomerCreditScoreScreen", () => {
  it("translates all credit-score prose copy to Thai", () => {
    expectAllTranslatedToThai([
      // "My Rating Score" now resolves via the web `navCreditScore` th value (translated + re-synced).
      webCreditScorePage.title,
      webCreditScorePage.heroLabel,
      // tier ("Starter") + progressTitle ("⭐ Starter — 💜 Trusted") are tier proper-nouns/emoji — kept English.
      webCreditScorePage.pointsToTrusted,
      webCreditScorePage.breakdownTitle,
      webCreditScorePage.completeSectionLabel,
      webCreditScorePage.todoSectionLabel,
      ...webCreditScorePage.completeRows.map((r) => r.label),
      ...webCreditScorePage.todoRows.map((r) => r.label),
      ...webCreditScorePage.todoRows.flatMap((r) => ("subLabel" in r ? [r.subLabel] : [])),
      ...webCreditScorePage.todoRows.map((r) => r.cta),
      webCreditScorePage.benefitsTitle,
      webCreditScorePage.activeBenefitsLabel,
      webCreditScorePage.lockedBenefitsLabel,
      webCreditScorePage.comingSoonLabel,
      ...webCreditScorePage.activeBenefits.map((b) => b.label),
      ...webCreditScorePage.lockedBenefits.map((b) => b.label),
      ...webCreditScorePage.lockedBenefits.flatMap((b) => ("note" in b && b.note ? [b.note] : [])),
      ...webCreditScorePage.comingBenefits.map((b) => b.label),
      webCreditScorePage.streakTitle,
      webCreditScorePage.streakSubtitle,
      webCreditScorePage.boostTitle,
      webCreditScorePage.boostBody,
      webCreditScorePage.boostCta,
      // Inline literals (statuses + streak month label)
      "Active",
      "Coming 2027",
      "Month",
      "In progress",
      "Locked",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerAgeVerificationScreen", () => {
  it("translates all age-verification prose copy to Thai", () => {
    // All copy lives in local PDPA consts in the screen; values reused from the web catalog's pdpa* keys.
    expectAllTranslatedToThai([
      "Age verification",
      "To meet PDPA requirements and unlock the full service, enter your birth date below. You must be over 20 years old to continue.",
      "Birth date",
      "Verify",
      "Use your real birth date. Access is available only for users over 20 years old.",
      "Verification complete",
      "Please enter your birth date, then tap Verify.",
      "You must be over 20 years old to continue.",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerFavoriteBrandsScreen", () => {
  it("translates all favorite-brands prose copy to Thai", () => {
    expectAllTranslatedToThai([
      webFavoriteBrandsPage.title,
      webFavoriteBrandsPage.hero.title,
      webFavoriteBrandsPage.hero.description,
      webFavoriteBrandsPage.hero.actionLabel,
      webFavoriteBrandsPage.hero.illustrationAlt,
      // hero.logoAlt is "GoGoCash" (brand) — excluded.
      webFavoriteBrandsPage.recentTitle,
      webFavoriteBrandsPage.favoritesTitle,
      webFavoriteBrandsPage.searchPlaceholder,
      webFavoriteBrandsPage.grabCouponLabel,
      webFavoriteBrandsPage.cashbackLabel,
      // Brand categories rendered in chips (brand names + cashback % are data).
      ...[...new Set(webFavoriteBrandsPage.recentBrands.map((b) => b.category))],
      "Saved",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerWithdrawMethodScreen", () => {
  it("translates all withdraw-method prose copy to Thai", () => {
    // method account names / bank names / masked numbers are data, not translated.
    expectAllTranslatedToThai([
      webWithdrawMethodPage.title,
      webWithdrawMethodPage.heading,
      webWithdrawMethodPage.addLabel,
      webWithdrawMethodPage.defaultLabel,
    ]);
  });
});

describe("i18n screen copy coverage — CustomerSubscriptionScreen", () => {
  it("translates all subscription prose copy to Thai", () => {
    // Copy lives in local consts (planCards, pageModels, inline). THB price strings are data.
    expectAllTranslatedToThai([
      "Stripe checkout is not enabled in this environment.",
      "GoGo Membership",
      "Billing period",
      "Pricing",
      "Monthly",
      "Annual",
      "Save ~16%",
      // pageModels
      "My Subscription",
      "Unlock GoGoPass",
      "Subscription",
      "Review secure checkout, billing portal, and subscription status from one place.",
      "Cashback rewards, exclusive partner deals, and priority support - all in one plan.",
      "GoGoPass memberships use Stripe checkout. Open the membership page to compare plans.",
      "View Plans",
      "View membership page",
      "View pricing",
      // plan benefits
      "Priority customer care",
      "Monthly warranty coupons",
      "Exclusive vouchers",
      "Best price",
      "Save ~16% vs paying monthly",
      "Same GoGoPass benefits",
      // plan CTAs (THB amounts kept inside the translated string)
      "Subscribe for 49 THB / month",
      "Subscribe for 490 THB / year",
      // status/billing panels
      "No active subscription",
      "Unlock GoGoPass to access exclusive benefits and manage future renewals from Billing.",
      "Change Plan",
      "Your subscription",
      "Status: No active subscription",
      "Billing portal access appears here after GoGoPass checkout creates a Stripe customer.",
      "Manage Subscription",
      // not-ready props
      "You do not have an active GoGoPass subscription yet.",
      "No subscription yet",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerAuthCallbackScreen", () => {
  it("translates all auth-callback state copy to Thai", () => {
    expectAllTranslatedToThai([
      "Signed in",
      "Sign-in link expired",
      "Sign-in failed",
      "Signing you in",
      "Your Firebase session was saved. Redirecting to GoGoCash.",
      "Open the latest sign-in link and try again.",
      "GoGoCash could not complete the secure token handoff.",
      "Saving your Firebase token and preparing your GoGoCash session.",
      "Back to sign in",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerLinkCashbackScreen", () => {
  it("translates all link-cashback prose copy to Thai", () => {
    // goGoCashImageLabel ("GoGoCash") + myCashbackImageAlt ("MyCashBack") are brand names — excluded.
    expectAllTranslatedToThai([
      webLinkMyCashbackIntro.title,
      webLinkMyCashbackIntro.subtitle,
      webLinkMyCashbackIntro.cardTitle,
      webLinkMyCashbackIntro.cardDescription,
      webLinkMyCashbackIntro.skipLabel,
      webLinkMyCashbackIntro.linkAccountLabel,
      "MyCashback sign in reference",
      "Link MyCashback intro",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerProfileScreen", () => {
  it("translates all profile prose copy to Thai", () => {
    expectAllTranslatedToThai([
      "Personal Information",
      "My Rating Score",
      "Withdraw Methods",
      "Account Setting",
      "My Wallet",
      "Missing Orders",
      "Favorite Brands",
      "GoGoQuest History",
      "Age Verification",
      "Consent Preferences",
      "Privacy Policy",
      "Terms of Use",
      "Terms of Service",
      "Help Center",
      "Connect with GoGoCash",
      "Complete your profile setup to unlock account actions.",
      "No profile details yet",
      "Profile",
      "Log Out",
      "Log out of GoGoCash?",
      "This clears your saved session on this device before returning to sign in.",
      "Cancel",
      "Logging out",
      "Log out",
      "Open referral page",
      "Invite your Friends",
      "Copy Link",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerProfileOffersScreen", () => {
  it("translates all profile-offers prose copy to Thai", () => {
    expectAllTranslatedToThai([
      "Activate cashback offers to see your personal offer links here.",
      "No activated offers yet",
      "My Offer",
      "Activated cashback offers from your GoGoCash account, including each deeplink and created date.",
      "Copy Link",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerProfilePhoneScreen", () => {
  it("translates all profile-phone prose copy to Thai", () => {
    expectAllTranslatedToThai([
      "Verify Phone",
      "Change Your Phone Number",
      "To keep your account secure, please enter current mobile phone number linked to your account before updating your phone number.",
      "Mobile Number",
      "Thailand (TH)",
      "To keep your account secure, enter the mobile phone number linked to your account.",
      "Invalid phone number",
      "We will send a verification code to confirm your number.",
      "Back",
      "Continue",
      "Verification Code",
      "Enter Current Phone Number",
      "Please wait for 1 minute before requesting another code.",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerAccountSettingsScreen", () => {
  it("translates all account-settings prose copy to Thai", () => {
    expectAllTranslatedToThai([
      "Account Settings",
      "Appearance",
      "System follows your phone or browser setting.",
      "System default",
      "Light",
      "Dark",
      "Your Subscription",
      "View and manage your GoGoCash subscription billing on Stripe.",
      "Open Stripe Subscription",
      "Subscription billing is not enabled yet.",
      "Receive Notifications about Updates",
      "Coming soon",
      "Notifications via Line",
      "Notifications via Email",
      "Join our Community",
      "Join Us on",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerPrivacyCenterScreen", () => {
  it("translates all privacy-center prose copy to Thai", () => {
    expectAllTranslatedToThai([
      "Privacy center",
      "Consent preferences",
      "We collect this information for the stated purpose under PDPA. See Privacy Policy for details.",
      "Get the full GoGoCash experience",
      "Optional consents let us personalize offers, measure what works, share aggregated insights with partners, and run eligibility checks—so cashback and rewards work smoothly for you.",
      "Accept all optional consents",
      "All optional consents are already on.",
      "One tap enables marketing, analytics, B2B aggregated insights, and AI credit scoring where applicable. You can turn any item off below.",
      "Optional data uses",
      "Off",
      "On",
      "Marketing communications",
      "Email, SMS, LINE, or push about offers and updates you may like.",
      "Analytics",
      "Helps us fix bugs, improve flows, and understand feature usage in aggregate.",
      "B2B aggregated insights",
      "Anonymous or aggregated trends shared with merchants and partners to improve programs.",
      "AI credit scoring",
      "Automated checks for offers or limits where you choose products that use scoring.",
      "Cashback tracking (required for service)",
      "Always on",
      "We track eligible purchases and cashback while your account is active so we can credit rewards and meet merchant agreements. This is not optional while you use the service.",
    ]);
  });
});

describe("i18n screen copy coverage — CustomerPrivacyPolicyScreen", () => {
  it("translates the privacy-policy article label to Thai", () => {
    // Body is rendered from a bulk markdown document (data) parsed at runtime — out of tc() scope.
    expectAllTranslatedToThai(["Privacy Policy"]);
  });
});
