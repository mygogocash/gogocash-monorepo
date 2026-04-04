import type { ReferralListCategory, ResponseReferralList } from "@/interfaces/referral";

export type ReferralInviteTab = "all" | "account" | "shop";

const ACCOUNT_HAY_RE =
  /account|signup|sign_?up|register|created|join|verify|email|profile|welcome/i;

const SHOP_HAY_RE = /shop|purchase|order|transaction|cashback|spent|buy|sale|merchant|checkout/i;

function haystack(row: ResponseReferralList): string {
  return `${row.type ?? ""} ${row.action ?? ""}`.toLowerCase();
}

/**
 * When `referral_category` is absent, infer from `type` + `action` (legacy behavior).
 */
export function inferReferralCategoryFromHeuristics(
  row: ResponseReferralList
): ReferralListCategory | null {
  const hay = haystack(row);
  if (ACCOUNT_HAY_RE.test(hay)) return "account";
  if (SHOP_HAY_RE.test(hay)) return "shop";
  return null;
}

/**
 * Resolve tab bucket for a row: prefer API `referral_category`, else heuristics.
 */
export function resolveReferralRowCategory(row: ResponseReferralList): ReferralListCategory | null {
  const c = row.referral_category;
  if (c === "account" || c === "shop") return c;
  return inferReferralCategoryFromHeuristics(row);
}

/**
 * Whether a row should appear under the given invitation tab filter.
 */
export function referralRowMatchesTab(row: ResponseReferralList, tab: ReferralInviteTab): boolean {
  if (tab === "all") return true;

  const c = row.referral_category;
  if (c === "account" || c === "shop") {
    return tab === c;
  }

  const hay = haystack(row);
  if (tab === "account") {
    return ACCOUNT_HAY_RE.test(hay);
  }
  return SHOP_HAY_RE.test(hay);
}
