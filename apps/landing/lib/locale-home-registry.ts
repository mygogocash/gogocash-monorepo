import type { LocaleHomeCopy } from "@/lib/locale-home-copy";
import { TH_HOME } from "@/lib/copy-th-home";
import { JA_HOME } from "@/lib/copy-ja-home";
import { TW_HOME } from "@/lib/copy-tw-home";
import { CN_HOME } from "@/lib/copy-cn-home";

/** Locales that use `LocaleHomePage` + `LocaleHomeCopy` (path roots `/th`, `/tw`, `/ja`, `/cn`). */
export const LOCALE_HOME_IDS = ["th", "tw", "ja", "cn"] as const;

export type LocaleHomeId = (typeof LOCALE_HOME_IDS)[number];

/**
 * Single registry for localized marketing home copy — add a locale here when adding `copy-*-home.ts`.
 */
export const LOCALE_HOME_COPY: Record<LocaleHomeId, LocaleHomeCopy> = {
  th: TH_HOME,
  tw: TW_HOME,
  ja: JA_HOME,
  cn: CN_HOME,
};

export function localeHomeCopy(id: LocaleHomeId): LocaleHomeCopy {
  return LOCALE_HOME_COPY[id];
}
