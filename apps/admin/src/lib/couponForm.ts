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
  min_spend_currency: "",
  max_cap: "",
  max_cap_enabled: undefined,
  max_cap_currency: "",
  discount: 0,
  discount_type: undefined,
  discount_currency: "",
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
    one_time_use_enabled: list.one_time_use_enabled,
    usage_per_user:
      list.usage_per_user != null ? String(list.usage_per_user) : "",
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
    min_spend_currency: list.min_spend_currency ?? "",
    max_cap: list.max_cap != null ? String(list.max_cap) : "",
    max_cap_enabled: list.max_cap_enabled,
    max_cap_currency: list.max_cap_currency ?? "",
    discount: list.discount,
    discount_type: list.discount_type,
    discount_currency: list.discount_currency ?? "",
    id: list._id,
    link: list.link,
    terms_and_conditions: list.terms_and_conditions,
  };
}
