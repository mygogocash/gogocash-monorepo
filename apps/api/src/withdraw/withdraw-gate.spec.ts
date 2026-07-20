import { ServiceUnavailableException } from '@nestjs/common';
import {
  assertWithdrawalsEnabled,
  isWithdrawalsEnabled,
} from './withdraw-gate';

describe('isWithdrawalsEnabled', () => {
  it('given the literal string false > then withdrawals are disabled', () => {
    expect(isWithdrawalsEnabled('false')).toBe(false);
  });

  it('given undefined (var not set) > then withdrawals stay enabled (fail-open for payouts)', () => {
    expect(isWithdrawalsEnabled(undefined)).toBe(true);
  });

  it('given non-literal variants > then withdrawals stay enabled (exact-match idiom)', () => {
    expect(isWithdrawalsEnabled('FALSE')).toBe(true);
    expect(isWithdrawalsEnabled('0')).toBe(true);
    expect(isWithdrawalsEnabled(' false')).toBe(true);
    expect(isWithdrawalsEnabled('true')).toBe(true);
  });
});

describe('assertWithdrawalsEnabled', () => {
  it('given false > then throws ServiceUnavailableException (clean 503, not a crash)', () => {
    expect(() => assertWithdrawalsEnabled('false')).toThrow(
      ServiceUnavailableException,
    );
  });

  it('given enabled > then does not throw', () => {
    expect(() => assertWithdrawalsEnabled('true')).not.toThrow();
    expect(() => assertWithdrawalsEnabled(undefined)).not.toThrow();
  });
});
