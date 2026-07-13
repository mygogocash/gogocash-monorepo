import mongoose from 'mongoose';
import { Deeplink, DeeplinkSchema } from './deeplink.schema';

/**
 * Deeplinks are network-namespaced too: a deeplink created without an explicit
 * `source` must read back as 'involve' so existing Involve tracking links stay
 * attributed to the Involve network as new networks come online.
 */
describe('Deeplink schema source default', () => {
  const DeeplinkModel = (mongoose.models[Deeplink.name] ??
    mongoose.model(Deeplink.name, DeeplinkSchema)) as mongoose.Model<any>;

  function makeDoc(over: Record<string, unknown> = {}) {
    return new DeeplinkModel({
      offer_id: 1,
      merchant_id: 2,
      user_id: new mongoose.Types.ObjectId(),
      deeplink: 'https://track/x',
      ...over,
    });
  }

  it('Deeplink > given no source > then defaults to involve', () => {
    expect(makeDoc().source).toBe('involve');
  });

  it('Deeplink > given an explicit source > then it is preserved', () => {
    expect(makeDoc({ source: 'optimise' }).source).toBe('optimise');
  });
});
