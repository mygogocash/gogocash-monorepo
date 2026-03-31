"use client";

import { buildReferralInviteUrl } from "@/lib/referral/referralLink";
import { useReferralSiteOrigin } from "@/lib/referral/useReferralSiteOrigin";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import Edit from "@mui/icons-material/Edit";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo } from "react";
import toast from "react-hot-toast";

/**
 * Figma GoGoCash 1.1 — Profile invite row (node 8524:130818).
 * Solid mint chip, radius lg (16px), 24px label↔link gap, 16px link↔icon, 20px type, 24px duplicate icon.
 */
const inviteRowClass =
  "group flex w-full max-w-full min-h-14 items-center gap-6 rounded-2xl bg-[#00CC99] px-3 py-3 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] transition-[filter,background-color] duration-200 ease-out hover:brightness-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#00CC99] motion-reduce:transition-none motion-reduce:hover:brightness-100 md:max-w-[649px] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100";

const CardProfile = () => {
  const { data: session } = useSession();
  const t = useTranslations();
  const siteOrigin = useReferralSiteOrigin();
  const userId = session?.user?._id?.trim() ?? "";
  const referralUrl = useMemo(
    () => buildReferralInviteUrl(siteOrigin, userId),
    [siteOrigin, userId]
  );

  /** Visible snippet matches Figma (short id); clipboard still receives full URL. */
  const displaySnippet = referralUrl && userId ? userId : t("profileInviteLinkEmpty");

  const copyInviteLink = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success(t("profileInviteCopiedToast"));
    } catch {
      toast.error(t("profileInviteCopyFailed"));
    }
  };

  return (
    <div className="relative w-full min-h-[173px] overflow-hidden rounded-3xl bg-[#00CC99] md:flex md:min-h-[173px] md:items-center md:gap-12 md:px-12 md:py-6 lg:gap-20">
      {/* Figma / Profile Banner.svg: base #00CC99 + radial + linear blue + right-side orbs */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl bg-[#00CC99] bg-no-repeat bg-center"
        style={{
          backgroundImage: "url(/profile/profile-banner-bg.svg)",
          backgroundSize: "100% 100%",
        }}
        aria-hidden
      />
      <div className="relative z-10 flex w-full flex-col gap-6 p-4 md:flex-row md:items-center md:gap-12 md:p-0 lg:gap-20">
        <div className="relative h-[120px] w-[120px] shrink-0 self-start md:self-center">
          <Image
            src="/profile/profile.png"
            alt=""
            width={360}
            height={360}
            sizes="120px"
            quality={92}
            className="h-[120px] w-[120px] rounded-full bg-[#f6f6f6] object-cover"
          />
          <button
            type="button"
            aria-label={t("Edit")}
            className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
          >
            <Edit sx={{ fontSize: 20, color: "#3b3b3b" }} />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <h4 className="text-2xl font-semibold text-[#3b3b3b]">
              {session?.user?.username || t("profileFieldName")}
            </h4>
            <p className="text-lg font-normal text-[#7f7f7f]">
              {t("Status")}: <span className="text-[#3b3b3b]">{t("profileStatusAvailable")}</span>
            </p>
          </div>

          <button
            type="button"
            className={inviteRowClass}
            onClick={() => void copyInviteLink()}
            disabled={!referralUrl}
            title={referralUrl ?? undefined}
            aria-label={referralUrl ? t("profileInviteCopyAria") : t("profileInviteLinkEmpty")}
          >
            <span className="shrink-0 whitespace-nowrap text-xl font-semibold leading-normal text-white">
              {t("invite link")} :
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <span className="min-w-0 flex-1 truncate text-xl font-normal leading-normal text-white">
                {displaySnippet}
              </span>
              <span
                className="inline-flex size-6 shrink-0 items-center justify-center text-white"
                aria-hidden
              >
                <ContentCopyOutlined sx={{ fontSize: 24, color: "#fff" }} />
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardProfile;
