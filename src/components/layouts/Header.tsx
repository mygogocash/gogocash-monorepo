"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import React, { useMemo } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import Button from "../common/Button";
import { OptionsCountries, ResponseCountry } from "@/interfaces/country";
import { updateCountry } from "@/lib/services/auth";
import { fetcher } from "@/lib/axios/client";
import { User } from "@/interfaces/auth";
import LocalePanel from "./LocalePanel";
import { Link, getPathname, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import SignInNavGraphic from "./SignInNavGraphic";
import { LogoMark } from "@/components/brand/LogoMark";
import { LAYOUT_CONTENT_SHELL_CLASS } from "@/constants/layout-shell";
import { TRANSLATIONS_DISABLED } from "@/constants/translations";
import {
  designSystemColor,
  designSystemRadiusPx,
  designSystemSpacePx,
  designSystemTypographyPx,
} from "@/constants/design-system";

const ProfileBar = dynamic(() => import("@/features/profile/component/ProfileBar"), {
  ssr: false,
});

const SearchShop = dynamic(() => import("@/features/search/component/SearchShop"), {
  ssr: false,
});

const localeOptions = [
  { label: "English", code: "EN", value: "en" },
  { label: "Thai", code: "TH", value: "th" },
];

const headerShellClass = `${LAYOUT_CONTENT_SHELL_CLASS} flex items-center`;

/** Locale trigger — glassy neutral circle; mint on hover / open (matches landing page header). */
const headerLocaleTriggerClass =
  "group flex min-h-11 min-w-11 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm backdrop-blur-sm hover:scale-105 hover:border-[#00CC99]/30 hover:bg-[#E8FAF5] hover:text-[#00CC99] hover:shadow-md motion-reduce:hover:scale-100 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00CC99]/45 focus-visible:ring-offset-2 aria-expanded:border-[#00CC99]/40 aria-expanded:bg-[#E8FAF5] aria-expanded:text-[#00CC99] transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 ease-out motion-reduce:transition-colors active:scale-[0.98] motion-reduce:active:scale-100";

/**
 * GoGoCash 1.1 — Preferences dropdown trigger
 * @see Figma 8921:156504 (selected), 265:91314 (states)
 * Spec: radius lg 16px, px 16 py 12, inner row 16px tall, body-s 14px / gray-3, chevron 12px mint, gap 8 flag→label
 */
const preferencesFieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: `${designSystemRadiusPx.lg}px`,
    minHeight: 40,
    boxSizing: "border-box",
    paddingLeft: `${designSystemSpacePx.paddingS}px`,
    paddingRight: `${designSystemSpacePx.paddingS}px`,
    paddingTop: "12px",
    paddingBottom: "12px",
    display: "flex",
    alignItems: "center",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: designSystemColor.mint,
      borderWidth: 1,
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: designSystemColor.mint,
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
      borderColor: designSystemColor.mint,
      borderWidth: 2,
    },
    "& .MuiAutocomplete-input": {
      padding: "0 !important",
      minHeight: 16,
      height: 16,
      fontSize: `${designSystemTypographyPx.bodyS}px`,
      lineHeight: `${designSystemTypographyPx.lead}px`,
      color: designSystemColor.textGray3,
      boxSizing: "border-box",
    },
    "& .MuiAutocomplete-input::placeholder": {
      fontSize: `${designSystemTypographyPx.bodyXs}px`,
      lineHeight: `${designSystemTypographyPx.lead}px`,
      color: designSystemColor.mint,
      opacity: 1,
    },
    "& .MuiAutocomplete-endAdornment": {
      position: "static",
      top: "auto",
      right: "auto",
      transform: "none",
      marginLeft: `${designSystemSpacePx.gap8}px`,
      height: 16,
      display: "flex",
      alignItems: "center",
    },
  },
} as const;

const preferencesListboxPaperSx = {
  borderRadius: `${designSystemRadiusPx.lg}px`,
  border: `1px solid ${designSystemColor.gray200}`,
  boxShadow: "0px 4px 12px rgba(0,0,0,0.2)",
  mt: 0.5,
  overflow: "hidden",
} as const;

const preferencesListboxSx = {
  maxHeight: 280,
  py: 0.5,
  px: 0.5,
  "& .MuiAutocomplete-option": {
    minHeight: "auto",
  },
} as const;

