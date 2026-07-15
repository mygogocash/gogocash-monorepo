import { z as z3 } from 'zod/v3';
import { toolFieldDescriptions } from './toolSchemas.js';

// The hoisted MCP SDK currently resolves Zod 3 while this workspace validates
// handlers with Zod 4. Supplying the SDK a Zod 3 compatibility schema keeps its
// JSON Schema converter on the same runtime instance, preserving descriptions
// and object strictness. Every handler parses again with the Zod 4 schema.
export const advertisedSearchMerchantsSchema = z3.object({
  query: z3.string().optional().describe(toolFieldDescriptions.searchQuery),
});

export const advertisedMatchMerchantSchema = z3.object({
  merchantHint: z3
    .string()
    .optional()
    .describe(toolFieldDescriptions.merchantHint),
  url: z3.string().optional().describe(toolFieldDescriptions.merchantUrl),
  packageName: z3
    .string()
    .optional()
    .describe(toolFieldDescriptions.packageName),
  platform: z3
    .enum(['android', 'ios', 'web', 'line'])
    .optional()
    .describe(toolFieldDescriptions.platform),
  conversationId: z3
    .string()
    .optional()
    .describe(toolFieldDescriptions.conversationId),
});

export const advertisedActivateCashbackSchema = z3.object({
  detectionEventId: z3
    .string()
    .describe(toolFieldDescriptions.detectionEventId),
  merchantId: z3.string(),
  offerId: z3.number(),
  networkMerchantId: z3.number(),
  merchantName: z3.string().optional(),
  packageName: z3.string().optional(),
  conversationId: z3.string().optional(),
});

export const advertisedEmptyInputSchema = z3.object({});
