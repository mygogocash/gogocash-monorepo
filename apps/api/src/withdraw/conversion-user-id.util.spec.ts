import { Types } from 'mongoose';

import {
  affSub1ForUserId,
  buildApprovedUserConversionsFilter,
  buildUserConversionScopeFilter,
  enrichConversionWithUserId,
  parseUserIdFromAffSub1,
  resolveBackfillUserObjectId,
} from './conversion-user-id.util';

describe('parseUserIdFromAffSub1 (P1-COLLSCAN)', () => {
  const HEX24 = '68bf99fed9667685c1637607';

  it('given "user_id:<hex24>" > then returns the hex id', () => {
    expect(parseUserIdFromAffSub1(`user_id:${HEX24}`)).toBe(HEX24);
  });

  it('trims surrounding whitespace before matching', () => {
    expect(parseUserIdFromAffSub1(`  user_id:${HEX24}  `)).toBe(HEX24);
  });

  it('given null/undefined/empty > then returns null', () => {
    expect(parseUserIdFromAffSub1(undefined)).toBeNull();
    expect(parseUserIdFromAffSub1(null)).toBeNull();
    expect(parseUserIdFromAffSub1('')).toBeNull();
  });

  it('given a non-user_id aff_sub1 (e.g. a Shopee sub) > then returns null', () => {
    expect(parseUserIdFromAffSub1('shopee-campaign-42')).toBeNull();
  });

  it('given a malformed id (wrong length / non-hex) > then returns null', () => {
    expect(parseUserIdFromAffSub1('user_id:not-hex')).toBeNull();
    expect(parseUserIdFromAffSub1('user_id:abc')).toBeNull();
    expect(parseUserIdFromAffSub1(`user_id:${HEX24}extra`)).toBeNull();
  });
});

describe('buildUserConversionScopeFilter (P1-COLLSCAN)', () => {
  const HEX24 = '68bf99fed9667685c1637607';

  it('given a user id > then scopes by indexed user_id and exact aff_sub1 (no $regex)', () => {
    const filter = buildUserConversionScopeFilter(HEX24);

    expect(filter).toEqual({
      $or: [
        { user_id: new Types.ObjectId(HEX24) },
        { aff_sub1: affSub1ForUserId(HEX24) },
      ],
    });
    expect(JSON.stringify(filter)).not.toContain('$regex');
  });

  it('buildApprovedUserConversionsFilter > given a user id > then adds approved status', () => {
    expect(buildApprovedUserConversionsFilter(HEX24)).toEqual({
      conversion_status: 'approved',
      $or: [
        { user_id: new Types.ObjectId(HEX24) },
        { aff_sub1: affSub1ForUserId(HEX24) },
      ],
    });
  });
});

describe('enrichConversionWithUserId (P1-COLLSCAN)', () => {
  const HEX24 = '68bf99fed9667685c1637607';

  it('given aff_sub1 only > then sets user_id on ingest', () => {
    const enriched = enrichConversionWithUserId({
      aff_sub1: `user_id:${HEX24}`,
      conversion_id: 1,
      user_id: undefined,
    });

    expect(enriched.user_id?.toString()).toBe(HEX24);
  });

  it('given an existing user_id > then leaves the document unchanged', () => {
    const existing = new Types.ObjectId(HEX24);
    const doc = { aff_sub1: `user_id:${HEX24}`, user_id: existing };

    expect(enrichConversionWithUserId(doc)).toBe(doc);
  });
});

describe('resolveBackfillUserObjectId (P1-COLLSCAN)', () => {
  const HEX24 = '68bf99fed9667685c1637607';

  it('given parseable aff_sub1 > then returns ObjectId for backfill', () => {
    expect(resolveBackfillUserObjectId(`user_id:${HEX24}`)?.toString()).toBe(
      HEX24,
    );
  });

  it('given unparseable aff_sub1 > then returns null', () => {
    expect(resolveBackfillUserObjectId('campaign-42')).toBeNull();
  });
});
