"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import GlobeIcon from "../icons/GlobeIcon";

/* ─── Data ──────────────────────────────────────────────────────────── */

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
] as const;

const REGIONS = [
  { code: "TH", label: "Thailand", flag: "🇹🇭" },
  { code: "TW", label: "Taiwan", flag: "🇹🇼" },
  { code: "CN", label: "China", flag: "🇨🇳" },
  { code: "JP", label: "Japan", flag: "🇯🇵" },
  { code: "SG", label: "Singapore", flag: "🇸🇬" },
  { code: "MY", label: "Malaysia", flag: "🇲🇾" },
  { code: "ID", label: "Indonesia", flag: "🇮🇩" },
  { code: "PH", label: "Philippines", flag: "🇵🇭" },
  { code: "VN", label: "Vietnam", flag: "🇻🇳" },
  { code: "SEA", label: "Southeast Asia", flag: "🌏" },
] as const;

type LangCode = (typeof LANGUAGES)[number]["code"];
type RegionCode = (typeof REGIONS)[number]["code"];

/* ─── Shared option button ──────────────────────────────────────────── */

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 ease-out active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00CC99] ${
        selected
          ? "bg-[#E8FAF5] text-[#00CC99]"
          : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

/* ─── Trigger class (matches landing page header) ───────────────────── */

const triggerClass =
  "group flex min-h-11 min-w-11 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm backdrop-blur-sm hover:scale-105 hover:border-[#00CC99]/30 hover:bg-[#E8FAF5] hover:text-[#00CC99] hover:shadow-md motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00CC99]/45 focus-visible:ring-offset-2 aria-expanded:border-[#00CC99]/40 aria-expanded:bg-[#E8FAF5] aria-expanded:text-[#00CC99] transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 ease-out motion-reduce:transition-colors active:scale-[0.98] motion-reduce:active:scale-100";

/* ─── LocalePanel ───────────────────────────────────────────────────── */

export default function LocalePanel() {
  const currentLocale = useLocale();
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState<RegionCode>("TH");
  const rootRef = useRef<HTMLDivElement>(null);

  const switchLocale = useCallback(
    (locale: string) => {
      setOpen(false);
      const currentLoc =
        document.cookie
          .split("; ")
          .find((c) => c.startsWith("NEXT_LOCALE="))
          ?.split("=")[1] || "en";
      const pathname = window.location.pathname;
      const old = pathname.replace(`/${currentLoc}`, "");
      window.location.href = `/${locale}${old}`;
    },
    [],
  );

  /* close on outside click / escape */
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
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Language and region"
      >
        <GlobeIcon
          className={`transition-transform duration-200 ease-out motion-reduce:transition-none ${
            open
              ? "scale-110 text-[#00CC99]"
              : "group-hover:rotate-12 group-hover:scale-105"
          } motion-reduce:group-hover:rotate-0 motion-reduce:group-hover:scale-100`}
          width="22"
          height="22"
          aria-hidden
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-[min(calc(100vw-2rem),18rem)] origin-top-right animate-in fade-in slide-in-from-top-2 rounded-2xl border border-gray-100 bg-white p-4 shadow-lg duration-200"
          role="dialog"
          aria-label="Choose language and region"
        >
          {/* ── Language ─────────────────────── */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Language
            </p>
            <div className="mt-2 flex flex-col gap-0.5">
              {LANGUAGES.map((l) => (
                <OptionButton
                  key={l.code}
                  selected={currentLocale === l.code}
                  onClick={() => switchLocale(l.code)}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {l.flag}
                  </span>
                  <span>{l.label}</span>
                </OptionButton>
              ))}
            </div>
          </div>

          {/* ── Region ───────────────────────── */}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Region
            </p>
            <div className="mt-2 flex max-h-48 flex-col gap-0.5 overflow-y-auto">
              {REGIONS.map((r) => (
                <OptionButton
                  key={r.code}
                  selected={region === r.code}
                  onClick={() => setRegion(r.code)}
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
