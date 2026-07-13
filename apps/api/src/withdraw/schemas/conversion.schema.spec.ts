import mongoose from 'mongoose';
import { Conversion, ConversionSchema } from './conversion.schema';

/**
 * Schema-level defaults are the safety net that makes the multi-network rollout
 * byte-identical for live (Involve-only) data: a conversion created without an
 * explicit `source` must read back as 'involve', so the source-scoped balance
 * joins keep matching legacy rows exactly as before.
 */
describe('Conversion schema source default', () => {
  const ConversionModel = (mongoose.models[Conversion.name] ??
    mongoose.model(Conversion.name, ConversionSchema)) as mongoose.Model<any>;

  function makeDoc(over: Record<string, unknown> = {}) {
    return new ConversionModel({
      conversion_id: 1,
      offer_id: 2,
      offer_name: 'x',
      merchant_id: 3,
      conversion_status: 'pending',
      datetime_conversion: new Date(),
      sale_amount: 0,
      payout: 0,
      ...over,
    });
  }

  it('Conversion > given no source > then defaults to involve', () => {
    expect(makeDoc().source).toBe('involve');
  });

  it('Conversion > given an explicit optimise source > then it is preserved', () => {
    expect(makeDoc({ source: 'optimise' }).source).toBe('optimise');
  });

  it('Conversion > given no network_account > then it is undefined (no default)', () => {
    expect(makeDoc().network_account).toBeUndefined();
  });

  it('Conversion > given an out-of-enum source > then validation reports it', async () => {
    await expect(makeDoc({ source: 'bogus' }).validate()).rejects.toMatchObject(
      {
        errors: { source: expect.anything() },
      },
    );
  });
});
