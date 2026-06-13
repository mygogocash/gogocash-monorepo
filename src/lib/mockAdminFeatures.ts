/**
 * Mock REST handlers for new admin feature modules (credit score, membership, etc.).
 * Routed from `handleMockApiRequest` when path starts with `admin/<feature>/...`.
 */
import {
  addManualCashbackConversion,
  mockUsers,
  setManualCashbackStatus,
} from "@/app/api/mock/data";
import { tierFromScore } from "@/lib/creditTier";
import { sortMembers, type MemberSortKey } from "@/lib/memberSort";

/** Same shape as `MockApiInput` in mockApiCore (avoid circular import). */
export type AdminFeatureMockInput = {
  method: string;
  path: string[];
  searchParams: URLSearchParams;
  body: unknown | undefined;
};

type MockApiResult = { status: number; body: unknown };

const ok = (body: unknown): MockApiResult => ({ status: 200, body });
const jsonErr = (status: number, body: unknown): MockApiResult => ({
  status,
  body,
});

function paginate<T>(items: T[], page = 1, limit = 10) {
  const p = Math.max(1, page);
  const l = Math.min(100, Math.max(1, limit));
  const start = (p - 1) * l;
  return {
    data: items.slice(start, start + l),
    page: p,
    limit: l,
    total: items.length,
    totalPages: Math.ceil(items.length / l),
  };
}

export type CreditTier = "bronze" | "silver" | "gold" | "platinum";

export type CreditScoreRow = {
  userId: string;
  userName: string;
  email: string;
  currentScore: number;
  tier: CreditTier;
  lastUpdated: string;
  history: { date: string; score: number }[];
  factors: { name: string; weight: number; contribution: number }[];
};

function buildCreditRows(): CreditScoreRow[] {
  return mockUsers.slice(0, 80).map((u, i) => {
    const base = u.creditScore ?? 200 + ((i * 13) % 650);
    const history = Array.from({ length: 12 }, (_, m) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - m));
      return {
        date: d.toISOString().slice(0, 10),
        score: Math.max(0, base - 20 + ((m * 3) % 40)),
      };
    });
    return {
      userId: u._id,
      userName: u.username,
      email: u.email,
      currentScore: base,
      tier: tierFromScore(base),
      lastUpdated: new Date().toISOString(),
      history,
      factors: [
        { name: "Transactions", weight: 0.4, contribution: base * 0.4 },
        { name: "Referrals", weight: 0.35, contribution: base * 0.25 },
        { name: "Membership tenure", weight: 0.25, contribution: base * 0.2 },
      ],
    };
  });
}

let creditScoreRows = buildCreditRows();
let scoringConfig = {
  transactionWeight: 40,
  referralWeight: 35,
  membershipWeight: 25,
  tiers: [
    { name: "bronze", min: 0, max: 299 },
    { name: "silver", min: 300, max: 599 },
    { name: "gold", min: 600, max: 799 },
    { name: "platinum", min: 800, max: 1000 },
  ],
};
const creditAuditByUser: Record<
  string,
  {
    adminId: string;
    fromScore: number;
    toScore: number;
    reason: string;
    timestamp: string;
  }[]
> = {};

type MembershipTier = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  color: string;
  icon: string;
  benefits: { icon: string; label: string }[];
  cashbackRate: number;
  maxCashbackPerMonth: number;
  isActive: boolean;
  memberCount: number;
};

let membershipTiers: MembershipTier[] = [
  {
    id: "tier_basic",
    name: "Basic",
    description: "Starter cashback",
    monthlyPrice: 0,
    annualPrice: 0,
    color: "#64748b",
    icon: "star",
    benefits: [{ icon: "percent", label: "Base cashback" }],
    cashbackRate: 5,
    maxCashbackPerMonth: 5000,
    isActive: true,
    memberCount: 420,
  },
  {
    id: "tier_plus",
    name: "GoGoPass Plus",
    description: "Premium boost",
    monthlyPrice: 149,
    annualPrice: 1490,
    color: "#ec4899", // pink-500 — matches the GoGoPass Plus tag
    icon: "crown",
    benefits: [
      { icon: "bolt", label: "20% boost" },
      { icon: "wallet", label: "Higher monthly cap" },
    ],
    cashbackRate: 8,
    maxCashbackPerMonth: 200000,
    isActive: true,
    memberCount: 88,
  },
];

type UserMembership = {
  userId: string;
  userName: string;
  email: string;
  tierId: string;
  tierName: string;
  startDate: string;
  expiryDate: string;
  autoRenew: boolean;
  status: "active" | "expired" | "cancelled" | "pending" | "paused";
};

let userMemberships: UserMembership[] = mockUsers.slice(0, 35).map((u, i) => ({
  userId: u._id,
  userName: u.username,
  email: u.email,
  tierId: i % 3 === 0 ? "tier_plus" : "tier_basic",
  tierName: i % 3 === 0 ? "GoGoPass Plus" : "Basic",
  startDate: new Date(Date.now() - i * 86400000 * 4).toISOString().slice(0, 10),
  expiryDate: new Date(Date.now() + (90 - i) * 86400000)
    .toISOString()
    .slice(0, 10),
  autoRenew: i % 2 === 0,
  status: i % 11 === 0 ? "pending" : i % 13 === 0 ? "cancelled" : "active",
}));

