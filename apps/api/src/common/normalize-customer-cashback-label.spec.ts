import { normalizeCustomerCashbackLabel } from './normalize-customer-cashback-label';

describe('normalizeCustomerCashbackLabel', () => {
  it('given Up to prefix > then strips it for card layout', () => {
    expect(normalizeCustomerCashbackLabel('Up to 2.02%')).toBe('2.02%');
    expect(normalizeCustomerCashbackLabel('up to 4.55%')).toBe('4.55%');
  });

  it('given plain percent > then returns trimmed label', () => {
    expect(normalizeCustomerCashbackLabel('  7%  ')).toBe('7%');
  });

  it('given empty > then returns empty string', () => {
    expect(normalizeCustomerCashbackLabel('')).toBe('');
    expect(normalizeCustomerCashbackLabel(null)).toBe('');
  });
});
