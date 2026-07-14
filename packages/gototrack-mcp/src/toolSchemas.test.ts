import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  activateCashbackSchema,
  matchMerchantSchema,
  searchMerchantsSchema,
} from './toolSchemas.js';

describe('GoGoTrack MCP tool schemas', () => {
  it('accepts valid search and merchant-match inputs', () => {
    assert.deepEqual(searchMerchantsSchema.parse({ query: 'Shopee' }), {
      query: 'Shopee',
    });
    assert.deepEqual(
      matchMerchantSchema.parse({
        merchantHint: 'Shopee',
        platform: 'android',
        packageName: 'com.shopee.th',
      }),
      {
        merchantHint: 'Shopee',
        platform: 'android',
        packageName: 'com.shopee.th',
      },
    );
  });

  it('rejects unknown customer platforms', () => {
    assert.equal(
      matchMerchantSchema.safeParse({ platform: 'desktop' }).success,
      false,
    );
  });

  it('accepts valid cashback activation identifiers', () => {
    assert.deepEqual(
      activateCashbackSchema.parse({
        detectionEventId: 'detection-1',
        merchantId: 'merchant-1',
        offerId: 101,
        networkMerchantId: 202,
      }),
      {
        detectionEventId: 'detection-1',
        merchantId: 'merchant-1',
        offerId: 101,
        networkMerchantId: 202,
      },
    );
  });

  it('rejects numeric identifiers encoded as strings', () => {
    assert.equal(
      activateCashbackSchema.safeParse({
        detectionEventId: 'detection-1',
        merchantId: 'merchant-1',
        offerId: '101',
        networkMerchantId: 202,
      }).success,
      false,
    );
    assert.equal(
      activateCashbackSchema.safeParse({
        detectionEventId: 'detection-1',
        merchantId: 'merchant-1',
        offerId: 101,
        networkMerchantId: '202',
      }).success,
      false,
    );
  });

  it('rejects activation input missing required identifiers', () => {
    assert.equal(
      activateCashbackSchema.safeParse({
        merchantId: 'merchant-1',
        offerId: 101,
        networkMerchantId: 202,
      }).success,
      false,
    );
  });
});
