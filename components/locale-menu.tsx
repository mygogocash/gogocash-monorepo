"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Globe } from "@/components/icons";
import {
  LOCALE_EVENT_NAME,
  persistLocale,
  readStoredLocale,
} from "@/lib/locale-storage";
import {
  DEFAULT_LOCALE,
  LANGUAGES,
  REGIONS,
  resolveLanguageSelection,
  type LangCode,
  type RegionCode,
  type StoredLocale,
} from "@/lib/locale-routing";
import {
  logLocaleLanguageSelect,
  logLocaleRegionSelect,
} from "@/lib/analytics-client";
import {
  twDurButton,
  twEaseStandard,
  twFocusRingPrimary,
  twPressSm,
  twTransitionButton,
} from "@/lib/motion-styles";

function useLocalePreference() {
  const [locale, setLocale] = useState<StoredLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    const apply = (next: StoredLocale) => {
      setLocale((prev) => {
        if (prev.lang === next.lang && prev.region === next.region) return prev;
        return { lang: next.lang, region: next.region };
      });
      document.documentElement.lang = next.lang;
    };

    apply(readStoredLocale());

    const onLocale = (e: Event) => {
      const ce = e as CustomEvent<StoredLocale>;
      apply(ce.detail ?? readStoredLocale());
    };
    window.addEventListener(LOCALE_EVENT_NAME, onLocale);
    return () => window.removeEventListener(LOCALE_EVENT_NAME, onLocale);
  }, []);

  const setRegion = useCallback((r: RegionCode) => {
    const { lang } = readStoredLocale();
    persistLocale({ lang, region: r });
  }, []);

  return {
    lang: locale.lang,
    region: locale.region,
    setRegion,
  };
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary} ${
        selected
          ? "bg-surface-green text-primary"
          : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

export function LocaleDropdown() {
  const router = useRouter();
  const { lang, region, setRegion } = useLocalePreference();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const chooseLanguage = useCallback(
    (code: LangCode) => {
      setOpen(false);
      const { path, locale } = resolveLanguageSelection(
        code,
        readStoredLocale().region,
      );
      persistLocale(locale);
      logLocaleLanguageSelect(code);
      router.push(path);
    },
    [router],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div
      className="relative animate-header-enter motion-reduce:animate-none motion-reduce:opacity-100 [animation-delay:140ms] [animation-fill-mode:both]"
      ref={rootRef}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`group flex min-h-11 min-w-11 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm backdrop-blur-sm hover:scale-105 hover:border-primary/30 hover:bg-surface-green hover:text-primary hover:shadow-md motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 aria-expanded:border-primary/40 aria-expanded:bg-surface-green aria-expanded:text-primary ${twTransitionButton} ${twPressSm}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Language and region"
      >
        <Globe
          size={22}
          aria-hidden
          className={`transition-transform ${twDurButton} ${twEaseStandard} motion-reduce:transition-none ${
            open
              ? "scale-110 text-primary"
              : "group-hover:rotate-12 group-hover:scale-105"
          } motion-reduce:group-hover:rotate-0 motion-reduce:group-hover:scale-100`}
        />
      </button>
      {open && (
        <div
          className={`z-[60] w-[min(calc(100vw-2rem),18rem)] rounded-2xl border border-gray-100 bg-white p-4 shadow-lg motion-reduce:animate-none animate-locale-panel-in
            max-md:fixed max-md:left-1/2 max-md:right-auto max-md:top-[calc(env(safe-area-inset-top,0px)+4.25rem)] max-md:max-h-[min(32rem,calc(100dvh-env(safe-area-inset-top,0px)-5rem))] max-md:-translate-x-1/2 max-md:overflow-y-auto max-md:origin-top
            md:absolute md:left-auto md:right-0 md:top-[calc(100%+0.5rem)] md:max-h-none md:translate-x-0 md:overflow-visible md:origin-top-right`}
          role="dialog"
          aria-label="Choose language and region"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Language
            </p>
            <div className="mt-2 flex flex-col gap-0.5">
              {LANGUAGES.map((l) => (
                <OptionButton
                  key={l.code}
                  selected={lang === l.code}
                  onClick={() => chooseLanguage(l.code)}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {l.flag}
                  </span>
                  <span>{l.label}</span>
                </OptionButton>
              ))}
            </div>
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Region
            </p>
            <div className="mt-2 flex max-h-48 flex-col gap-0.5 overflow-y-auto">
              {REGIONS.map((r) => (
                <OptionButton
                  key={r.code}
                  selected={region === r.code}
                  onClick={() => {
                    logLocaleRegionSelect(r.code);
                    setRegion(r.code);
                  }}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {r.flag}
                  </span>
                  <span>{r.label}</span>
                </OptionButton>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
