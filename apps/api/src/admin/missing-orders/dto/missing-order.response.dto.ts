import { normalizeMissionOrderStatus } from '../missing-order-status';
import {
  missionOrderCustomerDisplayName,
  nullableMissionOrderCustomerField,
} from '../../../offer/mission-order.contract';

import type { MissingOrderClaim } from '@gogocash/contracts';

type UnknownRecord = Record<string, any>;

// Shape shared with admin and the customer app via @gogocash/contracts (#19
// P4-1). Type-only import: the API runtime never loads the contracts package.
// (The serializer below narrows expectedCashback/overrideCashback to literal
// null today — assignable to the contract's number | null.)
export type MissingOrderClaimDto = MissingOrderClaim;

function idString(value: unknown): string {
  if (
    value &&
    typeof value === 'object' &&
    'toHexString' in value &&
    typeof (value as { toHexString?: unknown }).toHexString === 'function'
  ) {
    return (value as { toHexString(): string }).toHexString();
  }
  if (value && typeof value === 'object' && '_id' in value) {
    return idString((value as UnknownRecord)._id);
  }
  return value == null ? '' : String(value);
}

function iso(value: unknown): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function nullableIso(value: unknown): string | null {
  const valueIso = iso(value);
  return valueIso || null;
}

export function toMissingOrderClaim(row: UnknownRecord): MissingOrderClaimDto {
  const customer = row.customer_snapshot ?? {};
  const offer = row.offer_snapshot ?? {};
  const evidence = row.evidence_refs ?? row.attachments ?? [];
  const rawNotes = Array.isArray(row.notes) ? row.notes : [];

  return {
    id: idString(row._id),
    userId: idString(row.user_id),
    userName: missionOrderCustomerDisplayName(customer.name),
    email: nullableMissionOrderCustomerField(customer.email),
    phone: nullableMissionOrderCustomerField(customer.phone),
    merchantId: idString(row.offer_id),
    merchantName: String(offer.name ?? ''),
    offerSource: String(offer.source ?? ''),
    providerOfferId: Number.isFinite(Number(offer.provider_offer_id))
      ? Number(offer.provider_offer_id)
      : null,
    orderId: String(row.order_id ?? row.orderId ?? ''),
    orderAmount: Number(row.order_amount ?? row.amount ?? 0),
    currency: String(row.currency ?? 'THB'),
    purchaseDate: iso(row.purchase_date ?? row.purchaseDate),
    expectedCashback: null,
    overrideCashback: null,
    submittedDate: iso(row.createdAt ?? row.created_at),
    remarks: String(row.remarks ?? row.note ?? ''),
    status: normalizeMissionOrderStatus(row.status),
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    evidence: Array.isArray(evidence) ? evidence.map(String) : [],
    notes: rawNotes.map((note: UnknownRecord) => ({
      adminId: String(note.admin_id ?? ''),
      adminName: String(note.admin_name ?? ''),
      note: String(note.text ?? ''),
      timestamp: iso(note.created_at ?? note.createdAt),
    })),
    resolutionNote: row.resolution_note ? String(row.resolution_note) : null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    resolvedAt: nullableIso(row.resolved_at),
    schemaVersion: Number(row.schema_version ?? 1),
  };
}
