import {
  DEFAULT_CONFIRM_DAYS,
  DEFAULT_TRACKING_DAYS,
  resolveTrackingPeriod,
} from './tracking-period.util';

describe('resolveTrackingPeriod', () => {
  it('given auto mode and partner validation_terms 15 > then confirm 15, tracking 30, source partner', () => {
    expect(
      resolveTrackingPeriod({
        tracking_period_mode: 'auto',
        validation_terms: 15,
      }),
    ).toEqual({ tracking_days: 30, confirm_days: 15, source: 'partner' });
  });

  it('given auto mode and validation_terms 0, missing, or negative > then defaults 30/30 with source default', () => {
    for (const validation_terms of [0, undefined, -5]) {
      expect(
        resolveTrackingPeriod({
          tracking_period_mode: 'auto',
          validation_terms,
        }),
      ).toEqual({
        tracking_days: DEFAULT_TRACKING_DAYS,
        confirm_days: DEFAULT_CONFIRM_DAYS,
        source: 'default',
      });
    }
  });

  it('given a legacy doc without tracking_period_mode > then it resolves as auto', () => {
    expect(resolveTrackingPeriod({ validation_terms: 45 })).toEqual({
      tracking_days: 30,
      confirm_days: 45,
      source: 'partner',
    });
  });

  it('given manual mode with tracking_days 7 and confirm_days 45 > then it returns the stored values with source manual', () => {
    expect(
      resolveTrackingPeriod({
        tracking_period_mode: 'manual',
        tracking_days: 7,
        confirm_days: 45,
        validation_terms: 15,
      }),
    ).toEqual({ tracking_days: 7, confirm_days: 45, source: 'manual' });
  });

  it('given manual mode with invalid stored days > then each field falls back to its default', () => {
    for (const bad of [0, 9999, 2.5, undefined]) {
      const resolved = resolveTrackingPeriod({
        tracking_period_mode: 'manual',
        tracking_days: bad,
        confirm_days: bad,
      });
      expect(resolved).toEqual({
        tracking_days: DEFAULT_TRACKING_DAYS,
        confirm_days: DEFAULT_CONFIRM_DAYS,
        source: 'manual',
      });
    }
  });
});
