"use client";

import { ACCOUNT_SETTINGS_COMMUNITY } from "@/constants/accountSettingsCommunity";
import { TRANSLATIONS_DISABLED } from "@/constants/translations";
import LineAppIcon from "@/components/icons/social/LineAppIcon";
import { usePathname, useRouter } from "@/i18n/navigation";
import SubPage from "../layout/SubPage";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import { Switch } from "@mui/material";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

const LS_LINE = "gogocash.account.notify.line";
const LS_EMAIL = "gogocash.account.notify.email";

const notifySwitchSx = {
  width: 36,
  height: 20,
  padding: 0,
  "& .MuiSwitch-switchBase": {
    padding: "2px",
    "&.Mui-checked": {
      transform: "translateX(16px)",
      color: "#fff",
      "& + .MuiSwitch-track": {
        backgroundColor: "#00cc99",
        opacity: 1,
      },
    },
  },
  "& .MuiSwitch-thumb": {
    width: 16,
    height: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
  },
  "& .MuiSwitch-track": {
    borderRadius: 99,
    opacity: 1,
    backgroundColor: "#f0f0f0",
  },
} as const;

function CommunityCard({
  href,
  joinLabel,
  platformName,
  bannerSrc,
}: {
  href: string;
  joinLabel: string;
  platformName: string;
  bannerSrc: string;
}) {
  const alt = `${joinLabel} ${platformName}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="relative block aspect-[224/117] overflow-hidden rounded-2xl border border-black/[0.12] no-underline shadow-sm transition-[opacity,box-shadow] hover:opacity-95 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cc99] sm:rounded-3xl sm:border-[#3b3b3b]"
    >
      <Image
        src={bannerSrc}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 50vw, 33vw"
      />
    </a>
  );
}

/**
 * GoGoCash 1.1 — Account Settings (notifications + community).
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8367-126049
 */
export default function AccountSettingsView() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [lineOn, setLineOn] = useState(false);
  const [emailOn, setEmailOn] = useState(true);

  useEffect(() => {
    try {
      const l = localStorage.getItem(LS_LINE);
      const e = localStorage.getItem(LS_EMAIL);
      /* Sync toggles from localStorage after mount (defaults match Figma: Line off, Email on). */
      /* eslint-disable react-hooks/set-state-in-effect -- client-only preference hydration */
      if (l !== null) setLineOn(l === "true");
      if (e !== null) setEmailOn(e === "true");
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      /* ignore */
    }
  }, []);

  const setLine = useCallback((v: boolean) => {
    setLineOn(v);
    try {
      localStorage.setItem(LS_LINE, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  const setEmail = useCallback((v: boolean) => {
    setEmailOn(v);
    try {
      localStorage.setItem(LS_EMAIL, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  function switchLocale(locale: string) {
    router.replace(pathname || "/", {
      locale: locale as "en" | "th",
    });
  }

  return (
    <SubPage title="Account Settings" showSubMenu>
      <div className="flex w-full max-w-[696px] flex-col gap-10">
        {!TRANSLATIONS_DISABLED ? (
          <section className="flex flex-col gap-3" aria-labelledby="account-settings-lang-heading">
            <h2 id="account-settings-lang-heading" className="text-lg font-semibold text-[#3b3b3b]">
              {t("accountSettingsDisplayLanguage")}
            </h2>
            {(
              [
                { name: "English", locale: "en" as const },
                { name: "ไทย", locale: "th" as const },
              ] as const
            ).map((item) => (
              <div
                key={item.locale}
                onClick={() => switchLocale(item.locale)}
                className="flex h-14 w-full cursor-pointer items-center gap-4 rounded-2xl border border-[rgba(152,152,152,0.4)] px-4"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    switchLocale(item.locale);
                  }
                }}
              >
                <span className="text-base text-black">{item.name}</span>
              </div>
            ))}
          </section>
        ) : null}

        <section className="flex flex-col gap-4" aria-labelledby="account-settings-notify-heading">
          <h2
            id="account-settings-notify-heading"
            className="text-lg font-semibold text-[#3b3b3b] md:text-xl"
          >
            {t("accountSettingsNotificationsHeading")}
          </h2>
          <div className="flex flex-col gap-2">
            <div className="flex min-h-14 items-center gap-2 rounded-2xl border border-[rgba(152,152,152,0.4)] px-4 py-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                <LineAppIcon className="shrink-0 text-[#7f7f7f]" aria-hidden />
                <span className="min-w-0 truncate text-base text-[#7f7f7f]">
                  {t("accountSettingsNotifyLine")}
                </span>
                <span className="shrink-0 rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-xs font-medium text-[#6b7280]">
                  {t("accountSettingsNotifyComingSoon")}
                </span>
              </div>
              <Switch
                checked={lineOn}
                disabled
                onChange={(_, v) => setLine(v)}
                inputProps={{ "aria-label": t("accountSettingsNotifyLineAria") }}
                sx={notifySwitchSx}
              />
            </div>
            <div className="flex min-h-14 items-center gap-2 rounded-2xl border border-[rgba(127,127,127,0.4)] px-4 py-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                <EmailOutlined sx={{ fontSize: 24, color: "#7f7f7f" }} aria-hidden />
                <span className="min-w-0 truncate text-base text-[#7f7f7f]">
                  {t("accountSettingsNotifyEmail")}
                </span>
                <span className="shrink-0 rounded-full bg-[#f0f0f0] px-2.5 py-0.5 text-xs font-medium text-[#6b7280]">
                  {t("accountSettingsNotifyComingSoon")}
                </span>
              </div>
              <Switch
                checked={emailOn}
                disabled
                onChange={(_, v) => setEmail(v)}
                inputProps={{ "aria-label": t("accountSettingsNotifyEmailAria") }}
                sx={notifySwitchSx}
              />
            </div>
          </div>
        </section>

        <section
          className="flex flex-col gap-4"
          aria-labelledby="account-settings-community-heading"
        >
          <h2
            id="account-settings-community-heading"
            className="text-lg font-semibold text-[#3b3b3b] md:text-xl"
          >
            {t("accountSettingsCommunityHeading")}
          </h2>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-3">
            {ACCOUNT_SETTINGS_COMMUNITY.map((entry) => (
              <CommunityCard
                key={entry.id}
                href={entry.href}
                joinLabel={t("accountSettingsJoinUsOn")}
                platformName={t(entry.nameKey)}
                bannerSrc={entry.bannerSrc}
              />
            ))}
          </div>
        </section>
      </div>
    </SubPage>
  );
}
