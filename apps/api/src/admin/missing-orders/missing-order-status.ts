import {
  MISSION_ORDER_STATUSES,
  MissionOrderStatus,
} from 'src/offer/schemas/missing-order.schema';

export function normalizeMissionOrderStatus(
  value: unknown,
): MissionOrderStatus {
  if (value === 'investigating') return 'under_review';
  return MISSION_ORDER_STATUSES.includes(value as MissionOrderStatus)
    ? (value as MissionOrderStatus)
    : 'pending';
}
