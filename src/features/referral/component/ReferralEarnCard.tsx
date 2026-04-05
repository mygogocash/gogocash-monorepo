"use client";

import { designSystemColor } from "@/constants/design-system";
import { formatInviteLinkDisplay } from "@/lib/referral/referralLink";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import Facebook from "@mui/icons-material/Facebook";
import Instagram from "@mui/icons-material/Instagram";
import LinkedIn from "@mui/icons-material/LinkedIn";
import XIcon from "@mui/icons-material/X";
import { IconButton } from "@mui/material";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

type ReferralEarnCardProps = {
  referralUrl: string | null;
  displaySnippet: string;
};

function shareUrlEncoded(url: string): string {
  return encodeURIComponent(url);
}

/**
 * Refer & Earn card — referral link row and social share.
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8703-282022
 */
export default function ReferralEarnCard({ referralUrl, displaySnippet }: ReferralEarnCardProps) {
  const t = useTranslations();

  const copyLink = async () => {
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

  const openShare = (kind: "facebook" | "linkedin" | "twitter") => {
    if (!referralUrl) {
      toast.error(t("profileInviteLinkEmpty"));
      return;
    }
    const u = shareUrlEncoded(referralUrl);
    const urls: Record<typeof kind, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      twitter: `https://twitter.com/intent/tweet?url=${u}`,
    };
    window.open(urls[kind], "_blank", "noopener,noreferrer");
  };

  return (
    <section
      className="relative w-full overflow-hidden rounded-2xl bg-white p-5 shadow-[0px_4px_22.9px_rgba(0,0,0,0.05)] sm:p-6 md:p-8"
      aria-labelledby="referral-earn-heading"
      style={{
        backgroundImage: 'url("/referral/refer-link-card-bg.svg")',
        backgroundSize: "cover",
        backgroundPosition: "right center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Mobile: strong left wash keeps copy readable over busy SVG art; desktop: lighter so Figma bg shows */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] rounded-2xl bg-gradient-to-br from-white from-[18%] via-white/92 to-white/55 max-md:to-white/40 md:from-white/75 md:from-[28%] md:via-white/45 md:to-transparent"
        aria-hidden
      />
      <div className="relative z-10 flex max-w-[649px] flex-col gap-6 md:gap-10">
        <div className="flex flex-col gap-2 sm:gap-4 md:flex-row md:flex-wrap md:items-end md:gap-6">
          <h2
            id="referral-earn-heading"
            className="text-[26px] font-semibold leading-tight tracking-tight text-[#103522] sm:text-[32px] md:text-[40px]"
          >
            {t("Refer & Earn")}
          </h2>
          <p className="max-w-[380px] text-base font-medium leading-snug text-[#007d5e] sm:text-xl md:text-2xl">
            {t("For each friend that you invite")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold text-[#103522] sm:text-lg">
            {t("Share your referral link")}
          </p>
          <button
            type="button"
            onClick={() => void copyLink()}
            disabled={!referralUrl}
            className="flex w-full max-w-[649px] flex-col gap-2 rounded-2xl px-3 py-3 text-left transition-[filter] sm:max-h-14 sm:flex-row sm:items-center sm:gap-4 sm:py-3.5 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: designSystemColor.mint }}
            aria-label={t("profileInviteCopyAria")}
          >
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-start sm:gap-4">
              <span className="shrink-0 text-base font-semibold text-white sm:text-xl">
                {t("invite link")} :
              </span>
              <ContentCopyOutlined
                sx={{
                  fontSize: 22,
                  color: "#fff",
                  flexShrink: 0,
                  display: { xs: "block", sm: "none" },
                }}
                aria-hidden
              />
            </div>
            <span className="min-w-0 w-full break-all text-sm font-normal leading-snug text-white sm:flex-1 sm:truncate sm:text-xl">
              {referralUrl ? formatInviteLinkDisplay(referralUrl) : displaySnippet}
            </span>
            <ContentCopyOutlined
              sx={{
                fontSize: 24,
                color: "#fff",
                flexShrink: 0,
                display: { xs: "none", sm: "block" },
              }}
              aria-hidden
            />
          </button>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#eaeaea] pt-5 sm:pt-6">
          <p
            id="referral-social-share-heading"
            className="text-sm font-semibold tracking-tight text-[#1a1a1a]"
          >
            {t("referralSocialShareLabel")}
          </p>
          <div
            role="group"
            aria-labelledby="referral-social-share-heading"
            className="flex flex-wrap items-center gap-2 sm:gap-2.5"
          >
            <IconButton
              onClick={() => openShare("facebook")}
              aria-label={t("referralShareFacebook")}
              className="h-11 min-h-[44px] min-w-[44px] rounded-xl border border-[#dedede] bg-white shadow-none transition-colors hover:border-[#1877F2]/35 hover:bg-[#f7f9ff]"
              sx={{ borderRadius: "12px" }}
            >
              <Facebook sx={{ fontSize: 22, color: "#1877F2" }} />
            </IconButton>
            <IconButton
              onClick={() => openShare("linkedin")}
              aria-label={t("referralShareLinkedIn")}
              className="h-11 min-h-[44px] min-w-[44px] rounded-xl border border-[#dedede] bg-white shadow-none transition-colors hover:border-[#0A66C2]/35 hover:bg-[#f3f8fc]"
              sx={{ borderRadius: "12px" }}
            >
              <LinkedIn sx={{ fontSize: 22, color: "#0A66C2" }} />
            </IconButton>
            <IconButton
              onClick={() => {
                void copyLink();
                toast.success(t("referralInstagramCopyHint"));
              }}
              aria-label={t("referralShareInstagram")}
              className="h-11 min-h-[44px] min-w-[44px] rounded-xl border border-[#dedede] bg-white shadow-none transition-colors hover:border-[#E4405F]/35 hover:bg-[#fff8f9]"
              sx={{ borderRadius: "12px" }}
            >
              <Instagram sx={{ fontSize: 22, color: "#E4405F" }} />
            </IconButton>
            <IconButton
              onClick={() => openShare("twitter")}
              aria-label={t("referralShareX")}
              className="h-11 min-h-[44px] min-w-[44px] rounded-xl border border-[#dedede] bg-white shadow-none transition-colors hover:border-[#0f1419]/25 hover:bg-[#f5f5f5]"
              sx={{ borderRadius: "12px" }}
            >
              <XIcon sx={{ fontSize: 22, color: "#0f1419" }} />
            </IconButton>
          </div>
        </div>
      </div>
    </section>
  );
}
