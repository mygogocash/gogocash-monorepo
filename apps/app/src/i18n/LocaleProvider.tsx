import { getLocales } from "expo-localization";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import { IntlProvider } from "react-intl";

import { DEFAULT_LOCALE, isSupportedLocale, type Locale, resolveLocale } from "@mobile/i18n/locales";
import { readStoredLocale, readStoredLocaleSync, writeStoredLocale } from "@mobile/i18n/localeStorage";
import { MESSAGES } from "@mobile/i18n/messages";
import { readStoredRegion, readStoredRegionSync, writeStoredRegion } from "@mobile/i18n/regionStorage";
import {
  DEFAULT_REGION,
  isSupportedRegion,
  type RegionCode,
} from "@mobile/i18n/regionTypes";

type LocaleContextValue = {
  readonly locale: Locale;
  readonly region: RegionCode;
  readonly setLocale: (next: Locale) => void;
  readonly setRegion: (next: RegionCode) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within <LocaleProvider>");
  }
  return ctx;
}

export function useRegion(): Pick<LocaleContextValue, "region" | "setRegion"> {
  const { region, setRegion } = useLocale();
  return { region, setRegion };
}

function detectDeviceLocale(): Locale {
  try {
    const first = getLocales?.()[0];
    return resolveLocale(first?.languageTag ?? first?.languageCode ?? null);
  } catch {
    return DEFAULT_LOCALE;
  }
}

// Web can read persisted storage synchronously, so we seed the very first render
// with the stored choice (or device locale) — no en->stored flash. Native has no
// synchronous storage API, so it starts unresolved (null) and gates first paint
// on the async read below instead of painting the default locale first.
function resolveInitialLocale(): Locale | null {
  if (Platform.OS === "web") {
    const stored = readStoredLocaleSync();
    return isSupportedLocale(stored) ? stored : detectDeviceLocale();
  }
  return null;
}

function resolveInitialRegion(): RegionCode | null {
  if (Platform.OS === "web") {
    const stored = readStoredRegionSync();
    return isSupportedRegion(stored) ? stored : DEFAULT_REGION;
  }
  return null;
}

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale | null>(resolveInitialLocale);
  const [region, setRegionState] = useState<RegionCode | null>(resolveInitialRegion);

  // Native: resolve the persisted choice (or device locale) asynchronously, then
  // commit it. Web is already seeded synchronously, so this is a no-op there.
  useEffect(() => {
    if (locale !== null && region !== null) {
      return;
    }
    let active = true;
    void (async () => {
      const [storedLocale, storedRegion] = await Promise.all([
        locale === null ? readStoredLocale() : Promise.resolve(null),
        region === null ? readStoredRegion() : Promise.resolve(null),
      ]);
      if (!active) {
        return;
      }
      if (locale === null) {
        const nextLocale = isSupportedLocale(storedLocale) ? storedLocale : detectDeviceLocale();
        setLocaleState(nextLocale);
      }
      if (region === null) {
        const nextRegion = isSupportedRegion(storedRegion) ? storedRegion : DEFAULT_REGION;
        setRegionState(nextRegion);
      }
    })();
    return () => {
      active = false;
    };
    // Runs once on mount; state vars only read to short-circuit when already seeded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<LocaleContextValue | null>(
    () =>
      locale === null || region === null
        ? null
        : {
            locale,
            region,
            setLocale: (next: Locale) => {
              setLocaleState(next);
              void writeStoredLocale(next);
            },
            setRegion: (next: RegionCode) => {
              setRegionState(next);
              void writeStoredRegion(next);
            },
          },
    [locale, region]
  );

  // Native first paint before the async read resolves — render nothing rather
  // than flashing the default locale/region, then swap. Web never hits this (seeded).
  // Placed after all hooks so hook order stays stable across renders.
  if (value === null) {
    return null;
  }

  return (
    <LocaleContext.Provider value={value}>
      <IntlProvider
        defaultLocale={DEFAULT_LOCALE}
        locale={value.locale}
        messages={MESSAGES[value.locale]}
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
