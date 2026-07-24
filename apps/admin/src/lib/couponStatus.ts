import type { CouponData } from "@/types/coupon";

export type CouponTableStatus = "Pause" | "Run out" | "Expired" | "Active";

const BANGKOK_UTC_OFFSET_HOURS = 7;

function normYmd(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(t);
  return m ? m[1] : null;
}

function normTime(
  raw: string | null | undefined,
): { hours: number; minutes: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(raw ?? "").trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function couponBangkokBoundary(
  dateRaw: string | null | undefined,
  timeRaw: string | null | undefined,
  endOfDay: boolean,
): number | null {
  const ymd = normYmd(dateRaw);
  if (!ymd) return null;
  const [year, month, day] = ymd.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return null;
  }

  const time = normTime(timeRaw);
  const hours = time?.hours ?? (endOfDay ? 23 : 0);
  const minutes = time?.minutes ?? (endOfDay ? 59 : 0);
  return Date.UTC(
    year,
    month - 1,
    day,
    hours - BANGKOK_UTC_OFFSET_HOURS,
    minutes,
    endOfDay && !time ? 59 : 0,
    endOfDay && !time ? 999 : 0,
  );
}

function isCouponStarted(
  coupon: Pick<CouponData, "start_date" | "start_time">,
  now: Date = new Date(),
): boolean {
  const start = couponBangkokBoundary(
    coupon.start_date,
    coupon.start_time,
    false,
  );
  return start === null || now.getTime() >= start;
}

export function isCouponExpired(
  coupon: Pick<CouponData, "end_date" | "end_time">,
  now: Date = new Date(),
): boolean {
  const end = couponBangkokBoundary(coupon.end_date, coupon.end_time, true);
  return end !== null && now.getTime() > end;
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
    "quantity" | "quantity_used" | "unlimited_amount_enabled"
  >,
): boolean {
  if (!isCouponLimited(coupon)) return false;

  const total = coupon.quantity ?? 0;
  const used = coupon.quantity_used ?? 0;
  return total > 0 && used >= total;
}

/** One admin status badge — highest priority: Pause → Run out → Expired → Active. */
export function getCouponTableStatus(
  coupon: Pick<
    CouponData,
    | "disabled"
    | "start_date"
    | "start_time"
    | "end_date"
    | "end_time"
    | "quantity"
    | "quantity_used"
    | "unlimited_amount_enabled"
  >,
  now: Date = new Date(),
): { label: CouponTableStatus; badgeClass: string } {
  if (coupon.disabled || !isCouponStarted(coupon, now)) {
    return {
      label: "Pause",
      badgeClass:
        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    };
  }

  if (isCouponRanOut(coupon)) {
    return {
      label: "Run out",
      badgeClass:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
    };
  }

  if (isCouponExpired(coupon, now)) {
    return {
      label: "Expired",
      badgeClass:
        "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
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
