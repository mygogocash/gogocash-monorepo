import { z } from 'zod/v4';

export const toolFieldDescriptions = {
  searchQuery: 'Merchant name filter, e.g. "Shopee"',
  merchantHint: 'Natural-language merchant name',
  merchantUrl: 'Merchant URL if known',
  packageName: 'Android package name if known',
  platform: 'Customer platform (default web)',
  conversationId: 'Optional agent conversation id for analytics',
  detectionEventId: 'Detection event id from match_merchant',
} as const;

export const searchMerchantsSchema = z.object({
  query: z.string().optional().describe(toolFieldDescriptions.searchQuery),
});

export const matchMerchantSchema = z.object({
  merchantHint: z
    .string()
    .optional()
    .describe(toolFieldDescriptions.merchantHint),
  url: z.string().optional().describe(toolFieldDescriptions.merchantUrl),
  packageName: z
    .string()
    .optional()
    .describe(toolFieldDescriptions.packageName),
  platform: z
    .enum(['android', 'ios', 'web', 'line'])
    .optional()
    .describe(toolFieldDescriptions.platform),
  conversationId: z
    .string()
    .optional()
    .describe(toolFieldDescriptions.conversationId),
});

export const activateCashbackSchema = z.object({
  detectionEventId: z
    .string()
    .describe(toolFieldDescriptions.detectionEventId),
  merchantId: z.string(),
  offerId: z.number(),
  networkMerchantId: z.number(),
  merchantName: z.string().optional(),
  packageName: z.string().optional(),
  conversationId: z.string().optional(),
});

export const emptyInputSchema = z.object({});