type SubPlan = {
  id: string;
  name: string;
  billingCycle: "monthly" | "quarterly" | "annual";
  price: number;
  trialDays: number;
  gracePeriodDays: number;
  features: Record<string, boolean>;
  status: "active" | "draft" | "archived";
  subscriberCount: number;
};

let subscriptionPlans: SubPlan[] = [
  {
    id: "plan_monthly",
    name: "Monthly Premium",
    billingCycle: "monthly",
    price: 149,
    trialDays: 7,
    gracePeriodDays: 3,
    features: { cashback: true, quests: true, premiumOffers: true },
    status: "active",
    subscriberCount: 120,
  },
  {
    id: "plan_annual",
    name: "Annual Premium",
    billingCycle: "annual",
    price: 1490,
    trialDays: 14,
    gracePeriodDays: 7,
    features: { cashback: true, quests: true, premiumOffers: true },
    status: "active",
    subscriberCount: 64,
  },
];

type SubscriptionRow = {
  id: string;
  userId: string;
  userName: string;
  email: string;
  planId: string;
  planName: string;
  startDate: string;
  nextBillingDate: string;
  amount: number;
  paymentMethod: string;
  status: "active" | "trialing" | "past_due" | "cancelled" | "paused";
  autoRenew: boolean;
};

// Derive subscription records from each user's `subscriptionPlan` (the single
// source the Users table and user-info page read), so the subscription module,
// the Users table, and the per-user Benefits section all agree on who is subscribed.
let subscriptions: SubscriptionRow[] = mockUsers
  .filter((u) => u.subscriptionPlan)
  .map((u, i) => {
    const status: SubscriptionRow["status"] =
      i % 9 === 0 ? "past_due" : i % 7 === 0 ? "paused" : "active";
    const isMonthly = u.subscriptionPlan === "Monthly Premium";
    return {
      id: `sub_${u._id}`,
      userId: u._id,
      userName: u.username,
      email: u.email,
      planId: isMonthly ? "plan_monthly" : "plan_annual",
      planName: u.subscriptionPlan as string,
      startDate: new Date(Date.now() - i * 86400000 * 6)
        .toISOString()
        .slice(0, 10),
      nextBillingDate: new Date(Date.now() + 86400000 * (15 + i))
        .toISOString()
        .slice(0, 10),
      amount: isMonthly ? 149 : 1490,
      paymentMethod: i % 3 === 0 ? "card" : "promptpay",
      status,
      autoRenew: status === "active",
    };
  });

let referralConfig = {
  referrerRewardType: "fixed" as const,
  referrerRewardValue: 50,
  refereeBonus: 30,
  minTransactionAmount: 100,
  rewardExpiryDays: 90,
  maxReferralsPerUser: null as number | null,
};

type ReferralRow = {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  refereeId: string;
  refereeName: string;
  refereeEmail: string;
  date: string;
  status: "pending" | "qualified" | "paid" | "rejected";
  referrerRewardPaid: number;
  refereeRewardPaid: number;
  qualifyingTransactionId: string | null;
};

let referrals: ReferralRow[] = mockUsers.slice(0, 25).map((u, i) => {
  const ref = mockUsers[i + 1] ?? mockUsers[0];
  return {
    id: `ref_${i + 1}`,
    referrerId: u._id,
    referrerName: u.username,
    referrerEmail: u.email,
    refereeId: ref._id,
    refereeName: ref.username,
    refereeEmail: ref.email,
    date: new Date(Date.now() - i * 86400000 * 2).toISOString(),
    status:
      i % 4 === 0
        ? "pending"
        : i % 4 === 1
          ? "qualified"
          : i % 4 === 2
            ? "paid"
            : "rejected",
    referrerRewardPaid: i % 4 === 2 ? 50 : 0,
    refereeRewardPaid: i % 4 === 2 ? 30 : 0,
    qualifyingTransactionId: i % 4 === 0 ? null : `tx_${1000 + i}`,
  };
});

type MissingClaim = {
  id: string;
  userId: string;
  userName: string;
  email: string;
  phone: string;
  merchantId: string;
  merchantName: string;
  orderId: string;
  orderAmount: number;
  purchaseDate: string;
  expectedCashback: number;
  overrideCashback: number | null;
  submittedDate: string;
  remarks: string;
  status:
    | "pending"
    | "under_review"
    | "approved"
    | "rejected"
    | "info_requested";
  assignedTo: string | null;
  evidence: string[];
  notes: {
    adminId: string;
    adminName: string;
    note: string;
    timestamp: string;
  }[];
  rejectionReason: string | null;
};

let missingClaims: MissingClaim[] = Array.from({ length: 18 }, (_, i) => ({
  id: `moc_${100 + i}`,
  userId: mockUsers[i]._id,
  userName: mockUsers[i].username,
  email: mockUsers[i].email,
  phone: mockUsers[i].mobile,
  merchantId: `merch_${i}`,
  merchantName: ["GadgetHub", "StyleMart", "StayPlus"][i % 3],
  orderId: `ORD-${100000 + i * 37}`,
  orderAmount: 500 + i * 120,
  purchaseDate: new Date(Date.now() - (i + 3) * 86400000).toISOString(),
  expectedCashback: 25 + i * 5,
  overrideCashback: null,
  submittedDate: new Date(Date.now() - i * 86400000).toISOString(),
  remarks: [
    "Cashback didn't post after my purchase",
    "Order shows complete but no tracking",
    "",
  ][i % 3],
  status: ["pending", "approved", "rejected"][i % 3] as MissingClaim["status"],
  assignedTo: i % 2 === 0 ? "a1" : null,
  evidence: ["/images/merchant-logos/gadgethub-th.png"],
  notes: [],
  rejectionReason: i % 3 === 2 && i % 2 === 0 ? "Insufficient evidence" : null,
}));

