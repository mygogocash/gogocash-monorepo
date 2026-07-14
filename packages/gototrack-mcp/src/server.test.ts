import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createGototrackMcpServer } from './server.js';

function createClientStub() {
  return {
    searchMerchants: mock.fn(async (query?: string) => ({ query })),
    matchMerchant: mock.fn(async (input: unknown) => input),
    activateCashback: mock.fn(async (input: unknown) => input),
    getTimeline: mock.fn(async () => ({ events: [] })),
  };
}

async function createTestPair(authToken = 'customer-jwt') {
  const gototrackClient = createClientStub();
  const server = createGototrackMcpServer({
    client: gototrackClient,
    authToken,
  });
  const client = new Client({ name: 'gototrack-test-client', version: '1.0.0' });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    client,
    gototrackClient,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}

describe('createGototrackMcpServer', () => {
  it('lists the four GoGoTrack tools with input schemas', async () => {
    const pair = await createTestPair();
    try {
      const result = await pair.client.listTools();
      assert.deepEqual(
        result.tools.map((tool) => tool.name),
        [
          'search_merchants',
          'match_merchant',
          'activate_cashback',
          'get_timeline',
        ],
      );
      assert.equal(
        result.tools.every((tool) => tool.inputSchema.type === 'object'),
        true,
      );
    } finally {
      await pair.close();
    }
  });

  it('calls a valid tool input through the MCP transport', async () => {
    const pair = await createTestPair();
    try {
      const result = await pair.client.callTool({
        name: 'search_merchants',
        arguments: { query: 'Shopee' },
      });

      assert.equal(pair.gototrackClient.searchMerchants.mock.calls.length, 1);
      assert.equal(
        pair.gototrackClient.searchMerchants.mock.calls[0]?.arguments[0],
        'Shopee',
      );
      assert.deepEqual(result.content, [
        {
          type: 'text',
          text: JSON.stringify({ query: 'Shopee' }, null, 2),
        },
      ]);
    } finally {
      await pair.close();
    }
  });

  it('rejects invalid tool input before calling the API client', async () => {
    const pair = await createTestPair();
    try {
      const result = await pair.client.callTool({
        name: 'activate_cashback',
        arguments: {
          detectionEventId: 'detection-1',
          merchantId: 'merchant-1',
          offerId: '101',
          networkMerchantId: 202,
        },
      });

      assert.equal(result.isError, true);
      assert.equal(
        pair.gototrackClient.activateCashback.mock.calls.length,
        0,
      );
    } finally {
      await pair.close();
    }
  });
});
