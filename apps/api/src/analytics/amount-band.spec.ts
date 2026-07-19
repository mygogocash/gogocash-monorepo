import { amountBand } from './amount-band';

describe('amountBand', () => {
  it('buckets amounts into PDPA-safe ranges instead of exact values', () => {
    expect(amountBand(0)).toBe('0-100');
    expect(amountBand(50)).toBe('0-100');
    expect(amountBand(100)).toBe('100-500');
    expect(amountBand(499.99)).toBe('100-500');
    expect(amountBand(500)).toBe('500-1000');
    expect(amountBand(1000)).toBe('1000-5000');
    expect(amountBand(5000)).toBe('5000+');
    expect(amountBand(999999)).toBe('5000+');
  });

  it('returns "unknown" for non-finite / missing amounts (never leaks a raw value)', () => {
    expect(amountBand(undefined)).toBe('unknown');
    expect(amountBand(null)).toBe('unknown');
    expect(amountBand(Number.NaN)).toBe('unknown');
    expect(amountBand(-5)).toBe('unknown');
  });
});
