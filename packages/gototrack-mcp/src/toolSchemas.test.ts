import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  advertisedActivateCashbackSchema,
  advertisedMatchMerchantSchema,
  advertisedSearchMerchantsSchema,
} from './advertisedToolSchemas.js';
import {
  activateCashbackSchema,
  matchMerchantSchema,
  searchMerchantsSchema,
} from './toolSchemas.js';

describe('GoGoTrack MCP tool schemas', () => {
  it('keeps advertised and Zod 4 handler fields in sync', () => {
    assert.deepEqual(
      Object.keys(advertisedSearchMerchantsSchema.shape),
      Object.keys(searchMerchantsSchema.shape),
    );
    assert.deepEqual(
      Object.keys(advertisedMatchMerchantSchema.shape),
      Object.keys(matchMerchantSchema.shape),
    );
    assert.deepEqual(
      Object.keys(advertisedActivateCashbackSchema.shape),
      Object.keys(activateCashbackSchema.shape),
    );
  });

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