type WalletRow = {
  userId: string;
  userName: string;
  email: string;
  ggcBalance: number;
  cashbackBalance: number;
  pointsBalance: number;
  status: "active" | "frozen";
  lastActivity: string;
};

let wallets: WalletRow[] = mockUsers.slice(0, 40).map((u, i) => ({
  userId: u._id,
  userName: u.username,
  email: u.email,
  ggcBalance: 100 + i * 17,
  cashbackBalance: 50 + i * 23,
  pointsBalance: 200 + i * 5,
  status: i % 15 === 0 ? "frozen" : "active",
  lastActivity: new Date(Date.now() - i * 3600000).toISOString(),
}));

const walletAdjustments: Record<
  string,
  {
    walletId: string;
    type: "credit" | "debit";
    amount: number;
    currency: string;
    reason: string;
    adminId: string;
    timestamp: string;
  }[]
> = {};

type TxRow = {
  id: string;
  userId: string;
  userName: string;
  merchantId: string;
  merchantName: string;
  amount: number;
  cashbackEarned: number;
  type: "purchase" | "refund" | "adjustment" | "transfer";
  paymentMethod: string;
  status: "completed" | "pending" | "failed" | "disputed";
  date: string;
  metadata: Record<string, unknown>;
  isFlagged: boolean;
  flagReason: string | null;
};

let transactions: TxRow[] = Array.from({ length: 60 }, (_, i) => ({
  id: `tx_${2000 + i}`,
  userId: mockUsers[i % 30]._id,
  userName: mockUsers[i % 30].username,
  merchantId: `m_${i % 5}`,
  merchantName: ["GadgetHub", "StyleMart", "StayPlus", "FoodMart", "TechWorld"][
    i % 5
  ],
  amount: 200 + i * 45,
  cashbackEarned: 10 + (i % 8) * 3,
  type: (["purchase", "refund", "adjustment", "transfer"] as const)[i % 4],
  paymentMethod: i % 2 === 0 ? "card" : "wallet",
  status: (["completed", "pending", "failed", "disputed"] as const)[
    i % 6 === 0 ? 3 : 0
  ],
  date: new Date(Date.now() - i * 7200000).toISOString(),
  metadata: { channel: "app" },
  isFlagged: i % 11 === 0,
  flagReason: i % 11 === 0 ? "User dispute" : null,
}));

type DiscoverType =
  | "hero_banner"
  | "featured_merchant"
  | "featured_category"
  | "trending_offer";

type DiscoverItem = {
  id: string;
  referenceId: string;
  displayOrder: number;
  imageUrl: string;
  title: string;
  subtitle?: string;
  ctaLink?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const discoverItems: Record<DiscoverType, DiscoverItem[]> = {
  hero_banner: [
    {
      id: "db1",
      referenceId: "hero1",
      displayOrder: 0,
      imageUrl: "/images/merchant-logos/stayplus-travel.png",
      title: "Travel week",
      subtitle: "Extra cashback",
      ctaLink: "/discover",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      isActive: true,
    },
  ],
  featured_merchant: [
    {
      id: "dm1",
      referenceId: "o1",
      displayOrder: 0,
      imageUrl: "/images/merchant-logos/gadgethub-th.png",
      title: "GadgetHub",
      ctaLink: "/brands/o1",
      startDate: "2026-04-01",
      endDate: "2026-06-30",
      isActive: true,
    },
  ],
  featured_category: [
    {
      id: "dc1",
      referenceId: "cat1",
      displayOrder: 0,
      imageUrl: "/images/merchant-logos/stylemart-id.png",
      title: "Fashion",
      startDate: "2026-04-01",
      endDate: "2026-12-31",
      isActive: true,
    },
  ],
  trending_offer: [
    {
      id: "dt1",
      referenceId: "o2",
      displayOrder: 0,
      imageUrl: "/images/merchant-logos/gadgethub-th.png",
      title: "Top offer",
      startDate: "2026-04-01",
      endDate: "2026-05-01",
      isActive: true,
    },
  ],
};

type FeaturedTerm = {
  id: string;
  keyword: string;
  targetType: "merchant" | "category" | "offer";
  targetId: string;
  targetName: string;
  displayOrder: number;
  isActive: boolean;
};

let featuredTerms: FeaturedTerm[] = [
  {
    id: "ft1",
    keyword: "hotel",
    targetType: "merchant",
    targetId: "m1",
    targetName: "StayPlus",
    displayOrder: 0,
    isActive: true,
  },
];

type BoostRule = {
  id: string;
  targetType: "merchant" | "category" | "offer";
  targetId: string;
  targetName: string;
  boostScore: number;
  isActive: boolean;
  expiryDate: string | null;
};

let boostRules: BoostRule[] = [
  {
    id: "br1",
    targetType: "offer",
    targetId: "o1",
    targetName: "GadgetHub CPS",
    boostScore: 5,
    isActive: true,
    expiryDate: "2026-12-31",
  },
];

type BlackRow = {
  id: string;
  keyword: string;
  addedBy: string;
  addedDate: string;
  notes: string;
};

let blacklist: BlackRow[] = [
  {
    id: "bl1",
    keyword: "scam",
    addedBy: "a1",
    addedDate: "2026-03-01",
    notes: "Fraud pattern",
  },
];

function filterCreditRows(
  search: string,
  tier: string,
  minS: number,
  maxS: number,
): CreditScoreRow[] {
  return creditScoreRows.filter((r) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !r.email.toLowerCase().includes(s) &&
        !r.userName.toLowerCase().includes(s)
      )
        return false;
    }
    if (tier && r.tier !== tier) return false;
    if (Number.isFinite(minS) && r.currentScore < minS) return false;
    if (Number.isFinite(maxS) && r.currentScore > maxS) return false;
    return true;
  });
}

