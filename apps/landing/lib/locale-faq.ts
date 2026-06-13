import type { FaqEntry } from "@/lib/faq-data";
import { FAQ_ITEMS } from "@/lib/faq-data";
import { THAI_FAQ_ITEMS } from "@/lib/faq-data-th";
import { TAIWAN_FAQ_ITEMS } from "@/lib/faq-data-tw";
import { JAPAN_FAQ_ITEMS } from "@/lib/faq-data-ja";
import { CHINA_FAQ_ITEMS } from "@/lib/faq-data-cn";
import { getSectionedLandingBasePath } from "@/lib/locale-routing";

/** Locales with dedicated FAQ copy (matches marketing home routes). */
export type FaqLocaleId = "en" | "th" | "tw" | "ja" | "cn";

/**
 * Single registry for homepage FAQ lists — add a locale here when adding `faq-data-*.ts`.
 */
export function faqItemsForLocale(id: FaqLocaleId): FaqEntry[] {
  switch (id) {
    case "en":
      return FAQ_ITEMS;
    case "th":
      return THAI_FAQ_ITEMS;
    case "tw":
      return TAIWAN_FAQ_ITEMS;
    case "ja":
      return JAPAN_FAQ_ITEMS;
    case "cn":
      return CHINA_FAQ_ITEMS;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

/** Map a pathname to FAQ locale (`/`, `/en`, `/id` → English copy). */
export function faqLocaleFromLandingPath(pathname: string): FaqLocaleId {
  const base = getSectionedLandingBasePath(pathname);
  if (base === "/th") return "th";
  if (base === "/tw") return "tw";
  if (base === "/ja") return "ja";
  if (base === "/cn") return "cn";
  return "en";
}
