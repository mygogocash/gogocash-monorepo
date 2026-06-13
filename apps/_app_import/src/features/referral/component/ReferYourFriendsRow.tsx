"use client";

import ProfileAddIcon from "@/components/icons/ProfileAddIcon";
import { fetcher } from "@/lib/axios/client";
import { buildReferralInviteUrl } from "@/lib/referral/referralLink";
import { useReferralSiteOrigin } from "@/lib/referral/useReferralSiteOrigin";
import { useRouter } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useMemo, type KeyboardEvent, type MouseEvent } from "react";
import toast from "react-hot-toast";
import type { ResponseReferralList } from "@/interfaces/referral";
import { formatInvitedCountLabel } from "./inviteCountLabel";

const RAIL_ICON_FILL = "var(--gc-primary-strong)";

/**
 * Profile rail row aligned with Figma 9812:166734 — replaces the plain
 * "Refer your Friends" link with a two-line row plus mint "Copy Link" pill.
 *
 * Row click → navigate to /referral (existing page).
 * Copy Link click → copies the invite URL via navigator.clipboard, no navigation.
 *
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=9812-166734
 */
export default function ReferYourFriendsRow() {
  const t = useTranslations();
  const router = useRouter();
  const { data: session } = useSession();
  const siteOrigin = useReferralSiteOrigin();

  const userId = session?.user?._id?.trim() ?? "";
  const referralUrl = useMemo(
    () => buildReferralInviteUrl(siteOrigin, userId),
    [siteOrigin, userId]
  );

  /** Reuses the same query key as `ReferralInvitationPanel` so React Query dedupes the call. */
  const { data: rows } = useQuery<ResponseReferralList[]>({
    queryKey: ["getListReferral"],
    queryFn: () => fetcher(`/point/referral-list`),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const invitedCount = rows?.length ?? 0;
  const subtitle = useMemo(() => {
    const localised = t("profileReferInviteFriendsCount", { count: invitedCount });
    /** Fallback when i18n key returns the raw template (e.g. legacy catalog without key). */
    return localised.includes("{count}") ? formatInvitedCountLabel(invitedCount) : localised;
  }, [t, invitedCount]);

  const navigateToReferral = () => {
    router.push("/referral");
  };

  const copyLink = async (event: MouseEvent<HTMLButtonElement>) => {
    /** Prevent the row's navigation when the inner pill is tapped. */
    event.stopPropagation();
    event.preventDefault();
    if (!referralUrl) {
      toast.error(t("profileInviteLinkEmpty"));
      return;
    }
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success(t("profileInviteCopiedToast"));
    } catch {
      toast.error(t("profileInviteCopyFailed"));
    }
  };

  const onRowKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigateToReferral();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t("profileReferInviteFriendsAria")}
      onClick={navigateToReferral}
      onKeyDown={onRowKeyDown}
      className="flex h-[52px] max-h-[52px] w-full min-w-0 cursor-pointer items-center gap-4 rounded-2xl bg-transparent px-4 outline-none transition-[background-color,transform] duration-200 ease-out hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--gc-primary)]/50 active:scale-[0.99] motion-reduce:transition-colors motion-reduce:active:scale-100"
    >
      <span
        className="inline-flex size-6 shrink-0 items-center justify-center [&>svg]:block"
        aria-hidden
      >
        <ProfileAddIcon width={24} height={24} fill={RAIL_ICON_FILL} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col justify-center leading-normal">
        <span className="truncate text-base font-normal text-[#3B3B3B]">
          {t("profileReferInviteFriendsTitle")}
        </span>
        <span className="truncate text-xs font-normal text-[#7F7F7F]">{subtitle}</span>
      </div>
      <button
        type="button"
        onClick={copyLink}
        disabled={!referralUrl}
        aria-label={t("profileInviteCopyAria")}
        className="inline-flex h-6 max-h-8 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[360px] border-0 bg-[#00cc99] px-3 py-1 text-xs font-medium text-white transition-[filter,transform] duration-200 ease-out hover:brightness-105 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-colors motion-reduce:active:scale-100"
      >
        <span className="whitespace-nowrap leading-normal">
          {t("profileReferInviteCopyLinkButton")}
        </span>
        <ContentCopyOutlinedIcon sx={{ fontSize: 14, color: "#fff", flexShrink: 0 }} aria-hidden />
      </button>
    </div>
  );
}
