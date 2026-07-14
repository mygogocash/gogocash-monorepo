import { z } from 'zod/v4';

export const searchMerchantsSchema = z.object({
  query: z.string().optional().describe('Merchant name filter, e.g. "Shopee"'),
});

export const matchMerchantSchema = z.object({
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

export const activateCashbackSchema = z.object({
  detectionEventId: z.string().describe('Detection event id from match_merchant'),
  merchantId: z.string(),
  offerId: z.number(),
  networkMerchantId: z.number(),
  merchantName: z.string().optional(),
  packageName: z.string().optional(),
  conversationId: z.string().optional(),
});

export const emptyInputSchema = z.object({});
