"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import LocalePanel from "./LocalePanel";
import { Link, getPathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import SignInNavGraphic from "./SignInNavGraphic";
import { LogoMark } from "@/components/brand/LogoMark";
import { LAYOUT_CONTENT_SHELL_CLASS } from "@/constants/layout-shell";

const ProfileBar = dynamic(() => import("@/features/profile/component/ProfileBar"), {
  ssr: false,
});

const SearchShop = dynamic(() => import("@/features/search/component/SearchShop"), {
  ssr: false,
});

const headerShellClass = `${LAYOUT_CONTENT_SHELL_CLASS} flex items-center`;

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
  const t = useTranslations();

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
