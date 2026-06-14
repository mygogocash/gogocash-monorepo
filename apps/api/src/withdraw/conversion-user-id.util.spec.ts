import { parseUserIdFromAffSub1 } from './conversion-user-id.util';

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
