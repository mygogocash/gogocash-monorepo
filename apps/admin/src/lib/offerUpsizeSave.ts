import type { OfferRequestForm } from "@/types/api";
import { serializeOfferProductTypes } from "@/lib/productTypeDraft";

export type UpsizePatchFields = Pick<
  OfferRequestForm,
  | "upsize_start_date"
  | "upsize_end_date"
  | "upsize_start_time"
  | "upsize_end_time"
  | "upsize_all_product_types"
  | "upsize_special_commission"
  | "upsize_max_cap"
  | "upsize_product_types"
>;

/** Multipart fields for PATCH /admin/update-offer upsize event (#471). */
export function appendUpsizePatchFields(
  fd: FormData,
  fields: UpsizePatchFields,
): void {
  fd.append("upsize_start_date", fields.upsize_start_date ?? "");
  fd.append("upsize_end_date", fields.upsize_end_date ?? "");
  fd.append("upsize_start_time", fields.upsize_start_time ?? "");
  fd.append("upsize_end_time", fields.upsize_end_time ?? "");
  fd.append(
    "upsize_all_product_types",
    String(fields.upsize_all_product_types ?? true),
  );
  fd.append(
    "upsize_special_commission",
    fields.upsize_special_commission == null
      ? ""
      : String(fields.upsize_special_commission),
  );
  fd.append(
    "upsize_max_cap",
    fields.upsize_max_cap == null ? "" : String(fields.upsize_max_cap),
  );
  fd.append(
    "upsize_product_types",
    JSON.stringify(
      serializeOfferProductTypes(fields.upsize_product_types ?? []),
    ),
  );
}
