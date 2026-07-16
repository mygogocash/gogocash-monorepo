import { toDateInputValue } from "@/lib/dateFormat";
import type { CouponData, CouponRequestForm } from "@/types/coupon";

export const COUPON_FORM_DEFAULTS: CouponRequestForm = {
  name: "",
  description: "",
  code: "",
  code_enabled: false,
  one_time_use_enabled: true,
  usage_per_user: "",
  unlimited_amount_enabled: true,
  available_code_amount: "",
  offer_id: "",
  start_date: "",
  end_date: "",
  eligibility: "",
  min_spend: "",
  min_spend_enabled: false,
  min_spend_currency: "THB",
  max_cap: "",
  max_cap_enabled: false,
  max_cap_currency: "THB",
  discount: 0,
  discount_type: "percent",
  discount_currency: "THB",
  start_time: "",
  end_time: "",
  terms_and_conditions: "",
};

export function couponDataToForm(list: CouponData): CouponRequestForm {
  return {
    name: list.name,
    description: list.description,
    code: list.code,
    code_enabled: list.code_enabled ?? Boolean(list.code?.trim()),
    one_time_use_enabled:
      list.one_time_use_enabled ??
      (list.usage_per_user == null || Number(list.usage_per_user) <= 1),
    usage_per_user:
      list.usage_per_user != null && Number(list.usage_per_user) > 1
        ? String(list.usage_per_user)
        : "",
    unlimited_amount_enabled:
      list.unlimited_amount_enabled ??
      (list.quantity == null || list.quantity === 0),
    available_code_amount:
      list.quantity != null && list.quantity > 0 ? String(list.quantity) : "",
    quantity: list.quantity ?? 0,
    offer_id: list.offer_id?._id ?? "",
    start_date: toDateInputValue(list.start_date),
    end_date: toDateInputValue(list.end_date),
    start_time: list.start_time ?? "",
    end_time: list.end_time ?? "",
    eligibility: list.eligibility,
    min_spend: list.min_spend,
    min_spend_enabled: Boolean(list.min_spend?.trim()),
    min_spend_currency: list.min_spend_currency ?? "THB",
    max_cap: list.max_cap != null ? String(list.max_cap) : "",
    max_cap_enabled:
      list.max_cap_enabled ?? Boolean(String(list.max_cap ?? "").trim()),
    max_cap_currency: list.max_cap_currency ?? "THB",
    discount: list.discount,
    discount_type: list.discount_type ?? "percent",
    discount_currency: list.discount_currency ?? "THB",
    id: list._id,
    link: list.link,
    terms_and_conditions: list.terms_and_conditions ?? "",
  };
}
