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

  return {
    code: optionalText(row.code),
    description: optionalText(row.description),
    discount: optionalNumber(row.discount),
    endDate: optionalText(row.end_date),
    id,
    link: optionalText(row.link),
    minimumSpend: optionalText(row.min_spend),
    name,
    startDate: optionalText(row.start_date),
  };
}

export function mapPublicShopCoupons(payload: unknown): ShopCoupon[] {
  return couponRows(payload)
    .map(mapCouponRow)
    .filter((coupon): coupon is ShopCoupon => coupon !== null);
}
