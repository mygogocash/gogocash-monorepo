/**
 * Missing Conversions (missing-order claim) contract shared by the API
 * response DTO, the admin table, and the customer app (issue #19, P4-1).
 *
 * The API's serializer may narrow fields (e.g. it currently always emits
 * `expectedCashback: null`) — literal narrowing is assignable to this shape.
 */
export const MISSING_ORDER_STATUSES = [
  "pending",
  "under_review",
  "approved",
  "rejected",
] as const;

export type MissingOrderStatus = (typeof MISSING_ORDER_STATUSES)[number];

export interface MissingOrderNote {
  adminId: string;
  adminName: string;
  note: string;
  timestamp: string;
}

export interface MissingOrderClaim {
  id: string;
  userId: string;
  userName: string;
  email: string | null;
  phone: string | null;
  merchantId: string;
  merchantName: string;
  offerSource: string;
  providerOfferId: number | null;
  orderId: string;
  orderAmount: number;
  currency: string;
  purchaseDate: string;
  expectedCashback: number | null;
  overrideCashback: number | null;
  submittedDate: string;
  remarks: string;
  status: MissingOrderStatus;
  assignedTo: string | null;
  evidence: string[];
  notes: MissingOrderNote[];
  resolutionNote: string | null;
  rejectionReason: string | null;
  resolvedAt: string | null;
  schemaVersion: number;
}
