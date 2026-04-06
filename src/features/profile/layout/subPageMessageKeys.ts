/** Message keys that exist in `en.json` / `th.json` for `SubPage` titles. */
export const SUB_PAGE_TITLE_KEYS = [
  "Withdraw Method",
  "Account Settings",
  "Withdraw Cashback My Cashback",
  "Withdraw",
  "My Wallet",
  "Subscription",
  "navMembership",
  "Referral",
  "Verify Phone",
  "Profile",
  "My Offer",
  "Favorite Brands",
  "profilePopperGogoquestHistory",
  "missingOrdersPageTitle",
  "pdpaAgeVerifyTitle",
  "pdpaPrivacyCenterTitle",
  "subscriptionPricingTitle",
  "subscriptionBillingTitle",
] as const;

export type SubPageTitleKey = (typeof SUB_PAGE_TITLE_KEYS)[number];

/** Optional subtitle keys — omit `subTitle` when none is needed. */
export const SUB_PAGE_SUBTITLE_KEYS = [
  "Add Withdraw Method",
  "Withdraw Your Cashback Earnings",
  "My withdrawal methods",
] as const;

export type SubPageSubtitleKey = (typeof SUB_PAGE_SUBTITLE_KEYS)[number];
