import {
  parseExtraOrigins,
  buildCorsAllowSet,
  isCorsOriginAllowed,
} from './cors-origins';

describe('cors-origins', () => {
  describe('parseExtraOrigins', () => {
    it('returns [] for undefined, null, or blank input', () => {
      expect(parseExtraOrigins(undefined)).toEqual([]);
      expect(parseExtraOrigins(null)).toEqual([]);
      expect(parseExtraOrigins('')).toEqual([]);
      expect(parseExtraOrigins('   ,  , ')).toEqual([]);
    });

    it('splits on commas, trims whitespace, and drops blanks', () => {
      expect(
        parseExtraOrigins('https://a.co, https://b.co ,, https://c.co'),
      ).toEqual(['https://a.co', 'https://b.co', 'https://c.co']);
    });
  });

  describe('buildCorsAllowSet', () => {
    it('with empty env equals the base list (no behavior change)', () => {
      const base = ['https://app.gogocash.co', 'http://localhost:3000'];
      expect([...buildCorsAllowSet(base, '')]).toEqual(base);
      expect([...buildCorsAllowSet(base, undefined)]).toEqual(base);
    });

    it('merges base + extra origins, de-duplicated', () => {
      const set = buildCorsAllowSet(
        ['https://a.co'],
        'https://b.co,https://a.co',
      );
      expect(set.has('https://a.co')).toBe(true);
      expect(set.has('https://b.co')).toBe(true);
      expect(set.size).toBe(2);
    });
  });

  describe('isCorsOriginAllowed', () => {
    const allowSet = buildCorsAllowSet(
      ['https://app.gogocash.co'],
      'https://gogocash-admin-production.up.railway.app',
    );

    it('allows a missing origin (server-to-server, curl, same-origin)', () => {
      expect(isCorsOriginAllowed(allowSet, undefined)).toBe(true);
    });

    it('allows an exact base origin', () => {
      expect(isCorsOriginAllowed(allowSet, 'https://app.gogocash.co')).toBe(
        true,
      );
    });

    it('allows an exact extra origin from env', () => {
      expect(
        isCorsOriginAllowed(
          allowSet,
          'https://gogocash-admin-production.up.railway.app',
        ),
      ).toBe(true);
    });

    it('rejects an unknown origin', () => {
      expect(isCorsOriginAllowed(allowSet, 'https://evil.example.com')).toBe(
        false,
      );
    });

    it('rejects non-exact matches — no wildcard/suffix/substring bypass', () => {
      expect(
        isCorsOriginAllowed(
          allowSet,
          'https://app.gogocash.co.attacker.com',
        ),
      ).toBe(false);
      expect(isCorsOriginAllowed(allowSet, 'app.gogocash.co')).toBe(false);
      expect(
        isCorsOriginAllowed(allowSet, 'https://app.gogocash.co/'),
      ).toBe(false);
    });
  });
});
