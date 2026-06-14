import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateWithdrawDto } from './create-withdraw.dto';

/**
 * V-1: CreateWithdrawDto drives POST /withdraw and /withdraw/bank-transfer but
 * carried NO class-validator decorators, so even with a global ValidationPipe
 * its money fields were unvalidated. These tests pin the decorators that make
 * the (now-active) pipe actually reject garbage amounts/currencies. Optional
 * fields stay optional — the pipe runs transform-only (no whitelist) so missing
 * fields must not error.
 */
const errorsFor = async (plain: Record<string, unknown>) =>
  validate(plainToInstance(CreateWithdrawDto, plain));

const hasError = (errors: { property: string }[], property: string): boolean =>
  errors.some((e) => e.property === property);

describe('CreateWithdrawDto validation (V-1)', () => {
  it('given a negative amount_net > then validation reports an amount_net error', async () => {
    const errors = await errorsFor({ amount_net: -5, currency: 'USD' });
    expect(hasError(errors, 'amount_net')).toBe(true);
  });

  it('given a non-numeric amount_net > then validation reports an amount_net error', async () => {
    const errors = await errorsFor({ amount_net: 'lots', currency: 'USD' });
    expect(hasError(errors, 'amount_net')).toBe(true);
  });

  it('given an unsupported currency > then validation reports a currency error', async () => {
    const errors = await errorsFor({ amount_net: 10, currency: 'EUR' });
    expect(hasError(errors, 'currency')).toBe(true);
  });

  it('given a valid USD request > then there are no validation errors', async () => {
    const errors = await errorsFor({
      amount_net: 10,
      amount_total: 10,
      currency: 'USD',
      method: 'crypto',
    });
    expect(errors).toHaveLength(0);
  });

  it('given an empty object (all fields optional) > then there are no validation errors', async () => {
    const errors = await errorsFor({});
    expect(errors).toHaveLength(0);
  });
});
