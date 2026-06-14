import { useCallback } from "react";
import { useIntl } from "react-intl";

import { isSupportedLocale } from "@mobile/i18n/locales";
import { translateCopy } from "@mobile/i18n/messages";

// Thin hook around `translateCopy`: reads the active locale from the IntlProvider (mounted by
// LocaleProvider) and returns a `tc(englishString)` translator that reuses the web catalogs and
// falls back to the input English. All the logic lives in `translateCopy` (pure, source-tested).
export function useCopy(): (english: string) => string {
  const { locale } = useIntl();
  const active = isSupportedLocale(locale) ? locale : "en";
  return useCallback((english: string): string => translateCopy(english, active), [active]);
}
