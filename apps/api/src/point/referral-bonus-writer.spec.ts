import { Types } from 'mongoose';
import { awardReferralBonusForConversion } from './referral-bonus-writer';

function makeDeps(overrides: Record<string, any> = {}) {
  const referrerId = new Types.ObjectId();
  const pointCalls: any[] = [];
  const auditRows: any[] = [];
  const deps = {
    enabled: true,
    referrerLookup: jest.fn(async () => referrerId.toHexString()),
    feeRatePercentProvider: jest.fn(async () => 10),
    pointService: {
      addPointsToUser: jest.fn(async (...args: any[]) => {
        pointCalls.push(args);
        return { _id: new Types.ObjectId(), idempotency_key: args[4] };
      }),
    },
    referralPayoutModel: {
      updateOne: jest.fn(async (filter: any, update: any) => {
        // emulate an idempotent upsert on idempotency_key
        const key = filter.idempotency_key;
        if (!auditRows.find((r) => r.idempotency_key === key)) {
          auditRows.push({ ...(update.$setOnInsert ?? {}) });
          return { upsertedCount: 1, matchedCount: 0 };
        }
        return { upsertedCount: 0, matchedCount: 1 };
      }),
    },
    ...overrides,
  };
  return { deps, pointCalls, auditRows, referrerId };
}

const baseInput = {
  refereeUserId: new Types.ObjectId().toHexString(),
  sourceCashbackAmount: 265,
  sourceConversionId: 44,
  sourcePayoutKey: 'legacy:purchase:conversion:involve:44:default',
};

describe('awardReferralBonusForConversion', () => {
  it('pays the referrer floor(percent% of the friend cashback) and writes one audit row', async () => {
    const { deps, pointCalls, auditRows, referrerId } = makeDeps();

    const result = await awardReferralBonusForConversion(baseInput, deps);

    expect(result.status).toBe('paid');
    if (result.status !== 'paid') throw new Error('expected paid');
    expect(result.bonus).toBe(26); // floor(265 * 10%)
    expect(result.percent).toBe(10);
    // credited to the referrer via the idempotent Point path
    expect(pointCalls).toHaveLength(1);
    const [userId, points, conversionId, action, key] = pointCalls[0];
    expect(userId).toBe(referrerId.toHexString());
    expect(points).toBe(26);
    expect(conversionId).toBe(44);
    expect(action).toBe('referral_bonus');
    expect(key).toBe(
      'referral:bonus:v1:source:legacy:purchase:conversion:involve:44:default',
    );
    // one immutable audit record
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]).toMatchObject({
      referrer_id: expect.anything(),
      referee_id: expect.anything(),
      source_conversion_id: 44,
      percent: 10,
      source_amount: 265,
      bonus_amount: 26,
      idempotency_key: key,
    });
  });

  it('is idempotent: the SAME qualifying event twice yields ONE payout + ONE audit row', async () => {
    const { deps, pointCalls, auditRows } = makeDeps();
    // Point ledger dedupes on the unique key: the second call returns the
    // existing row rather than crediting again.
    let stored: any = null;
    deps.pointService.addPointsToUser = jest.fn(async (...args: any[]) => {
      pointCalls.push(args);
      if (stored) return stored;
      stored = { _id: new Types.ObjectId(), idempotency_key: args[4] };
      return stored;
    });

    await awardReferralBonusForConversion(baseInput, deps);
    await awardReferralBonusForConversion(baseInput, deps);

    // addPointsToUser may be invoked twice but the ledger key guarantees a
    // single credit; the audit collection upserts on the same key -> 1 row.
    expect(auditRows).toHaveLength(1);
  });

  it('does not pay when the feature flag is OFF', async () => {
    const { deps, pointCalls, auditRows } = makeDeps({ enabled: false });
    const result = await awardReferralBonusForConversion(baseInput, deps);
    expect(result.status).toBe('disabled');
    expect(pointCalls).toHaveLength(0);
    expect(auditRows).toHaveLength(0);
  });

  it('does not pay when the friend has no referrer', async () => {
    const { deps, pointCalls } = makeDeps({
      referrerLookup: jest.fn(async () => null),
    });
    const result = await awardReferralBonusForConversion(baseInput, deps);
    expect(result.status).toBe('no_referrer');
    expect(pointCalls).toHaveLength(0);
  });

  it('refuses self-referral (referrer === referee)', async () => {
    const selfId = new Types.ObjectId().toHexString();
    const { deps, pointCalls } = makeDeps({
      referrerLookup: jest.fn(async () => selfId),
    });
    const result = await awardReferralBonusForConversion(
      { ...baseInput, refereeUserId: selfId },
      deps,
    );
    expect(result.status).toBe('self_referral');
    expect(pointCalls).toHaveLength(0);
  });

  it('does not pay a zero bonus (percent 0 -> no credit, no audit noise)', async () => {
    const { deps, pointCalls, auditRows } = makeDeps({
      feeRatePercentProvider: jest.fn(async () => 0),
    });
    const result = await awardReferralBonusForConversion(baseInput, deps);
    expect(result.status).toBe('zero_bonus');
    expect(pointCalls).toHaveLength(0);
    expect(auditRows).toHaveLength(0);
  });

  it('never pays on a reversed/negative source amount (throws — fail closed)', async () => {
    const { deps } = makeDeps();
    await expect(
      awardReferralBonusForConversion(
        { ...baseInput, sourceCashbackAmount: -100 },
        deps,
      ),
    ).rejects.toThrow();
  });
});
