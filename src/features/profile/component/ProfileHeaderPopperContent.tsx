"use client";

import FavoriteIcon from "@/components/icons/FavoriteIcon";
import LogoutIcon from "@/components/icons/LogoutIcon";
import ProfilePopperCustomerSupportIcon from "@/components/icons/ProfilePopperCustomerSupportIcon";
import ProfilePopperFaqBubbleIcon from "@/components/icons/ProfilePopperFaqBubbleIcon";
import ProfilePopperMissingOrdersIcon from "@/components/icons/ProfilePopperMissingOrdersIcon";
import ProfileAddIcon from "@/components/icons/ProfileAddIcon";
import ProfileIcon from "@/components/icons/ProfileIcon";
import WalletIcon from "@/components/icons/WalletIcon";
import { WalletSummaryHeroCard } from "@/components/common/WalletSummaryHeroCard";
import { getSupportHref } from "@/constants/navigation";
import { Link } from "@/i18n/navigation";
import { useCrossmintLoginContext } from "@/providers/CrossmintLoginContext";
import { Divider } from "@mui/material";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

const ICON_TEAL = "#00AA80";

function MenuRowLink({
  href,
  external,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  external?: boolean;
  icon: ReactNode;
  label: string;
  onNavigate?: () => void;
}) {
  const row = (
    <div className="flex h-[52px] w-full max-h-[52px] cursor-pointer items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-black/3">
      <span className="flex size-6 shrink-0 items-center justify-center">{icon}</span>
      <span className="text-base font-normal leading-normal text-[#3B3B3B]">{label}</span>
    </div>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full no-underline"
        onClick={() => onNavigate?.()}
      >
        {row}
      </a>
    );
  }
  return (
    <Link href={href} className="block w-full no-underline" onClick={() => onNavigate?.()}>
      {row}
    </Link>
  );
}

function MenuRowButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer flex-col items-stretch border-0 bg-transparent p-0 text-left"
    >
      <div className="flex h-[52px] w-full max-h-[52px] items-center gap-4 rounded-2xl p-4 transition-colors hover:bg-black/3">
        <span className="flex size-6 shrink-0 items-center justify-center">{icon}</span>
        <span className="text-base font-normal leading-normal text-[#3B3B3B]">{label}</span>
      </div>
    </button>
  );
}

/**
 * Header account dropdown — wallet summary + menu.
 * Wallet card: Figma GoGoCash 1.1 node 8369-116145 (Wallet).
 * Menu list: Figma 9038-925453 (Menu Tap).
 */
export default function ProfileHeaderPopperContent({ onNavigate }: { onNavigate?: () => void }) {
  const { data: session } = useSession();
  const t = useTranslations();
  const { signOutAuth, getCheck } = useCrossmintLoginContext();

  const supportHref = getSupportHref(session?.user?.region);

  const closeThen = (fn: () => void) => {
    onNavigate?.();
    fn();
  };

  return (
    <div className="flex w-full max-w-[384px] flex-col items-center gap-[14px]">
      <WalletSummaryHeroCard variant="popper" getCheck={getCheck} onWithdrawNavigate={onNavigate} />

      {/* Menu — Figma: gap-8px between groups */}
      <div className="flex w-full flex-col gap-2">
        <div className="flex flex-col">
          <MenuRowLink
            href="/profile"
            onNavigate={onNavigate}
            icon={<ProfileIcon width={24} height={24} fill={ICON_TEAL} />}
            label={t("Profile")}
          />
          <MenuRowLink
            href="/wallet"
            onNavigate={onNavigate}
            icon={<WalletIcon width={24} height={24} fill={ICON_TEAL} />}
            label={t("My Wallet")}
          />
          <MenuRowLink
            href="/favorite"
            onNavigate={onNavigate}
            icon={<FavoriteIcon width={24} height={20} fill={ICON_TEAL} />}
            label={t("profilePopperMyFavoriteStores")}
          />
          <MenuRowLink
            href="/referral"
            onNavigate={onNavigate}
            icon={<ProfileAddIcon width={24} height={24} fill={ICON_TEAL} />}
            label={t("profilePopperReferYourFriends")}
          />
        </div>

        <Divider sx={{ borderColor: "#E4E4E4" }} />

        <div className="flex flex-col">
          <MenuRowLink
            href={supportHref}
            external
            onNavigate={onNavigate}
            icon={<ProfilePopperCustomerSupportIcon width={24} height={24} fill={ICON_TEAL} />}
            label={t("Help Center")}
          />
          <MenuRowLink
            href={supportHref}
            external
            onNavigate={onNavigate}
            icon={<ProfilePopperFaqBubbleIcon width={24} height={24} fill={ICON_TEAL} />}
            label={t("profilePopperFaqs")}
          />
          <MenuRowLink
            href={supportHref}
            external
            onNavigate={onNavigate}
            icon={<ProfilePopperMissingOrdersIcon width={24} height={24} stroke={ICON_TEAL} />}
            label={t("profilePopperMissingOrders")}
          />
        </div>

        <Divider sx={{ borderColor: "#E4E4E4" }} />

        <MenuRowButton
          icon={<LogoutIcon width={24} height={24} fill={ICON_TEAL} />}
          label={t("profilePopperLogOut")}
          onClick={() => closeThen(signOutAuth)}
        />
      </div>
    </div>
  );
}