export function tryMockAdminFeaturesRequest(
  input: AdminFeatureMockInput,
): MockApiResult | null {
  const { method, path, searchParams, body } = input;
  const m = method.toUpperCase();
  const joined = path.join("/");
  if (path[0] !== "admin") return null;

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const search = (searchParams.get("search") || "").trim();

  /* ---------- Credit scores ---------- */
  if (path[1] === "credit-scores") {
    if (m === "GET" && path[2] === "config") {
      return ok(scoringConfig);
    }
    if (m === "PUT" && path[2] === "config") {
      const b = (body || {}) as Record<string, unknown>;
      if (typeof b.transactionWeight === "number")
        scoringConfig.transactionWeight = b.transactionWeight;
      if (typeof b.referralWeight === "number")
        scoringConfig.referralWeight = b.referralWeight;
      if (typeof b.membershipWeight === "number")
        scoringConfig.membershipWeight = b.membershipWeight;
      if (Array.isArray(b.tiers)) {
        scoringConfig.tiers = b.tiers as typeof scoringConfig.tiers;
      }
      return ok({ success: true, config: scoringConfig });
    }
    if (m === "GET" && path.length === 2) {
      const tier = (searchParams.get("tier") || "").trim();
      const minS = parseInt(searchParams.get("minScore") || "", 10);
      const maxS = parseInt(searchParams.get("maxScore") || "", 10);
      const filtered = filterCreditRows(
        search,
        tier,
        Number.isNaN(minS) ? -Infinity : minS,
        Number.isNaN(maxS) ? Infinity : maxS,
      );
      return ok(paginate(filtered, page, limit));
    }
    if (m === "GET" && path[2] && path[3] === "audit") {
      const uid = path[2];
      return ok({ data: creditAuditByUser[uid] ?? [] });
    }
    if (m === "GET" && path[2] && path[2] !== "config") {
      const uid = path[2];
      const row = creditScoreRows.find((x) => x.userId === uid);
      return row ? ok(row) : jsonErr(404, { message: "User not found" });
    }
    if (m === "PUT" && path[3] === "override" && path[2]) {
      const uid = path[2];
      const b = body as {
        newScore?: number;
        reason?: string;
        adminId?: string;
      };
      const row = creditScoreRows.find((x) => x.userId === uid);
      if (!row) return jsonErr(404, { message: "Not found" });
      const from = row.currentScore;
      const to = Math.max(0, Math.min(1000, Number(b.newScore ?? from)));
      row.currentScore = to;
      row.tier = tierFromScore(to);
      row.lastUpdated = new Date().toISOString();
      const entry = {
        adminId: String(b.adminId || "admin"),
        fromScore: from,
        toScore: to,
        reason: String(b.reason || "override"),
        timestamp: new Date().toISOString(),
      };
      creditAuditByUser[uid] = [...(creditAuditByUser[uid] ?? []), entry];
      return ok({ success: true, row });
    }
    return null;
  }

  /* ---------- Membership ---------- */
  if (path[1] === "membership") {
    if (m === "GET" && path[2] === "stats") {
      const active = userMemberships.filter(
        (x) => x.status === "active",
      ).length;
      return ok({
        totalActiveMembers: active,
        revenueMtd: 482_000,
        churnRate: 2.1,
        newThisMonth: 42,
      });
    }
    if (m === "GET" && path[2] === "tiers")
      return ok({ data: membershipTiers });
    if (m === "POST" && path[2] === "tiers") {
      const b = body as MembershipTier;
      const id = `tier_${Date.now()}`;
      const t = { ...b, id, memberCount: b.memberCount ?? 0 };
      membershipTiers = [...membershipTiers, t];
      return ok(t);
    }
    if (m === "PUT" && path[2] === "tiers" && path[3]) {
      const id = path[3];
      const b = body as Partial<MembershipTier>;
      membershipTiers = membershipTiers.map((x) =>
        x.id === id ? { ...x, ...b, id } : x,
      );
      return ok(membershipTiers.find((x) => x.id === id));
    }
    if (m === "DELETE" && path[2] === "tiers" && path[3]) {
      membershipTiers = membershipTiers.filter((x) => x.id !== path[3]);
      return ok({ success: true });
    }
    if (m === "GET" && path[2] === "users") {
      let rows = [...userMemberships];
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.email.toLowerCase().includes(s) ||
            r.userName.toLowerCase().includes(s),
        );
      }
      const st = searchParams.get("status");
      if (st) {
        const allowed = st.split(",").map((s) => s.trim());
        rows = rows.filter((r) => allowed.includes(r.status));
      }
      const tid = searchParams.get("tierId");
      if (tid) rows = rows.filter((r) => r.tierId === tid);
      const ar = searchParams.get("autoRenew");
      if (ar === "true") rows = rows.filter((r) => r.autoRenew === true);
      else if (ar === "false") rows = rows.filter((r) => r.autoRenew === false);
      const sort = searchParams.get("sort");
      if (sort) rows = sortMembers(rows, sort as MemberSortKey);
      return ok(paginate(rows, page, limit));
    }
    if (m === "PUT" && path[2] === "users" && path[4] === "tier") {
      const uid = path[3];
      const b = body as { tierId?: string };
      const t = membershipTiers.find((x) => x.id === b.tierId);
      userMemberships = userMemberships.map((r) =>
        r.userId === uid && t ? { ...r, tierId: t.id, tierName: t.name } : r,
      );
      return ok({ success: true });
    }
    if (m === "PUT" && path[2] === "users" && path[4]) {
      const uid = path[3];
      const action = path[4];
      userMemberships = userMemberships.map((r) => {
        if (r.userId !== uid) return r;
        if (action === "cancel") return { ...r, status: "cancelled" as const };
        if (action === "pause") return { ...r, status: "paused" as const };
        if (action === "resume") return { ...r, status: "active" as const };
        if (action === "extend") {
          const days = Number((body as { days?: number }).days ?? 30);
          const d = new Date(r.expiryDate);
          d.setDate(d.getDate() + days);
          return { ...r, expiryDate: d.toISOString().slice(0, 10) };
        }
        return r;
      });
      return ok({ success: true });
    }
    return null;
  }

  /* ---------- Subscription ---------- */
  if (path[1] === "subscription") {
    if (m === "GET" && path[2] === "stats") {
      return ok({
        totalVolumeToday: 1_250_000,
        totalVolumeMtd: 28_400_000,
        avgTransactionValue: 1820,
        flaggedCount: transactions.filter((t) => t.isFlagged).length,
      });
    }
    if (m === "GET" && path[2] === "plans")
      return ok({ data: subscriptionPlans });
    if (m === "POST" && path[2] === "plans") {
      const b = body as SubPlan;
      const id = `plan_${Date.now()}`;
      const p = { ...b, id, subscriberCount: b.subscriberCount ?? 0 };
      subscriptionPlans = [...subscriptionPlans, p];
      return ok(p);
    }
    if (m === "PUT" && path[2] === "plans" && path[3]) {
      const id = path[3];
      const b = body as Partial<SubPlan>;
      subscriptionPlans = subscriptionPlans.map((x) =>
        x.id === id ? { ...x, ...b, id } : x,
      );
      return ok(subscriptionPlans.find((x) => x.id === id));
    }
    if (m === "DELETE" && path[2] === "plans" && path[3]) {
      subscriptionPlans = subscriptionPlans.filter((x) => x.id !== path[3]);
      return ok({ success: true });
    }
    if (m === "GET" && path[2] === "subscriptions" && !path[3]) {
      let rows = [...subscriptions];
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.userName.toLowerCase().includes(s) ||
            r.email.toLowerCase().includes(s) ||
            r.userId.includes(s),
        );
      }
      const pst = searchParams.get("status");
      if (pst) rows = rows.filter((r) => r.status === pst);
      const ppl = searchParams.get("plan");
      if (ppl === "monthly")
        rows = rows.filter((r) => r.planId === "plan_monthly");
      else if (ppl === "annual")
        rows = rows.filter((r) => r.planId === "plan_annual");
      const par = searchParams.get("autoRenew");
      if (par === "true") rows = rows.filter((r) => r.autoRenew);
      else if (par === "false") rows = rows.filter((r) => !r.autoRenew);
      return ok(paginate(rows, page, limit));
    }
    if (m === "GET" && path[2] === "subscriptions" && path[3]) {
      const sub = subscriptions.find((s) => s.id === path[3]);
      if (!sub) return jsonErr(404, { message: "Not found" });
      return ok({
        ...sub,
        billingHistory: [
          { date: sub.startDate, amount: sub.amount, status: "paid" },
          {
            date: sub.nextBillingDate,
            amount: sub.amount,
            status: "scheduled",
          },
        ],
      });
    }
    if (m === "PUT" && path[2] === "subscriptions" && path[4]) {
      const id = path[3];
      const action = path[4];
      subscriptions = subscriptions.map((s) => {
        if (s.id !== id) return s;
        if (action === "cancel") return { ...s, status: "cancelled" as const };
        if (action === "pause") return { ...s, status: "paused" as const };
        if (action === "resume") return { ...s, status: "active" as const };
        if (action === "extend") {
          const days = Number((body as { days?: number }).days ?? 30);
          const d = new Date(s.nextBillingDate);
          d.setDate(d.getDate() + days);
          return { ...s, nextBillingDate: d.toISOString().slice(0, 10) };
        }
        return s;
      });
      return ok({ success: true });
    }
    return null;
  }

  /* ---------- Referral ---------- */
  if (path[1] === "referral" && path[2] === "config") {
    if (m === "GET") return ok(referralConfig);
    if (m === "PUT") {
      referralConfig = {
        ...referralConfig,
        ...(body as object),
      } as typeof referralConfig;
      return ok(referralConfig);
    }
    return null;
  }
  if (path[1] === "referrals") {
    if (m === "GET" && path.length === 2) {
      let rows = [...referrals];
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.referrerName.toLowerCase().includes(s) ||
            r.refereeName.toLowerCase().includes(s) ||
            r.id.toLowerCase().includes(s),
        );
      }
      const st = searchParams.get("status");
      if (st) rows = rows.filter((r) => r.status === st);
      return ok(paginate(rows, page, limit));
    }
    if (m === "GET" && path[3] === "tree" && path[2]) {
      const uid = path[2];
      const children = referrals
        .filter((r) => r.referrerId === uid)
        .map((r) => ({
          userId: r.refereeId,
          name: r.refereeName,
          referrals: referrals.filter((x) => x.referrerId === r.refereeId)
            .length,
        }));
      return ok({
        userId: uid,
        direct: children,
        summary: {
          totalReferred: children.length,
          qualified: children.length,
          rewardsPaid:
            referrals.filter((r) => r.referrerId === uid && r.status === "paid")
              .length * 50,
        },
      });
    }
    if (m === "PUT" && path[3] === "approve" && path[2]) {
      const id = path[2];
      referrals = referrals.map((r) =>
        r.id === id
          ? {
              ...r,
              status: "paid" as const,
              referrerRewardPaid: 50,
              refereeRewardPaid: 30,
            }
          : r,
      );
      return ok({ success: true });
    }
    if (m === "PUT" && path[3] === "reject" && path[2]) {
      const id = path[2];
      referrals = referrals.map((r) =>
        r.id === id ? { ...r, status: "rejected" as const } : r,
      );
      return ok({ success: true });
    }
    return null;
  }

  /* ---------- Missing orders ---------- */
  if (path[1] === "missing-orders") {
    if (m === "GET" && path[2] === "stats") {
      const pending = missingClaims.filter(
        (c) => c.status === "pending",
      ).length;
      return ok({
        pendingReview: pending,
        approvedWeek: 4,
        rejectedWeek: 1,
        avgResolutionHours: 18,
      });
    }
    if (m === "GET" && path.length === 2) {
      let rows = [...missingClaims];
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.userName.toLowerCase().includes(s) ||
            r.merchantName.toLowerCase().includes(s) ||
            r.id.toLowerCase().includes(s),
        );
      }
      const st = searchParams.get("status");
      if (st) rows = rows.filter((r) => r.status === st);
      // Date-range filter on the claim's submitted date (yyyy-mm-dd compare).
      const from = searchParams.get("from");
      const to = searchParams.get("to");
      if (from) rows = rows.filter((r) => r.submittedDate.slice(0, 10) >= from);
      if (to) rows = rows.filter((r) => r.submittedDate.slice(0, 10) <= to);
      return ok(paginate(rows, page, limit));
    }
    if (m === "GET" && path[2] && path.length === 3) {
      const c = missingClaims.find((x) => x.id === path[2]);
      return c ? ok(c) : jsonErr(404, { message: "Not found" });
    }
    if (m === "PUT" && path[2] && path[3] === "approve") {
      missingClaims = missingClaims.map((c) =>
        c.id === path[2] ? { ...c, status: "approved" as const } : c,
      );
      return ok({ success: true });
    }
    if (m === "PUT" && path[2] && path[3] === "reject") {
      missingClaims = missingClaims.map((c) =>
        c.id === path[2]
          ? { ...c, status: "rejected" as const, rejectionReason: "Other" }
          : c,
      );
      return ok({ success: true });
    }
    if (m === "PUT" && path[2] && path[3] === "assign") {
      const b = body as { assignee?: string };
      missingClaims = missingClaims.map((c) =>
        c.id === path[2] ? { ...c, assignedTo: String(b.assignee ?? "a1") } : c,
      );
      return ok({ success: true });
    }
    if (m === "POST" && path[2] && path[3] === "notes") {
      const b = body as { note?: string; adminId?: string; adminName?: string };
      missingClaims = missingClaims.map((c) =>
        c.id === path[2]
          ? {
              ...c,
              notes: [
                ...c.notes,
                {
                  adminId: String(b.adminId || "a1"),
                  adminName: String(b.adminName || "Admin"),
                  note: String(b.note || ""),
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : c,
      );
      return ok({ success: true });
    }
    return null;
  }

  /* ---------- Wallet ---------- */
  if (path[1] === "wallets") {
    if (m === "GET" && path.length === 2) {
      let rows = [...wallets];
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(
          (r) =>
            r.email.includes(s) ||
            r.userName.includes(s) ||
            r.userId.includes(s),
        );
      }
      const st = searchParams.get("status");
      if (st) rows = rows.filter((r) => r.status === st);
      return ok(paginate(rows, page, limit));
    }
    if (m === "GET" && path[2] && path[3] === "adjustments") {
      return ok({ data: walletAdjustments[path[2]] ?? [] });
    }
    if (m === "GET" && path[2]) {
      const w = wallets.find((x) => x.userId === path[2]);
      if (!w) return jsonErr(404, { message: "Not found" });
      const recentTx = transactions
        .filter((t) => t.userId === path[2])
        .slice(0, 20);
      return ok({ wallet: w, recentTransactions: recentTx });
    }
    if (m === "PUT" && path[3] === "freeze" && path[2]) {
      wallets = wallets.map((w) =>
        w.userId === path[2] ? { ...w, status: "frozen" as const } : w,
      );
      return ok({ success: true });
    }
    if (m === "PUT" && path[3] === "unfreeze" && path[2]) {
      wallets = wallets.map((w) =>
        w.userId === path[2] ? { ...w, status: "active" as const } : w,
      );
      return ok({ success: true });
    }
    if (m === "POST" && path[3] === "adjust" && path[2]) {
      const b = body as {
        type?: string;
        amount?: number;
        currency?: string;
        reason?: string;
        adminId?: string;
      };
      const uid = path[2];
      const adj = {
        walletId: uid,
        type: (b.type === "debit" ? "debit" : "credit") as "credit" | "debit",
        amount: Number(b.amount ?? 0),
        currency: String(b.currency || "cashback"),
        reason: String(b.reason || ""),
        adminId: String(b.adminId || "admin"),
        timestamp: new Date().toISOString(),
      };
      walletAdjustments[uid] = [...(walletAdjustments[uid] ?? []), adj];
      const isCashbackRequest =
        adj.type === "credit" && adj.currency === "cashback";
      if (isCashbackRequest) {
        // Pending approval — the balance is credited only when a super-admin
        // approves the request (surfaced as a pending conversion).
        addManualCashbackConversion(uid, adj.amount, adj.reason);
      } else {
        wallets = wallets.map((w) => {
          if (w.userId !== uid) return w;
          const mul = adj.type === "credit" ? 1 : -1;
          if (adj.currency === "GGC")
            return { ...w, ggcBalance: w.ggcBalance + mul * adj.amount };
          if (adj.currency === "points")
            return { ...w, pointsBalance: w.pointsBalance + mul * adj.amount };
          return {
            ...w,
            cashbackBalance: w.cashbackBalance + mul * adj.amount,
          };
        });
      }
      return ok({ success: true, adjustment: adj });
    }
    if (m === "POST" && path[2] === "cashback-request" && path[3]) {
      const conversionId = Number(path[3]);
      const action =
        (body as { action?: string })?.action === "reject"
          ? "rejected"
          : "approved";
      const reason = (body as { reason?: string })?.reason;
      const result = setManualCashbackStatus(conversionId, action, reason);
      if (!result) return jsonErr(404, { message: "Request not found" });
      if (action === "approved") {
        wallets = wallets.map((w) =>
          w.userId === result.userId
            ? { ...w, cashbackBalance: w.cashbackBalance + result.amount }
            : w,
        );
      }
      return ok({ success: true, status: action, reason: reason ?? null });
    }
    return null;
  }

  /* ---------- Transactions ---------- */
  if (path[1] === "transactions") {
    if (m === "GET" && path[2] === "export") {
      const header = "id,userId,amount,status,date\n";
      const lines = transactions
        .map((t) => `${t.id},${t.userId},${t.amount},${t.status},${t.date}`)
        .join("\n");
      return ok({ csv: header + lines });
    }
    if (m === "GET" && path.length === 2) {
      let rows = [...transactions];
      if (search) {
        const s = search.toLowerCase();
        rows = rows.filter(
          (t) =>
            t.id.toLowerCase().includes(s) ||
            t.userName.toLowerCase().includes(s) ||
            t.merchantName.toLowerCase().includes(s),
        );
      }
      const tst = searchParams.get("type");
      if (tst) rows = rows.filter((t) => t.type === tst);
      const st = searchParams.get("status");
      if (st) rows = rows.filter((t) => t.status === st);
      return ok(paginate(rows, page, limit));
    }
    if (m === "GET" && path[2]) {
      const t = transactions.find((x) => x.id === path[2]);
      return t ? ok(t) : jsonErr(404, { message: "Not found" });
    }
    if (m === "PUT" && path[3] === "flag" && path[2]) {
      const b = body as { flagged?: boolean; reason?: string };
      transactions = transactions.map((t) =>
        t.id === path[2]
          ? {
              ...t,
              isFlagged: Boolean(b.flagged),
              flagReason: String(b.reason || t.flagReason),
            }
          : t,
      );
      return ok({ success: true });
    }
    return null;
  }

  /* ---------- Discover ---------- */
  if (path[1] === "discover") {
    if (m === "GET" && path[2] === "sections") {
      return ok({
        sections: (Object.keys(discoverItems) as DiscoverType[]).map(
          (type) => ({
            id: type,
            type,
            items: discoverItems[type],
          }),
        ),
      });
    }
    if (
      m === "PUT" &&
      path[2] === "sections" &&
      path[4] === "reorder" &&
      path[3]
    ) {
      const type = path[3] as DiscoverType;
      const b = body as { order?: string[] };
      const order = b.order ?? [];
      const cur = discoverItems[type] ?? [];
      const map = new Map(cur.map((i) => [i.id, i]));
      discoverItems[type] = order
        .map((id, idx) => {
          const it = map.get(id);
          return it ? { ...it, displayOrder: idx } : it;
        })
        .filter(Boolean) as DiscoverItem[];
      return ok({ success: true, items: discoverItems[type] });
    }
    if (
      m === "POST" &&
      path[2] === "sections" &&
      path[3] &&
      path[4] === "items"
    ) {
      const type = path[3] as DiscoverType;
      const b = body as Partial<DiscoverItem>;
      const item: DiscoverItem = {
        id: `di_${Date.now()}`,
        referenceId: String(b.referenceId || "ref"),
        displayOrder: (discoverItems[type] ?? []).length,
        imageUrl: String(
          b.imageUrl || "/images/merchant-logos/gadgethub-th.png",
        ),
        title: String(b.title || "Item"),
        subtitle: b.subtitle,
        ctaLink: b.ctaLink,
        startDate: String(b.startDate || "2026-04-01"),
        endDate: String(b.endDate || "2026-12-31"),
        isActive: b.isActive !== false,
      };
      discoverItems[type] = [...(discoverItems[type] ?? []), item];
      return ok(item);
    }
    if (
      m === "PUT" &&
      path[2] === "sections" &&
      path[4] === "items" &&
      path[5] &&
      path[3]
    ) {
      const type = path[3] as DiscoverType;
      const id = path[5];
      const b = body as Partial<DiscoverItem>;
      discoverItems[type] = (discoverItems[type] ?? []).map((i) =>
        i.id === id ? { ...i, ...b, id } : i,
      );
      return ok(discoverItems[type].find((i) => i.id === id));
    }
    if (
      m === "DELETE" &&
      path[2] === "sections" &&
      path[4] === "items" &&
      path[5] &&
      path[3]
    ) {
      const type = path[3] as DiscoverType;
      const id = path[5];
      discoverItems[type] = (discoverItems[type] ?? []).filter(
        (i) => i.id !== id,
      );
      return ok({ success: true });
    }
    return null;
  }

  /* ---------- Search ---------- */
  if (path[1] === "search") {
    if (m === "GET" && path[2] === "featured-terms")
      return ok({ data: featuredTerms });
    if (m === "POST" && path[2] === "featured-terms") {
      const b = body as FeaturedTerm;
      const id = `ft_${Date.now()}`;
      const row = { ...b, id, displayOrder: featuredTerms.length };
      featuredTerms = [...featuredTerms, row];
      return ok(row);
    }
    if (m === "PUT" && path[2] === "featured-terms" && path[3] === "reorder") {
      const b = body as { order?: string[] };
      const order = b.order ?? [];
      const m2 = new Map(featuredTerms.map((t) => [t.id, t]));
      featuredTerms = order
        .map((id, i) => {
          const x = m2.get(id);
          return x ? { ...x, displayOrder: i } : x;
        })
        .filter(Boolean) as FeaturedTerm[];
      return ok({ data: featuredTerms });
    }
    if (
      m === "PUT" &&
      path[2] === "featured-terms" &&
      path[3] &&
      path[3] !== "reorder"
    ) {
      const id = path[3];
      const b = body as Partial<FeaturedTerm>;
      featuredTerms = featuredTerms.map((t) =>
        t.id === id ? { ...t, ...b, id } : t,
      );
      return ok(featuredTerms.find((t) => t.id === id));
    }
    if (m === "DELETE" && path[2] === "featured-terms" && path[3]) {
      featuredTerms = featuredTerms.filter((t) => t.id !== path[3]);
      return ok({ success: true });
    }

    if (m === "GET" && path[2] === "boost-rules")
      return ok({ data: boostRules });
    if (m === "POST" && path[2] === "boost-rules") {
      const b = body as BoostRule;
      const id = `br_${Date.now()}`;
      const row = { ...b, id };
      boostRules = [...boostRules, row];
      return ok(row);
    }
    if (m === "PUT" && path[2] === "boost-rules" && path[3]) {
      const id = path[3];
      const b = body as Partial<BoostRule>;
      boostRules = boostRules.map((t) =>
        t.id === id ? { ...t, ...b, id } : t,
      );
      return ok(boostRules.find((t) => t.id === id));
    }
    if (m === "DELETE" && path[2] === "boost-rules" && path[3]) {
      boostRules = boostRules.filter((t) => t.id !== path[3]);
      return ok({ success: true });
    }

    if (m === "GET" && path[2] === "blacklist") return ok({ data: blacklist });
    if (m === "POST" && path[2] === "blacklist" && path[3] === "import") {
      const b = body as { keywords?: string[] };
      const kws = b.keywords ?? [];
      for (const kw of kws) {
        blacklist.push({
          id: `bl_${Date.now()}_${kw}`,
          keyword: kw,
          addedBy: "import",
          addedDate: new Date().toISOString().slice(0, 10),
          notes: "csv import",
        });
      }
      return ok({ success: true, count: kws.length });
    }
    if (m === "POST" && path[2] === "blacklist") {
      const b = body as BlackRow;
      const id = `bl_${Date.now()}`;
      const row = {
        id,
        keyword: String(b.keyword || ""),
        addedBy: String(b.addedBy || "a1"),
        addedDate: new Date().toISOString().slice(0, 10),
        notes: String(b.notes || ""),
      };
      blacklist = [...blacklist, row];
      return ok(row);
    }
    if (m === "DELETE" && path[2] === "blacklist" && path[3]) {
      blacklist = blacklist.filter((t) => t.id !== path[3]);
      return ok({ success: true });
    }
    return null;
  }

  return null;
}
