import { Types } from 'mongoose';

export type MyCashbackWithdrawSnapshot = {
  availableTHB: number;
  availableUSD: number;
  conversionIdMyCashback: Array<Types.ObjectId | string>;
};

export function resolveAutoMyCashbackWithdrawAmount(
  currency: string | undefined,
  amountTotal: number | undefined,
  snapshot: Pick<MyCashbackWithdrawSnapshot, 'availableTHB' | 'availableUSD'>,
): number {
  const available =
    currency === 'THB' ? snapshot.availableTHB : snapshot.availableUSD;

  if (!Number.isFinite(available) || available <= 0) {
    return 0;
  }

  if (typeof amountTotal === 'number' && Number.isFinite(amountTotal) && amountTotal > 0) {
    return Math.min(amountTotal, available);
  }

  return available;
}

export function resolveAutoMyCashbackWithdrawIds(
  snapshot: Pick<MyCashbackWithdrawSnapshot, 'conversionIdMyCashback'>,
): Types.ObjectId[] {
  return (snapshot.conversionIdMyCashback ?? []).map(
    (id) => new Types.ObjectId(id),
  );
}

export function buildAutoMyCashbackWithdrawFields(
  createWithdrawDto: {
    address?: string;
    account_name?: string;
    bank_name?: string;
    account_number?: string;
    tx_hash?: string;
    method?: string;
    currency?: string;
    amount_total?: number;
    rate?: number;
  },
  userId: Types.ObjectId,
  snapshot: MyCashbackWithdrawSnapshot,
) {
  const amount = resolveAutoMyCashbackWithdrawAmount(
    createWithdrawDto.currency,
    createWithdrawDto.amount_total,
    snapshot,
  );

  if (amount <= 0) {
    return null;
  }

  return {
    user_id: userId,
    status: 'pending' as const,
    address: createWithdrawDto.address || '',
    account_name: createWithdrawDto.account_name || '',
    bank_name: createWithdrawDto.bank_name || '',
    account_number: createWithdrawDto.account_number || '',
    tx_hash: createWithdrawDto.tx_hash || '',
    tx_hash_record: '',
    percent_fee: 0,
    amount_total: amount,
    amount_net: amount,
    method: createWithdrawDto.method || '',
    currency: createWithdrawDto.currency || '',
    rate: createWithdrawDto?.rate || 0,
    conversion_id: [] as number[],
    mycashback_id: resolveAutoMyCashbackWithdrawIds(snapshot),
  };
}
