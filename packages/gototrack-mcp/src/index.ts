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

const searchMerchantsSchema = z.object({
  query: z.string().optional().describe('Merchant name filter, e.g. "Shopee"'),
});

const matchMerchantSchema = z.object({
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
});

const activateCashbackSchema = z.object({
  detectionEventId: z.string().describe('Detection event id from match_merchant'),
  merchantId: z.string(),
  offerId: z.number(),
  networkMerchantId: z.number(),
  merchantName: z.string().optional(),
  packageName: z.string().optional(),
  conversationId: z.string().optional(),
});

const emptyInputSchema = z.object({});

function authRequiredResponse(toolName: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: `GOGOTRACK_AUTH_TOKEN is required for ${toolName}.`,
      },
    ],
    isError: true as const,
  };
}

function jsonToolResponse(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

async function withAuthTool<T>(
  toolName: string,
  run: () => Promise<T>,
) {
  if (!config.authToken) {
    return authRequiredResponse(toolName);
  }
  return jsonToolResponse(await run());
}

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
    inputSchema: searchMerchantsSchema.shape,
  },
  async ({ query }) => jsonToolResponse(await client.searchMerchants(query)),
);

server.registerTool(
  'match_merchant',
  {
    description:
      'Match a merchant from chat context and record a GoGoTrack detection event.',
    inputSchema: matchMerchantSchema.shape,
  },
  async (input) =>
    withAuthTool('match_merchant', () => client.matchMerchant(input)),
);

server.registerTool(
  'activate_cashback',
  {
    description:
      'Activate GoGoTrack cashback tracking and return affiliate + app deeplinks.',
    inputSchema: activateCashbackSchema.shape,
  },
  async (input) =>
    withAuthTool('activate_cashback', () => client.activateCashback(input)),
);

server.registerTool(
  'get_timeline',
  {
    description:
      'Fetch the authenticated user GoGoTrack detection and activation history.',
    inputSchema: emptyInputSchema.shape,
  },
  async () => withAuthTool('get_timeline', () => client.getTimeline()),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('GoGoTrack MCP server failed:', error);
  process.exit(1);
});
