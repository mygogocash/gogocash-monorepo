import type { MissingOrderClaim } from "@gogocash/contracts";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";
import { ApiError } from "@mobile/api/client";

export const MISSING_ORDER_EVIDENCE_UNAVAILABLE_MESSAGE =
  "Secure evidence uploads are temporarily unavailable. Submit this claim without attachments.";

export type MissingOrderSubmission = {
  amount: string;
  apiUrl: string;
  files: readonly { name: string; uri: string }[];
  note: string;
  offerId: string;
  orderId: string;
  purchaseDate: string;
};

// Customer-visible subset of the canonical claim contract (#19 P4-1): derived
// via Pick so the fields cannot drift from @gogocash/contracts.
export type CustomerMissingOrderClaim = Pick<
  MissingOrderClaim,
  | "id"
  | "merchantName"
  | "orderId"
  | "orderAmount"
  | "currency"
  | "purchaseDate"
  | "remarks"
  | "status"
  | "submittedDate"
  | "resolvedAt"
>;

export type CustomerMissingOrderPage = {
  data: CustomerMissingOrderClaim[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type MissingOrderListRequest = {
  apiUrl: string;
  page?: number;
  limit?: number;
  search?: string;
};

const MISSING_ORDER_STATUS_LABELS: Record<
  CustomerMissingOrderClaim["status"],
  string
> = {
  pending: "Pending",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

export function formatMissingOrderStatus(
  status: CustomerMissingOrderClaim["status"],
): string {
  return MISSING_ORDER_STATUS_LABELS[status];
}

export async function submitMissingOrder(
  payload: MissingOrderSubmission,
): Promise<unknown> {
  if (payload.files.length > 0) {
    throw new ApiError(MISSING_ORDER_EVIDENCE_UNAVAILABLE_MESSAGE, 503);
  }
  const client = await getSharedMobileApiClient(payload.apiUrl);
  if (!client) {
    throw new Error("No mobile session store is available.");
  }

  const formData = new FormData();
  formData.append("offer_id", payload.offerId);
  formData.append("orderId", payload.orderId);
  formData.append("purchaseDate", payload.purchaseDate);
  formData.append("note", payload.note);
  formData.append("amount", payload.amount);

  return client.postFormData("/offer/saveMissingOrder", formData);
}

export function mapBrandCatalogToMissingOrderShops(
  brands: readonly { id: string; name: string }[],
): { id: string; label: string }[] {
  const shops = brands.map((brand) => ({ id: brand.id, label: brand.name }));
  return [...shops, { id: "other", label: "Other (enter brand name)" }];
}

export async function listMissingOrders(
  request: MissingOrderListRequest,
): Promise<CustomerMissingOrderPage> {
  const client = await getSharedMobileApiClient(request.apiUrl);
  if (!client) {
    throw new Error("No mobile session store is available.");
  }

  return client.post<CustomerMissingOrderPage>("/offer/missing-order", {
    page: request.page ?? 1,
    limit: request.limit ?? 10,
    search: request.search ?? "",
  });
}

export function formatMissingOrderApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.status > 0
      ? `HTTP ${error.status}: ${error.message}`
      : error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Could not submit the missing conversion.";
}