const preferencesPopupIndicatorSx = {
  color: designSystemColor.mint,
  "& svg": { fontSize: 12 },
} as const;

function flagPngForCountry(country: ResponseCountry): string {
  const png = country.flags?.png;
  if (typeof png === "string" && png.length > 0) return png;
  return `https://flagcdn.com/w40/${country.cca2.toLowerCase()}.png`;
}

function QuestNavLink({ label }: { label: string }) {
  return (
    <Link
      href="/quest"
      className="relative block h-12 w-[169px] shrink-0 overflow-hidden rounded-full no-underline transition hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007b5c]"
      aria-label={label}
    >
      <Image
        src="/nav/quest-header.png"
        alt=""
        width={169}
        height={48}
        className="pointer-events-none block h-12 w-[169px] select-none object-cover object-center"
        priority
      />
    </Link>
  );
}

const Header = () => {
  const { data: session } = useSession();
  const locale = useLocale();
  const signInHref = getPathname({ locale, href: "/login" });
  const [open, setOpen] = React.useState(false);
  const [selectCountry, setSelectCountry] = React.useState<OptionsCountries | null>({
    label: "Thailand",
    code: "TH",
    value: "Thailand",
  });
  const t = useTranslations();
  const pathname = usePathname();

  const { data: countries } = useQuery<ResponseCountry[]>({
    queryKey: ["/api/countries"],
    queryFn: () => axios.get("/api/countries").then((res) => res.data),
    staleTime: Infinity,
  });

  const { data: user, refetch: refetchUser } = useQuery<User>({
    queryKey: ["userProfile"],
    queryFn: () => fetcher("/user/profile"),
    enabled: session?.user != null,
  });

  const listCountries = useMemo<OptionsCountries[]>(() => {
    return countries && countries.length > 0
      ? countries.map((country: ResponseCountry) => ({
          label: country.name.common,
          code: country.cca2,
          value: country.name.common,
          flagPng: flagPngForCountry(country),
        }))
      : [];
  }, [countries]);

  const countryAutocompleteValue = useMemo(() => {
    if (!selectCountry) return null;
    const match = listCountries.find((c) => c.code === selectCountry.code);
    return match ?? selectCountry;
  }, [listCountries, selectCountry]);

  const { isPending: loadingUpdateCountry, mutateAsync: mutateUpdateCountry } = useMutation({
    mutationKey: ["mutateUpdateCountry"],
    mutationFn: updateCountry,
    onSuccess(data: unknown) {
      if (data) {
        refetchUser();
        setOpen(false);
        toast.success(t("preferencesUpdateCountrySuccess"));
      }
    },
    onError(error: AxiosError) {
      toast.error(error.message || "Failed to update country");
    },
  });

  const switchLocale = (locale: string) => {
    const currentLocale =
      document.cookie
        .split("; ")
        .find((row) => row.startsWith("NEXT_LOCALE="))
        ?.split("=")[1] || "en";
    const old = pathname.replace(`/${currentLocale}`, "");

    window.location.href = `/${locale}${old}`;
  };

  return (
    <header className="sticky top-0 z-40 hidden bg-white md:block">
      <div className={`${headerShellClass} h-20 justify-between gap-4 lg:gap-5`}>
        <div className="flex min-w-0 items-center gap-4 lg:gap-5">
          <Link
            href="/"
            className="flex min-h-11 min-w-0 shrink-0 items-center gap-2 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007b5c]"
          >
            <LogoMark />
            <span className="text-xl font-bold tracking-tight text-[#1f2937]">{t("GoGoCash")}</span>
          </Link>
        </div>

        <div className="flex min-w-0 flex-1 justify-center px-2">
          {session ? <SearchShop /> : null}
        </div>

        <div className="flex shrink-0 items-center gap-4">
          {session ? (
            <>
              <QuestNavLink label={t("navQuest")} />
              <ProfileBar />
              <LocalePanel />
            </>
          ) : (
            <>
              <QuestNavLink label={t("navQuest")} />
              <Link
                href="/login"
                className="inline-flex h-12 w-[160px] shrink-0 items-center justify-center overflow-hidden rounded-full no-underline transition hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00CC99]"
                aria-label={t("navSignIn")}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.assign(signInHref);
                }}
              >
                <SignInNavGraphic />
              </Link>
              <LocalePanel />
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
