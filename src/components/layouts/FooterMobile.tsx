"use client";
import { useSession } from "next-auth/react";
import HomeIcon from "../icons/HomeIcon";
import ProfileIcon from "../icons/ProfileIcon";
import ShopIcon from "../icons/ShopIcon";
import GoLinkIcon from "../icons/GoLinkIcon";
import WalletIcon from "../icons/WalletIcon";
import { Link, getPathname, usePathname } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import QuestIcon from "../icons/QuestIcon";
import { mobileNavItems, type NavigationItem } from "@/constants/navigation";
import { BRAND_MINT_HEX } from "@/constants/brand";
import { useGolinkMobileSheet } from "@/components/providers/GolinkMobileSheetProvider";

function mobileNavLabel(item: NavigationItem, t: ReturnType<typeof useTranslations>): string {
  return item.translationKey ? t(item.translationKey) : item.label;
}

const FooterMobile = () => {
  const pathname = usePathname();
  const { open: openGolinkSheet, isOpen: isGolinkSheetOpen } = useGolinkMobileSheet();
  const { data: session } = useSession();
  const locale = useLocale();
  const t = useTranslations();
  const signInHref = getPathname({ locale, href: "/login" });

  const getIcon = (icon?: string, fill?: string) => {
    switch (icon) {
      case "home":
        return <HomeIcon fill={fill} />;
      case "shop":
        return <ShopIcon fill={fill} />;
      case "golink":
        return <GoLinkIcon fill={fill} />;
      case "wallet":
        return <WalletIcon fill={fill} />;
      case "quest":
        return <QuestIcon fill={fill} />;
      case "profile":
        return <ProfileIcon fill={fill} />;
      default:
        return null;
    }
  };

  return (
    <footer className="gc-bottom-safe fixed inset-x-0 bottom-0 z-50 pl-[max(0.5rem,var(--gc-safe-left))] pr-[max(0.5rem,var(--gc-safe-right))] md:hidden">
      <div className="mx-auto w-full max-w-md rounded-[28px] border border-white/60 bg-white/90 px-3 py-3 shadow-[0_-8px_30px_rgba(16,34,23,0.14)] backdrop-blur-xl">
        <div className="flex items-end justify-between gap-1">
          {mobileNavItems.map((item) => {
            const onGolinkRoute = item.href === "/golink" && pathname === item.href;
            const profileUnauth = item.icon === "profile" && !session?.user;
            const effectiveHref = profileUnauth ? "/login" : item.href;
            const active =
              item.href === "/golink"
                ? onGolinkRoute || isGolinkSheetOpen
                : pathname === effectiveHref;
            const icon = getIcon(item.icon, active ? BRAND_MINT_HEX : "#6D7B73");

            if (item.icon === "golink" && !onGolinkRoute) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => openGolinkSheet()}
                  className={`flex flex-1 flex-col items-center gap-2 rounded-2xl px-2 py-1.5 ${
                    active ? "bg-(--gc-primary-soft)" : ""
                  }`}
                >
                  {icon}
                  <span
                    className={`text-[11px] font-normal ${
                      active ? "text-(--gc-primary)" : "text-[#6D7B73]"
                    }`}
                  >
                    {mobileNavLabel(item, t)}
                  </span>
                </button>
              );
            }

            if (item.icon === "wallet") {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative -mt-8 flex flex-1 flex-col items-center"
                >
                  <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full border-8 border-(--gc-primary-soft) bg-(--gc-primary) shadow-[0_16px_30px_rgba(0,204,153,0.28)]">
                    {getIcon(item.icon, "#FFFFFF")}
                  </div>
                  <span className="mt-2 text-[11px] font-normal text-(--gc-accent)">
                    {mobileNavLabel(item, t)}
                  </span>
                </Link>
              );
            }

            if (item.icon === "profile" && session?.user) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-1 flex-col items-center gap-2 rounded-2xl px-2 py-1.5 ${
                    active ? "bg-(--gc-primary-soft)" : ""
                  }`}
                >
                  <Image
                    src="/profile/profile.png"
                    width={96}
                    height={96}
                    sizes="28px"
                    quality={92}
                    alt="profile"
                    className="h-7 w-7 rounded-full object-cover"
                  />
                  <span
                    className={`text-[11px] font-normal ${
                      active ? "text-(--gc-primary)" : "text-[#6D7B73]"
                    }`}
                  >
                    {mobileNavLabel(item, t)}
                  </span>
                </Link>
              );
            }

            if (item.icon === "profile" && !session?.user) {
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    window.location.assign(signInHref);
                  }}
                  className={`flex flex-1 flex-col items-center gap-2 rounded-2xl px-2 py-1.5 ${
                    active ? "bg-(--gc-primary-soft)" : ""
                  }`}
                >
                  {icon}
                  <span
                    className={`text-[11px] font-normal ${
                      active ? "text-(--gc-primary)" : "text-[#6D7B73]"
                    }`}
                  >
                    {mobileNavLabel(item, t)}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-2 rounded-2xl px-2 py-1.5 ${
                  active ? "bg-(--gc-primary-soft)" : ""
                }`}
              >
                {icon}
                <span
                  className={`text-[11px] font-normal ${
                    active ? "text-(--gc-primary)" : "text-[#6D7B73]"
                  }`}
                >
                  {mobileNavLabel(item, t)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </footer>
  );
};

export default FooterMobile;
