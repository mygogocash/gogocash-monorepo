import { missingOrdersStaticT } from "./missingOrdersStaticT";

/** Purchase / account / extra section titles + helper lines — always from static JSON, never `next-intl` `t()`. */
export function getMissingOrdersSectionHeadings(locale: string) {
  return {
    purchaseTitle: missingOrdersStaticT(locale, "missingOrdersSectionPurchaseTitle"),
    purchaseHelp: missingOrdersStaticT(locale, "missingOrdersSectionPurchaseHelp"),
    accountTitle: missingOrdersStaticT(locale, "missingOrdersSectionAccountTitle"),
    accountHelp: missingOrdersStaticT(locale, "missingOrdersSectionAccountHelp"),
    extraTitle: missingOrdersStaticT(locale, "missingOrdersSectionExtraTitle"),
    extraHelp: missingOrdersStaticT(locale, "missingOrdersSectionExtraHelp"),
  };
}
