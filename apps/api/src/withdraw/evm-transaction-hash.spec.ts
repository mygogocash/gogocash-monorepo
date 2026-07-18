import { BadRequestException } from '@nestjs/common';
import { requireCanonicalEvmTransactionHash } from './evm-transaction-hash';

describe('requireCanonicalEvmTransactionHash', () => {
  it('trims and lowercases valid EVM evidence', () => {
    const upper = `0x${'AB'.repeat(32)}`;

    expect(requireCanonicalEvmTransactionHash(`  ${upper}  `)).toBe(
      upper.toLowerCase(),
    );
  });

  it.each([
    undefined,
    null,
    '',
    `0x${'a'.repeat(63)}`,
    `0x${'a'.repeat(65)}`,
    `0X${'a'.repeat(64)}`,
    `0x${'g'.repeat(64)}`,
  ])('rejects malformed evidence %p', (value) => {
    expect(() => requireCanonicalEvmTransactionHash(value)).toThrow(
      BadRequestException,
    );
  });
});
