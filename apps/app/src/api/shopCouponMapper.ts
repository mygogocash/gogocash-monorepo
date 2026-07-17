import type { ShopCoupon } from "@mobile/api/shopCouponTypes";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim() || null;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.trim().toLowerCase() === "true") return true;
    if (value.trim().toLowerCase() === "false") return false;
  }
  return null;
}

function couponDiscountType(value: unknown): "percent" | "cash" | null {
  return value === "cash" || value === "percent" ? value : null;
}

function verifiedHttpUrl(value: unknown): string | null {
  const text = optionalText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    const hasSafeProtocol =
      url.protocol === "https:" || url.protocol === "http:";
    return hasSafeProtocol && !url.username && !url.password ? text : null;
  } catch {
    return null;
  }
}

function couponRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  return Array.isArray(record?.data) ? record.data : [];
}

function mapCouponRow(value: unknown): ShopCoupon | null {
  const row = asRecord(value);
  const id = optionalText(row?._id ?? row?.id);
  const name = optionalText(row?.name);
  if (!row || !id || !name) return null;

  const code = optionalText(row.code);
  const discountType = couponDiscountType(row.discount_type);
  const minimumSpend = optionalText(row.min_spend);
  const usagePerUser = optionalNumber(row.usage_per_user);
  const maxCap = optionalNumber(row.max_cap);
  const maxCapEnabled = optionalBoolean(row.max_cap_enabled);
  return {
    code,
    codeEnabled: optionalBoolean(row.code_enabled) ?? Boolean(code),
    description: optionalText(row.description),
    destinationUrl: verifiedHttpUrl(row.destination_url),
    discount: optionalNumber(row.discount),
    discountCurrency:
      discountType === "cash" ? optionalText(row.discount_currency) : null,
    discountType,
    endDate: optionalText(row.end_date),
    endTime: optionalText(row.end_time),
    eligibility: optionalText(row.eligibility),
    id,
    link: optionalText(row.link),
    maxCap: maxCapEnabled === true ? maxCap : null,
    maxCapCurrency:
      maxCapEnabled === true ? optionalText(row.max_cap_currency) : null,
    minimumSpend,
    minimumSpendCurrency: minimumSpend
      ? optionalText(row.min_spend_currency)
      : null,
    name,
    oneTimeUse: optionalBoolean(row.one_time_use_enabled),
    remainingQuantity: optionalNumber(row.remaining_quantity),
    startDate: optionalText(row.start_date),
    startTime: optionalText(row.start_time),
    termsAndConditions: optionalText(row.terms_and_conditions),
    usagePerUser,
  };
}

export function mapPublicShopCoupons(payload: unknown): ShopCoupon[] {
  return couponRows(payload)
    .map(mapCouponRow)
    .filter((coupon): coupon is ShopCoupon => coupon !== null);
}
