"use client";

import { designSystemColor } from "@/constants/design-system";
import { formatInviteLinkDisplay } from "@/lib/referral/referralLink";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import EmailOutlined from "@mui/icons-material/EmailOutlined";
import Facebook from "@mui/icons-material/Facebook";
import Instagram from "@mui/icons-material/Instagram";
import LinkedIn from "@mui/icons-material/LinkedIn";
import XIcon from "@mui/icons-material/X";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";
import { useState } from "react";

type ReferralEarnCardProps = {
  referralUrl: string | null;
  displaySnippet: string;
};

function shareUrlEncoded(url: string): string {
  return encodeURIComponent(url);
}

/**
 * Refer & Earn card — link row, email invite (placeholder), social share.
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8703-282022
 */
export default function ReferralEarnCard({ referralUrl, displaySnippet }: ReferralEarnCardProps) {
  const t = useTranslations();
  const [friendEmail, setFriendEmail] = useState("");

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
      className="relative w-full overflow-hidden rounded-2xl bg-white p-6 shadow-[0px_4px_22.9px_rgba(0,0,0,0.05)] md:p-8"
      aria-labelledby="referral-earn-heading"
      style={{
        backgroundImage: 'url("/referral/refer-link-card-bg.svg")',
        backgroundSize: "cover",
        backgroundPosition: "right center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="relative z-10 flex max-w-[649px] flex-col gap-8 md:gap-10">
        <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:gap-6">
          <h2
            id="referral-earn-heading"
            className="text-[32px] font-semibold leading-tight text-black md:text-[40px]"
          >
            {t("Refer & Earn")}
          </h2>
          <p className="max-w-[380px] text-xl font-normal leading-snug text-[#00aa80] md:text-2xl">
            {t("For each friend that you invite")}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold text-[#005d46]">{t("Share your referral link")}</p>
          <button
            type="button"
            onClick={() => void copyLink()}
            disabled={!referralUrl}
            className="flex max-h-14 w-full max-w-[649px] items-center justify-center gap-6 rounded-2xl px-3 py-4 text-left transition-[filter] disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: designSystemColor.mint }}
            aria-label={t("profileInviteCopyAria")}
          >
            <span className="shrink-0 whitespace-nowrap text-xl font-semibold text-white">
              {t("invite link")} :
            </span>
            <span className="min-w-0 flex-1 truncate text-xl font-normal text-white">
              {referralUrl ? formatInviteLinkDisplay(referralUrl) : displaySnippet}
            </span>
            <ContentCopyOutlined sx={{ fontSize: 24, color: "#fff", flexShrink: 0 }} aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-lg font-semibold text-[#005d46]">{t("referralYourFriendEmail")}</p>
          <div className="flex w-full max-w-[649px] flex-col gap-3 sm:flex-row sm:items-stretch">
            <TextField
              fullWidth
              size="medium"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              placeholder={t("referralFriendEmailPlaceholder")}
              type="email"
              autoComplete="off"
              slotProps={{
                input: {
                  "aria-label": t("referralFriendEmailPlaceholder"),
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailOutlined sx={{ fontSize: 20, color: "#989898", opacity: 0.6 }} />
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: "16px",
                    backgroundColor: "#fff",
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(152,152,152,0.4)" },
                  },
                },
              }}
            />
            <button
              type="button"
              disabled
              className="h-14 shrink-0 rounded-full bg-[#f6f6f6] px-6 text-base font-medium whitespace-nowrap text-[#989898] sm:w-[176px]"
            >
              {t("referralSendInvitation")}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#eaeaea] pt-6">
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
