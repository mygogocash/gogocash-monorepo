"use client";
import { useSession } from "next-auth/react";
import HomeIcon from "../icons/HomeIcon";
import ProfileIcon from "../icons/ProfileIcon";
import ShopIcon from "../icons/ShopIcon";
import WalletIcon from "../icons/WalletIcon";
import { Link, getPathname, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import Image from "next/image";
import QuestIcon from "../icons/QuestIcon";
import { mobileNavItems } from "@/constants/navigation";

const FooterMobile = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const locale = useLocale();
  const signInHref = getPathname({ locale, href: "/login" });

  const getIcon = (icon?: string, fill?: string) => {
    switch (icon) {
      case "home":
        return <HomeIcon fill={fill} />;
      case "shop":
        return <ShopIcon fill={fill} />;
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
    <footer className="gc-bottom-safe fixed inset-x-0 bottom-0 z-50 md:hidden">
      <div className="mx-auto w-[calc(100%-1rem)] max-w-md rounded-[28px] border border-white/60 bg-white/90 px-3 py-3 shadow-[0_-8px_30px_rgba(16,34,23,0.14)] backdrop-blur-xl">
        <div className="flex items-end justify-between gap-1">
          {mobileNavItems.map((item) => {
            const active = pathname === item.href;
            const icon = getIcon(item.icon, active ? "#00B14F" : "#6D7B73");

            if (item.icon === "wallet") {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative -mt-8 flex flex-1 flex-col items-center"
                >
                  <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full border-8 border-[#F4F6EF] bg-[#00B14F] shadow-[0_16px_30px_rgba(0,177,79,0.28)]">
                    {getIcon(item.icon, "#FFFFFF")}
                  </div>
                  <span className="mt-2 text-[11px] font-semibold text-[#103522]">
                    {item.label}
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
                    active ? "bg-[#E7F8EE]" : ""
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
                    className={`text-[11px] font-semibold ${
                      active ? "text-[#00B14F]" : "text-[#6D7B73]"
                    }`}
                  >
                    {item.label}
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
                    active ? "bg-[#E7F8EE]" : ""
                  }`}
                >
                  {icon}
                  <span
                    className={`text-[11px] font-semibold ${
                      active ? "text-[#00B14F]" : "text-[#6D7B73]"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center gap-2 rounded-2xl px-2 py-1.5 ${
                  active ? "bg-[#E7F8EE]" : ""
                }`}
              >
                {icon}
                <span
                  className={`text-[11px] font-semibold ${
                    active ? "text-[#00B14F]" : "text-[#6D7B73]"
                  }`}
                >
                  {item.label}
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
