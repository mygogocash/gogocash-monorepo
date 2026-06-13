/** Article list + fallback when Strapi is not configured — see `lib/learn-data.ts`. */
export type LearnArticleMeta = {
  slug: string;
  /** H1 + document title base */
  title: string;
  metaTitle: string;
  metaDescription: string;
  hubDesc: string;
  updated: string;
};

export const LEARN_ARTICLES: LearnArticleMeta[] = [
  {
    slug: "how-cashback-works",
    title: "How cashback tracking works",
    metaTitle: "How Cashback Tracking Works | GoGoCash Learn",
    metaDescription:
      "How GoGoCash tracks purchases from click to merchant confirmation — and how to avoid common tracking issues.",
    hubDesc: "From click to merchant confirmation — what affects your rewards.",
    updated: "March 22, 2026",
  },
  {
    slug: "saving-plus-explained",
    title: "Saving Plus in plain language",
    metaTitle: "Saving Plus Explained | GoGoCash Learn",
    metaDescription:
      "Plain-language overview of Saving Plus, risks, fees, and how it differs from confusing points programs.",
    hubDesc: "Optional ways to think about idle balances — without the jargon.",
    updated: "March 22, 2026",
  },
  {
    slug: "best-cashback-stores-thailand",
    title: "Best cashback brands for Thailand shoppers",
    metaTitle: "Best Cashback Brands for Thailand | GoGoCash Learn",
    metaDescription:
      "How Thai shoppers can compare marketplace, travel, and electronics cashback — and stay safe while shopping.",
    hubDesc: "How to compare categories, travel, and electronics deals.",
    updated: "March 22, 2026",
  },
  {
    slug: "withdraw-cashback-gogocash",
    title: "How to withdraw cashback from GoGoCash",
    metaTitle: "How to Withdraw Cashback | GoGoCash Learn",
    metaDescription:
      "Steps to withdraw GoGoCash cashback to your bank or e-wallet: thresholds, timing, and what to expect.",
    hubDesc: "Thresholds, methods, and typical payout timing.",
    updated: "March 22, 2026",
  },
  {
    slug: "cashback-not-tracking-fixes",
    title: "Cashback not tracking? Common fixes",
    metaTitle: "Cashback Not Tracking — Fixes | GoGoCash Learn",
    metaDescription:
      "If GoGoCash did not track your order: checklist for ad blockers, cookies, session rules, and when to contact support.",
    hubDesc: "Checklist before you contact support — cookies, tabs, and timing.",
    updated: "March 22, 2026",
  },
  {
    slug: "minimum-withdrawal-payouts-sea",
    title: "Minimum withdrawal and payouts in Southeast Asia",
    metaTitle: "Minimum Withdrawal & Payouts (SEA) | GoGoCash Learn",
    metaDescription:
      "Why minimum withdrawal exists, where to see your threshold, and how payouts differ by country and rail.",
    hubDesc: "Thresholds, rails, and country-specific nuances.",
    updated: "March 22, 2026",
  },
  {
    slug: "how-quests-work",
    title: "How GoGoCash Quests work",
    metaTitle: "How GoGoCash Quests Work | GoGoCash Learn",
    metaDescription:
      "What Quests are, the common types (spending streaks, category challenges, seasonal boosts), and how they stack on top of your base cashback.",
    hubDesc: "Optional challenges that stack extra cashback on your base rate.",
    updated: "June 3, 2026",
  },
  {
    slug: "cashback-lazada-shopee",
    title: "Earn cashback on Lazada and Shopee with GoGoCash",
    metaTitle: "Cashback on Lazada & Shopee | GoGoCash Learn",
    metaDescription:
      "Step-by-step: open Lazada or Shopee from GoGoCash, check out as usual, and let cashback confirm — plus tips to keep tracking reliable.",
    hubDesc: "Open the store from GoGoCash so your marketplace order tracks.",
    updated: "June 3, 2026",
  },
  {
    slug: "choosing-a-cashback-app-sea",
    title: "How to choose a cashback app in Southeast Asia",
    metaTitle: "How to Choose a Cashback App (SEA) | GoGoCash Learn",
    metaDescription:
      "What to compare across cashback apps — withdrawable cash vs points, supported brands, payout rails, and tracking transparency.",
    hubDesc: "What actually matters: payouts, brands, transparency.",
    updated: "June 3, 2026",
  },
  {
    slug: "travel-cashback-sea",
    title: "Travel cashback: hotels and flights with GoGoCash",
    metaTitle: "Travel Cashback on Hotels & Flights | GoGoCash Learn",
    metaDescription:
      "How travel cashback works on partners like Agoda and Trip.com, why bookings confirm later, and how to keep your trip rewards on track.",
    hubDesc: "How travel bookings earn — and why they confirm closer to your trip.",
    updated: "June 3, 2026",
  },
];

const bySlug: Record<string, LearnArticleMeta> = Object.fromEntries(
  LEARN_ARTICLES.map((a) => [a.slug, a]),
);

export function learnArticleBySlug(slug: string): LearnArticleMeta | undefined {
  return bySlug[slug];
}

export function learnArticleSlugs(): string[] {
  return LEARN_ARTICLES.map((a) => a.slug);
}

export function learnArticlePaths(): string[] {
  return LEARN_ARTICLES.map((a) => `/learn/${a.slug}`);
}
