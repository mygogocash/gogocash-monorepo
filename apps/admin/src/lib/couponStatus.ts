import type { CouponData } from "@/types/coupon";

export type CouponTableStatus = "Inactive" | "Scheduled" | "Ran out" | "Active";

function ymdToday(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normYmd(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(t);
  return m ? m[1] : null;
}

export function isCouponScheduled(
  coupon: Pick<CouponData, "start_date">,
  now: Date = new Date(),
): boolean {
  const start = normYmd(coupon.start_date);
  return Boolean(start && ymdToday(now).localeCompare(start) < 0);
}

function isCouponStarted(
  coupon: Pick<CouponData, "start_date">,
  now: Date = new Date(),
): boolean {
  const start = normYmd(coupon.start_date);
  if (!start) return true;
  return ymdToday(now).localeCompare(start) >= 0;
}

function isCouponBeforeEnd(
  coupon: Pick<CouponData, "end_date" | "end_time">,
  now: Date = new Date(),
): boolean {
  const endYmd = normYmd(coupon.end_date);
  if (!endYmd) return true;

  const today = ymdToday(now);
  const dayCmp = today.localeCompare(endYmd);
  if (dayCmp < 0) return true;
  if (dayCmp > 0) return false;

  const endTime = String(coupon.end_time ?? "").trim();
  if (!endTime) return true;

  const [eh, em] = endTime.split(":").map(Number);
  if (!Number.isFinite(eh) || !Number.isFinite(em)) return true;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const endMinutes = eh * 60 + em;
  return nowMinutes <= endMinutes;
}

function isCouponLimited(
  coupon: Pick<CouponData, "quantity" | "unlimited_amount_enabled">,
): boolean {
  if (coupon.unlimited_amount_enabled === true) return false;
  return (coupon.quantity ?? 0) > 0;
}

export function isCouponRanOut(
  coupon: Pick<
    CouponData,
    | "quantity"
    | "quantity_used"
    | "unlimited_amount_enabled"
    | "start_date"
    | "end_date"
    | "end_time"
  >,
  now: Date = new Date(),
): boolean {
  if (!isCouponStarted(coupon, now)) return false;
  if (!isCouponBeforeEnd(coupon, now)) return false;
  if (!isCouponLimited(coupon)) return false;

  const total = coupon.quantity ?? 0;
  const used = coupon.quantity_used ?? 0;
  return total > 0 && used >= total;
}

/** One status badge — highest priority: Inactive → Scheduled → Ran out → Active. */
export function getCouponTableStatus(
  coupon: Pick<
    CouponData,
    | "disabled"
    | "start_date"
    | "end_date"
    | "end_time"
    | "quantity"
    | "quantity_used"
    | "unlimited_amount_enabled"
  >,
  now: Date = new Date(),
): { label: CouponTableStatus; badgeClass: string } {
  if (coupon.disabled) {
    return {
      label: "Inactive",
      badgeClass:
        "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    };
  }

  if (isCouponScheduled(coupon, now)) {
    return {
      label: "Scheduled",
      badgeClass:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    };
  }

  if (isCouponRanOut(coupon, now)) {
    return {
      label: "Ran out",
      badgeClass:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
    };
  }

  return {
    label: "Active",
    badgeClass:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200",
  };
}

export function formatCouponDiscount(
  coupon: Pick<CouponData, "discount" | "discount_type" | "discount_currency">,
): string {
  if (!coupon.discount_type) return "Discount type unknown";
  if (coupon.discount_type === "cash") {
    return coupon.discount_currency
      ? `${coupon.discount} ${coupon.discount_currency}`
      : `${coupon.discount} (currency unknown)`;
  }
  return `${coupon.discount}%`;
}

export function formatCouponCodeLabel(
  coupon: Pick<CouponData, "code" | "code_enabled">,
): string {
  const hasCode =
    coupon.code_enabled ?? Boolean(String(coupon.code ?? "").trim());
  return hasCode ? "code" : "no code";
}

export function formatCouponAudienceLabel(
  coupon: Pick<CouponData, "eligibility">,
): string {
  const raw = String(coupon.eligibility ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (raw === "new_users") return "For new users";
  return "For all";
}

function formatAmountWithCurrency(
  amount: string | number | undefined,
  currency: string | undefined,
): string | null {
  const trimmed = String(amount ?? "").trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  const value = Number.isFinite(n) ? n.toLocaleString() : trimmed;
  return currency ? `${value} ${currency}` : `${value} (currency unknown)`;
}

export function formatCouponMinSpendLabel(
  coupon: Pick<
    CouponData,
    "min_spend" | "min_spend_enabled" | "min_spend_currency"
  >,
): string {
  const enabled =
    coupon.min_spend_enabled ?? Boolean(String(coupon.min_spend ?? "").trim());
  if (!enabled) return "No min spend";
  const formatted = formatAmountWithCurrency(
    coupon.min_spend,
    coupon.min_spend_currency,
  );
  return formatted ? `Min spend ${formatted}` : "No min spend";
}

export function formatCouponMaxCapLabel(
  coupon: Pick<CouponData, "max_cap" | "max_cap_enabled" | "max_cap_currency">,
): string {
  if (coupon.max_cap_enabled === undefined) return "Max cap unknown";
  const enabled = coupon.max_cap_enabled;
  if (!enabled) return "No max cap";
  const formatted = formatAmountWithCurrency(
    coupon.max_cap,
    coupon.max_cap_currency,
  );
  return formatted ? `Max cap ${formatted}` : "No max cap";
}
