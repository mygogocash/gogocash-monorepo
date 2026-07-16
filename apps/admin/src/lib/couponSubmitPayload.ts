import type { CouponRequestForm } from "@/types/coupon";

export type CouponSubmitPayload = {
  name: string;
  description: string;
  code: string;
  offer_id: string;
  start_date: string;
  end_date: string;
  eligibility: string;
  min_spend: string;
  discount: number;
  quantity: number;
  link: string;
  disabled: boolean;
  code_enabled: boolean;
  one_time_use_enabled: boolean;
  usage_per_user: number;
  unlimited_amount_enabled: boolean;
  max_cap_enabled: boolean;
  max_cap?: number;
  max_cap_currency: string;
  min_spend_currency: string;
  discount_type: "percent" | "cash";
  discount_currency: string;
  start_time: string;
  end_time: string;
  terms_and_conditions: string;
  id?: string;
};

/** JSON body for POST /offer/update-coupon (no file fields — must not use FormData). */
export function buildCouponSubmitPayload(
  form: CouponRequestForm,
  options: { discount: number; quantity: number },
): CouponSubmitPayload {
  const payload: CouponSubmitPayload = {
    name: form.name,
    description: form.description ?? "",
    code: form.code_enabled ? form.code : "",
    offer_id: form.offer_id,
    start_date: form.start_date,
    end_date: form.end_date,
    eligibility: form.eligibility ?? "",
    min_spend: form.min_spend_enabled ? form.min_spend : "",
    discount: options.discount,
    quantity: options.quantity,
    // Coupons open within their selected brand detail; legacy external URLs
    // are intentionally cleared on both create and edit (#314).
    link: "",
    disabled: Boolean(form.disabled),
    code_enabled: Boolean(form.code_enabled),
    one_time_use_enabled: Boolean(form.one_time_use_enabled),
    usage_per_user: form.one_time_use_enabled ? 1 : Number(form.usage_per_user),
    unlimited_amount_enabled: Boolean(form.unlimited_amount_enabled),
    max_cap_enabled: Boolean(form.max_cap_enabled),
    max_cap_currency: form.max_cap_currency || "THB",
    min_spend_currency: form.min_spend_currency || "THB",
    discount_type: form.discount_type ?? "percent",
    discount_currency: form.discount_currency || "THB",
    start_time: form.start_time?.trim() ?? "",
    end_time: form.end_time?.trim() ?? "",
    terms_and_conditions: form.terms_and_conditions?.trim() ?? "",
  };

  if (form.max_cap_enabled) {
    payload.max_cap = Number(form.max_cap);
  }

  if (form.id) {
    payload.id = form.id;
  }

  return payload;
}
