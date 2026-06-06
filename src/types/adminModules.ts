/** Shared admin platform module types (mock-backed until real APIs ship). */

export type CreditTier = "bronze" | "silver" | "gold" | "platinum";

export interface CreditScore {
  userId: string;
  userName: string;
  email: string;
  currentScore: number;
  tier: CreditTier;
  lastUpdated: string;
  history: { date: string; score: number }[];
  factors: { name: string; weight: number; contribution: number }[];
}

export interface CreditScoreOverridePayload {
  newScore: number;
  reason: string;
  adminId: string;
}

export interface ScoringConfig {
  transactionWeight: number;
  referralWeight: number;
  membershipWeight: number;
  tiers: { name: string; min: number; max: number }[];
}

export interface MembershipTier {
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
}

export interface UserMembership {
  userId: string;
  userName: string;
  email: string;
  tierId: string;
  tierName: string;
  startDate: string;
  expiryDate: string;
  autoRenew: boolean;
  status: "active" | "expired" | "cancelled" | "pending" | "paused";
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  billingCycle: "monthly" | "quarterly" | "annual";
  price: number;
  trialDays: number;
  gracePeriodDays: number;
  features: Record<string, boolean>;
  status: "active" | "draft" | "archived";
  subscriberCount: number;
}

export interface Subscription {
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
}

export interface ReferralConfig {
  referrerRewardType: "fixed" | "percentage";
  referrerRewardValue: number;
  refereeBonus: number;
  minTransactionAmount: number;
  rewardExpiryDays: number;
  maxReferralsPerUser: number | null;
}

export interface Referral {
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
}

export interface MissingOrderClaim {
  id: string;
  userId: string;
  userName: string;
  merchantId: string;
  merchantName: string;
  orderAmount: number;
  expectedCashback: number;
  overrideCashback: number | null;
  submittedDate: string;
  status: "pending" | "under_review" | "approved" | "rejected" | "info_requested";
  assignedTo: string | null;
  evidence: string[];
  notes: { adminId: string; adminName: string; note: string; timestamp: string }[];
  rejectionReason: string | null;
}

export interface UserWallet {
  userId: string;
  userName: string;
  email: string;
  ggcBalance: number;
  cashbackBalance: number;
  pointsBalance: number;
  status: "active" | "frozen";
  lastActivity: string;
}

export interface WalletAdjustment {
  walletId: string;
  type: "credit" | "debit";
  amount: number;
  currency: "GGC" | "cashback" | "points";
  reason: string;
  adminId: string;
  timestamp: string;
}

export interface Transaction {
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
}

export type DiscoverSectionType =
  | "hero_banner"
  | "featured_merchant"
  | "featured_category"
  | "trending_offer";

export interface DiscoverItem {
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
}

export interface FeaturedSearchTerm {
  id: string;
  keyword: string;
  targetType: "merchant" | "category" | "offer";
  targetId: string;
  targetName: string;
  displayOrder: number;
  isActive: boolean;
}

export interface BoostRule {
  id: string;
  targetType: "merchant" | "category" | "offer";
  targetId: string;
  targetName: string;
  boostScore: number;
  isActive: boolean;
  expiryDate: string | null;
}

export interface BlacklistKeyword {
  id: string;
  keyword: string;
  addedBy: string;
  addedDate: string;
  notes: string;
}

export type Paginated<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
