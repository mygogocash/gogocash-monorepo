import { isLegacyCronEnabled } from './legacy-cron-gate';

describe('legacy-cron-gate', () => {
  it('is enabled by default (unset or empty CRON_ENABLED)', () => {
    expect(isLegacyCronEnabled(undefined)).toBe(true);
    expect(isLegacyCronEnabled('')).toBe(true);
  });

  it('is disabled only by the literal string "false"', () => {
    expect(isLegacyCronEnabled('false')).toBe(false);
  });

  it('treats any other value as enabled (exact-match, POSTHOG_ENABLED idiom)', () => {
    expect(isLegacyCronEnabled('true')).toBe(true);
    expect(isLegacyCronEnabled('1')).toBe(true);
    expect(isLegacyCronEnabled('0')).toBe(true);
    expect(isLegacyCronEnabled('FALSE')).toBe(true);
  });
});
