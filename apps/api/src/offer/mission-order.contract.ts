import { createHash } from 'node:crypto';

type Row = Record<string, any>;

export const MISSING_ORDER_EVIDENCE_UNAVAILABLE_MESSAGE =
  'Secure evidence uploads are temporarily unavailable. Submit this claim without attachments.';

export type MissionOrderCustomerSnapshotValue = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

function nullableTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

export function buildMissionOrderCustomerSnapshot(
  user: Row,
): MissionOrderCustomerSnapshotValue {
  return {
    name: nullableTrimmedString(user.username ?? user.name ?? user.full_name),
    email: nullableTrimmedString(user.email),
    phone: nullableTrimmedString(user.mobile ?? user.phone),
  };
}

export function missionOrderCustomerDisplayName(value: unknown): string {
  return nullableTrimmedString(value) ?? 'Customer';
}

export function nullableMissionOrderCustomerField(
  value: unknown,
): string | null {
  return nullableTrimmedString(value);
}

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
    return idString((value as Row)._id);
  }
  return value == null ? '' : String(value).trim();
}

function iso(value: unknown): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

/** Cross-collection business identity; never uses a provider numeric offer id. */
export function buildMissionOrderDedupeKey(
  userId: unknown,
  canonicalOfferId: unknown,
  orderId: unknown,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        idString(userId).toLowerCase(),
        idString(canonicalOfferId).toLowerCase(),
        idString(orderId),
      ]),
    )
    .digest('hex');
}

export type CustomerMissionOrderClaim = {
  id: string;
  merchantName: string;
  orderId: string;
  orderAmount: number;
  currency: string;
  purchaseDate: string;
  remarks: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  submittedDate: string;
  resolvedAt: string | null;
};

export function toCustomerMissionOrderClaim(
  row: Row,
): CustomerMissionOrderClaim {
  const status =
    row.status === 'investigating' ? 'under_review' : String(row.status ?? '');
  const normalizedStatus = (
    ['pending', 'under_review', 'approved', 'rejected'] as const
  ).includes(status as CustomerMissionOrderClaim['status'])
    ? (status as CustomerMissionOrderClaim['status'])
    : 'pending';
  const resolvedAt = iso(row.resolved_at);

  return {
    id: idString(row._id),
    merchantName: String(row.offer_snapshot?.name ?? ''),
    orderId: String(row.order_id ?? row.orderId ?? ''),
    orderAmount: Number(row.order_amount ?? row.amount ?? 0),
    currency: String(row.currency ?? 'THB'),
    purchaseDate: iso(row.purchase_date ?? row.purchaseDate),
    remarks: String(row.remarks ?? row.note ?? ''),
    status: normalizedStatus,
    submittedDate: iso(row.createdAt ?? row.created_at),
    resolvedAt: resolvedAt || null,
  };
}
