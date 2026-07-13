import {
  DEFAULT_CONFIRM_DAYS,
  DEFAULT_TRACKING_DAYS,
  resolveTrackingPeriod,
} from './tracking-period.util';

// Default flow/subtitle shape every legacy resolution must now carry.
const DEFAULT_FLOW_FIELDS = {
  flow_type: 'three_step',
  tracking_subtitle: 'from the following month',
  confirm_subtitle: 'after validation',
} as const;

describe('resolveTrackingPeriod', () => {
  it('given auto mode and partner validation_terms 15 > then confirm 15, tracking 30, source partner', () => {
    expect(
      resolveTrackingPeriod({
        tracking_period_mode: 'auto',
        validation_terms: 15,
      }),
    ).toEqual({
      tracking_days: 30,
      confirm_days: 15,
      source: 'partner',
      ...DEFAULT_FLOW_FIELDS,
    });
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
        ...DEFAULT_FLOW_FIELDS,
      });
    }
  });

  it('given a legacy doc without tracking_period_mode > then it resolves as auto', () => {
    expect(resolveTrackingPeriod({ validation_terms: 45 })).toEqual({
      tracking_days: 30,
      confirm_days: 45,
      source: 'partner',
      ...DEFAULT_FLOW_FIELDS,
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
    ).toEqual({
      tracking_days: 7,
      confirm_days: 45,
      source: 'manual',
      ...DEFAULT_FLOW_FIELDS,
    });
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
        ...DEFAULT_FLOW_FIELDS,
      });
    }
  });

  it('given a stored two_step flow_type > then it is carried through in both modes', () => {
    expect(
      resolveTrackingPeriod({ flow_type: 'two_step', validation_terms: 15 })
        .flow_type,
    ).toBe('two_step');
    expect(
      resolveTrackingPeriod({
        tracking_period_mode: 'manual',
        flow_type: 'two_step',
        tracking_days: 7,
        confirm_days: 45,
      }).flow_type,
    ).toBe('two_step');
  });

  it('given a missing or invalid flow_type > then it falls back to three_step', () => {
    for (const flow_type of [undefined, '', 'weekly', 'four_step']) {
      expect(resolveTrackingPeriod({ flow_type }).flow_type).toBe('three_step');
    }
  });

  it('given stored subtitles > then they are returned trimmed', () => {
    const resolved = resolveTrackingPeriod({
      tracking_subtitle: '  after the return window closes  ',
      confirm_subtitle: ' once the store approves ',
    });
    expect(resolved.tracking_subtitle).toBe('after the return window closes');
    expect(resolved.confirm_subtitle).toBe('once the store approves');
  });

  it('given empty or whitespace-only subtitles > then each falls back to its default', () => {
    for (const blank of ['', '   ', undefined]) {
      const resolved = resolveTrackingPeriod({
        tracking_subtitle: blank,
        confirm_subtitle: blank,
      });
      expect(resolved.tracking_subtitle).toBe('from the following month');
      expect(resolved.confirm_subtitle).toBe('after validation');
    }
  });
});
