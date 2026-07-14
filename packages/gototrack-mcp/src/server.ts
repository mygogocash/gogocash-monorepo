import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type {
  ActivateCashbackInput,
  MatchMerchantInput,
} from './client.js';
import {
  activateCashbackSchema,
  emptyInputSchema,
  matchMerchantSchema,
  searchMerchantsSchema,
} from './toolSchemas.js';

export type GototrackToolClient = {
  searchMerchants(query?: string): Promise<unknown>;
  matchMerchant(input: MatchMerchantInput): Promise<unknown>;
  activateCashback(input: ActivateCashbackInput): Promise<unknown>;
  getTimeline(): Promise<unknown>;
};

type CreateGototrackMcpServerOptions = {
  client: GototrackToolClient;
  authToken?: string;
};

function asMcpSchema(schema: unknown): AnySchema {
  // npm hoists the SDK beside Expo's Zod 3 compatibility package while this
  // workspace owns Zod 4. The two copies' private types are nominally
  // incompatible, although the SDK explicitly supports both at runtime.
  // Keep the bridge at this boundary and parse again in each typed handler.
  return schema as AnySchema;
}

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

export function createGototrackMcpServer({
  client,
  authToken,
}: CreateGototrackMcpServerOptions) {
  async function withAuthTool<T>(toolName: string, run: () => Promise<T>) {
    if (!authToken) {
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
      inputSchema: asMcpSchema(searchMerchantsSchema),
    },
    async (input: unknown) => {
      const { query } = searchMerchantsSchema.parse(input);
      return jsonToolResponse(await client.searchMerchants(query));
    },
  );

  server.registerTool(
    'match_merchant',
    {
      description:
        'Match a merchant from chat context and record a GoGoTrack detection event.',
      inputSchema: asMcpSchema(matchMerchantSchema),
    },
    async (input: unknown) => {
      const parsedInput = matchMerchantSchema.parse(input);
      return withAuthTool('match_merchant', () =>
        client.matchMerchant(parsedInput),
      );
    },
  );

  server.registerTool(
    'activate_cashback',
    {
      description:
        'Activate GoGoTrack cashback tracking and return affiliate + app deeplinks.',
      inputSchema: asMcpSchema(activateCashbackSchema),
    },
    async (input: unknown) => {
      const parsedInput = activateCashbackSchema.parse(input);
      return withAuthTool('activate_cashback', () =>
        client.activateCashback(parsedInput),
      );
    },
  );

  server.registerTool(
    'get_timeline',
    {
      description:
        'Fetch the authenticated user GoGoTrack detection and activation history.',
      inputSchema: asMcpSchema(emptyInputSchema),
    },
    async (input: unknown) => {
      emptyInputSchema.parse(input);
      return withAuthTool('get_timeline', () => client.getTimeline());
    },
  );

  return server;
}
