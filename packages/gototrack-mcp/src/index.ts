#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  createGototrackClient,
  resolveGototrackMcpConfig,
} from './client.js';

const config = resolveGototrackMcpConfig();
const client = createGototrackClient(config);

const server = new McpServer(
  {
    name: 'gogocash-gototrack',
    version: '0.1.0',
  },
  {
    instructions:
      'GoGoTrack agent tools for GoGoCash cashback activation. Use search_merchants to browse brands, match_merchant before activate_cashback, then share the tracked deeplink with the user before checkout.',
  },
);

server.registerTool(
  'search_merchants',
  {
    description:
      'Search enabled GoGoTrack merchants and return structured cashback option cards.',
    inputSchema: {
      query: z.string().optional().describe('Merchant name filter, e.g. "Shopee"'),
    },
  },
  async ({ query }) => {
    const result = await client.searchMerchants(query);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'match_merchant',
  {
    description:
      'Match a merchant from chat context and record a GoGoTrack detection event.',
    inputSchema: {
      merchantHint: z
        .string()
        .optional()
        .describe('Natural-language merchant name'),
      url: z.string().optional().describe('Merchant URL if known'),
      packageName: z
        .string()
        .optional()
        .describe('Android package name if known'),
      platform: z
        .enum(['android', 'ios', 'web', 'line'])
        .optional()
        .describe('Customer platform (default web)'),
      conversationId: z
        .string()
        .optional()
        .describe('Optional agent conversation id for analytics'),
    },
  },
  async (input) => {
    if (!config.authToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'GOGOTRACK_AUTH_TOKEN is required for match_merchant.',
          },
        ],
        isError: true,
      };
    }
    const result = await client.matchMerchant(input);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'activate_cashback',
  {
    description:
      'Activate GoGoTrack cashback tracking and return affiliate + app deeplinks.',
    inputSchema: {
      detectionEventId: z.string().describe('Detection event id from match_merchant'),
      merchantId: z.string(),
      offerId: z.number(),
      networkMerchantId: z.number(),
      merchantName: z.string().optional(),
      packageName: z.string().optional(),
      conversationId: z.string().optional(),
    },
  },
  async (input) => {
    if (!config.authToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'GOGOTRACK_AUTH_TOKEN is required for activate_cashback.',
          },
        ],
        isError: true,
      };
    }
    const result = await client.activateCashback(input);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'get_timeline',
  {
    description:
      'Fetch the authenticated user GoGoTrack detection and activation history.',
    inputSchema: {},
  },
  async () => {
    if (!config.authToken) {
      return {
        content: [
          {
            type: 'text',
            text: 'GOGOTRACK_AUTH_TOKEN is required for get_timeline.',
          },
        ],
        isError: true,
      };
    }
    const result = await client.getTimeline();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('GoGoTrack MCP server failed:', error);
  process.exit(1);
});
