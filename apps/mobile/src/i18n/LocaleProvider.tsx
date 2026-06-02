import { getLocales } from "expo-localization";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { IntlProvider } from "react-intl";

import { DEFAULT_LOCALE, isSupportedLocale, type Locale, resolveLocale } from "@mobile/i18n/locales";
import { readStoredLocale, writeStoredLocale } from "@mobile/i18n/localeStorage";
import { MESSAGES } from "@mobile/i18n/messages";

type LocaleContextValue = {
  readonly locale: Locale;
  readonly setLocale: (next: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within <LocaleProvider>");
  }
  return ctx;
}

function detectDeviceLocale(): Locale {
  try {
    const first = getLocales?.()[0];
    return resolveLocale(first?.languageTag ?? first?.languageCode ?? null);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  // On mount, prefer a persisted choice; otherwise fall back to the device locale.
  useEffect(() => {
    let active = true;
    void (async () => {
      const stored = await readStoredLocale();
      const next = isSupportedLocale(stored) ? stored : detectDeviceLocale();
      if (active) {
        setLocaleState(next);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        setLocaleState(next);
        void writeStoredLocale(next);
      },
    }),
    [locale]
  );

  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider
        defaultLocale={DEFAULT_LOCALE}
        locale={locale}
        messages={MESSAGES[locale]}
        onError={(err) => {
          // Incremental i18n: un-keyed strings are expected while screens are migrated, so
          // swallow only the missing-translation noise and surface any real formatting error.
          const code = err.code as string;
          if (code === "MISSING_TRANSLATION" || code === "MISSING_DATA") {
            return;
          }
          console.error(err);
        }}
      >
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}
