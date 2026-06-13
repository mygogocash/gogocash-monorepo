import { mergeGogoquestHistoryMessages } from "./gogoquestHistoryMerge";
import { mergeHeaderSearchMessages } from "./headerSearchMerge";
import { mergeMerchantCashbackTipsMessages } from "./merchantCashbackTipsMerge";
import { mergeMissingOrdersMessages } from "./missingOrdersMerge";
import { mergePdpaConsentBannerMessages } from "./pdpaConsentBannerMerge";
import { mergeProfilePopperMessages } from "./profilePopperMerge";
import { mergeWithdrawCtaMessages } from "./withdrawCtaMerge";

/** Active message locales use the same pair as `request.ts` static imports. */
export type MessageCatalog = "en" | "th";

type Merger = (base: Record<string, unknown>, catalog: MessageCatalog) => Record<string, unknown>;

/**
 * Ordered pipeline of patches applied to the static locale JSON before it is passed to
 * `NextIntlClientProvider`. Order matches the historical nested merge in `request.ts`.
 *
 * Each merger re-injects keys that Turbopack / RSC serialization can drop from `messages`.
 */
const MESSAGE_MERGE_PIPELINE: Merger[] = [
  mergeMissingOrdersMessages,
  mergeWithdrawCtaMessages,
  mergeProfilePopperMessages,
  mergeHeaderSearchMessages,
  mergePdpaConsentBannerMessages,
  mergeGogoquestHistoryMessages,
  mergeMerchantCashbackTipsMessages,
];

export function buildMessagesForLocale(
  base: Record<string, unknown>,
  catalog: MessageCatalog
): Record<string, unknown> {
  return MESSAGE_MERGE_PIPELINE.reduce(
    (acc, merge) => merge(acc, catalog) as Record<string, unknown>,
    base
  );
}
