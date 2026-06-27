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
    link: form.link ?? "",
    disabled: Boolean(form.disabled),
  };

  if (form.id) {
    payload.id = form.id;
  }

  return payload;
}
