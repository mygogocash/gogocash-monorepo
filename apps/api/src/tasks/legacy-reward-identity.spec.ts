import {
  isLegacyRewardModel,
  legacyPurchasePointKey,
  legacyQuestRewardFilter,
  legacyRankPayoutKey,
  legacySyntheticConversionId,
  legacySocialPayoutKey,
  legacySpecialPointKey,
} from './legacy-reward-identity';

describe('legacy reward identities', () => {
  it('reads a missing reward_model as legacy but never admits task_v2 or unknown models', () => {
    expect(isLegacyRewardModel(undefined)).toBe(true);
    expect(isLegacyRewardModel('legacy_v1')).toBe(true);
    expect(isLegacyRewardModel('task_v2')).toBe(false);
    expect(isLegacyRewardModel('future_v3')).toBe(false);

    expect(legacyQuestRewardFilter()).toEqual({
      $or: [
        { reward_model: { $exists: false } },
        { reward_model: 'legacy_v1' },
      ],
    });
  });

  it('builds deterministic store-specific recipient identities', () => {
    expect(legacyPurchasePointKey('involve', 123)).toBe(
      'legacy:purchase:conversion:involve:default:123',
    );
    expect(legacySpecialPointKey('quest-a', 'user-a')).toBe(
      'legacy:quest:quest-a:special-next-round:user:user-a',
    );
    expect(
      legacySocialPayoutKey('quest-a', 'user-a', 'facebook', 'share'),
    ).toBe('legacy:quest:quest-a:social:facebook:share:user:user-a');
    expect(legacyRankPayoutKey('quest-a', 'user-a', 2)).toBe(
      'legacy:quest:quest-a:rank:2:user:user-a',
    );
  });

  it('uses the canonical provider account and provider conversion id address', () => {
    expect(
      legacyPurchasePointKey({
        source: ' INVOLVE ',
        network_account: 'publisher/th',
        conversion_id: 123,
        provider_conversion_id: 'provider:9001',
      }),
    ).toBe('legacy:purchase:conversion:involve:publisher%2Fth:provider%3A9001');
  });

  it('rejects empty or delimiter-bearing identity components', () => {
    expect(() => legacySpecialPointKey('', 'user-a')).toThrow(/quest/i);
    expect(() =>
      legacySocialPayoutKey('quest-a', 'user:a', 'facebook', 'share'),
    ).toThrow(/identity/i);
    expect(() => legacyRankPayoutKey('quest-a', 'user-a', 0)).toThrow(/rank/i);
  });

  it('derives a stable negative synthetic conversion id from the durable payout key', () => {
    const key = legacyRankPayoutKey('quest-a', 'user-a', 1);
    expect(legacySyntheticConversionId(key)).toBe(
      legacySyntheticConversionId(key),
    );
    expect(legacySyntheticConversionId(key)).toBeLessThan(0);
    expect(Number.isSafeInteger(legacySyntheticConversionId(key))).toBe(true);
    expect(legacySyntheticConversionId(key)).not.toBe(
      legacySyntheticConversionId(legacyRankPayoutKey('quest-a', 'user-b', 1)),
    );
  });
});
