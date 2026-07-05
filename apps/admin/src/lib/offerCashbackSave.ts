import type { OfferRequestForm } from "@/types/api";
import { serializeOfferProductTypes } from "@/lib/productTypeDraft";

export type CashbackPatchFields = Pick<
  OfferRequestForm,
  "commission_store" | "max_cap" | "all_product_types" | "product_types"
>;

/** Multipart fields for PATCH /admin/update-offer cashback economics. */
export function appendCashbackPatchFields(
  fd: FormData,
  fields: CashbackPatchFields,
): void {
  if (
    fields.commission_store != null &&
    Number.isFinite(fields.commission_store)
  ) {
    fd.append("commission_store", String(fields.commission_store));
  }
  if (fields.max_cap != null && Number.isFinite(fields.max_cap)) {
    fd.append("max_cap", String(fields.max_cap));
  }
  fd.append("all_product_types", String(fields.all_product_types));
  fd.append(
    "product_types",
    JSON.stringify(serializeOfferProductTypes(fields.product_types ?? [])),
  );
}
