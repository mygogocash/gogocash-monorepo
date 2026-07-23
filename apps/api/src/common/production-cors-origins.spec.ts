import { buildCorsAllowSet, isCorsOriginAllowed } from './cors-origins';

/** Production browser origins that must stay in the API CORS allow-list. */
export const PRODUCTION_CORS_ORIGINS = [
  'https://app.gogocash.co',
  'https://admin.gogocash.co',
] as const;

describe('production CORS origins', () => {
  it('allows app.gogocash.co and admin.gogocash.co from the base allow-list', () => {
    const allowSet = buildCorsAllowSet([...PRODUCTION_CORS_ORIGINS], '');

    for (const origin of PRODUCTION_CORS_ORIGINS) {
      expect(isCorsOriginAllowed(allowSet, origin)).toBe(true);
    }
  });
});
