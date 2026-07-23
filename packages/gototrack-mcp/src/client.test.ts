import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createGototrackClient, resolveGototrackMcpConfig } from './client.js';

describe('createGototrackClient', () => {
  it('searchMerchants > given query > calls public search endpoint', async () => {
    const fetchMock = mock.fn(async (url: string) => ({
      ok: true,
      json: async () => ({ type: 'gototrack_merchant_options', options: [] }),
      text: async () => '',
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const client = createGototrackClient({
      apiUrl: 'https://api.dev.gogocash.co',
      authToken: 'token',
    });

    await client.searchMerchants('shopee');

    assert.equal(fetchMock.mock.calls.length, 1);
    assert.match(String(fetchMock.mock.calls[0]?.arguments[0]), /search\?q=shopee$/);
  });

  it('matchMerchant > given auth token > sends bearer header', async () => {
    const fetchMock = mock.fn(async (_url: string, init?: RequestInit) => ({
      ok: true,
      json: async () => ({ type: 'gototrack_merchant_match', matched: true }),
      text: async () => '',
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = createGototrackClient({
      apiUrl: 'https://api.dev.gogocash.co',
      authToken: 'customer-jwt',
    });

    await client.matchMerchant({ merchantHint: 'Shopee' });

    const init = fetchMock.mock.calls[0]?.arguments[1] as RequestInit;
    assert.equal(
      (init.headers as Record<string, string>).Authorization,
      'Bearer customer-jwt',
    );
  });
});

describe('resolveGototrackMcpConfig', () => {
  it('resolveGototrackMcpConfig > given typo auth env > then falls back to GOTOTRACK_AUTH_TOKEN', () => {
    const config = resolveGototrackMcpConfig({
      GOTOTRACK_AUTH_TOKEN: 'typo-token',
    });
    assert.equal(config.authToken, 'typo-token');
  });
});
