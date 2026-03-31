"use client";

import { useTranslations } from "next-intl";
import ProfilePopperCustomerSupportIcon from "@/components/icons/ProfilePopperCustomerSupportIcon";
import { SupportLineOfficialLink } from "@/components/common/SupportLineOfficialLink";
import { cn } from "@/lib/utils";

type ProfileSupportHelpBannerProps = {
  className?: string;
};

/**
 * Shared “contact support” strip for profile subpages (wallet summary, withdraw, etc.).
 * Uses the same LINE Official Account card as the wallet cashback summary.
 */
export function ProfileSupportHelpBanner({ className }: ProfileSupportHelpBannerProps) {
  const t = useTranslations();

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 rounded-2xl bg-[#eaf4ff] p-6 md:flex-row md:items-center",
        className
      )}
    >
      <ProfilePopperCustomerSupportIcon
        width={32}
        height={32}
        fill="#3b3b3b"
        className="shrink-0"
        aria-hidden
      />
      <div className="flex flex-1 flex-col gap-1 text-base leading-normal text-[#3b3b3b]">
        <p>{t("withdrawSupportBannerLine1")}</p>
        <p>{t("withdrawSupportBannerLine2")}</p>
      </div>
      <SupportLineOfficialLink />
    </div>
  );
}
