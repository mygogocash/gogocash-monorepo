"use client";

import PremiumAvatar from "@/components/premium/PremiumAvatar";
import PremiumBadge from "@/components/premium/PremiumBadge";
import type { MembershipTier } from "@/interfaces/auth";
import { buildReferralInviteUrl } from "@/lib/referral/referralLink";
import { useReferralSiteOrigin } from "@/lib/referral/useReferralSiteOrigin";
import { fetcherPut } from "@/lib/axios/client";
import {
  assertProfileAvatarFile,
  compressProfileAvatarToDataUrl,
  profileAvatarStorageKey,
} from "@/lib/profile/compressProfileAvatar";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import Edit from "@mui/icons-material/Edit";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import toast from "react-hot-toast";

/** Deterministic 9-digit display from any user id string (same input → same digits). */
function nineDigitUserIdDisplay(rawId: string): string {
  if (!rawId) return "000000000";
  let h = 2166136261;
  for (let i = 0; i < rawId.length; i += 1) {
    h ^= rawId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String((h >>> 0) % 1_000_000_000).padStart(9, "0");
}

/**
 * Profile invite row — compact mint chip (smaller than Figma 8524:130818 for density).
 */
const inviteRowClass =
  "group flex w-full max-w-full min-h-10 items-center gap-2.5 rounded-xl bg-[#00CC99] px-2.5 py-2 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.22)] transition-[filter,background-color] duration-200 ease-out hover:brightness-[1.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#00CC99] motion-reduce:transition-none motion-reduce:hover:brightness-100 md:max-w-[520px] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 sm:gap-3 sm:px-3 sm:py-2.5";

const DEFAULT_AVATAR = "/profile/profile.png";

/** Same-tab writes do not emit `storage`; we only need a hydration-safe read + session as source of truth. */
const noopSubscribe = () => () => {};

const CardProfile = () => {
  const { data: session, update } = useSession();
  const t = useTranslations();
  const siteOrigin = useReferralSiteOrigin();
  const userId = session?.user?._id?.trim() ?? "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);

  const storedAvatarSnapshot = useSyncExternalStore(
    noopSubscribe,
    () => {
      if (!userId) return "";
      try {
        return localStorage.getItem(profileAvatarStorageKey(userId)) ?? "";
      } catch {
        return "";
      }
    },
    () => ""
  );

  const referralUrl = useMemo(
    () => buildReferralInviteUrl(siteOrigin, userId),
    [siteOrigin, userId]
  );

  /** Visible snippet matches Figma (short id); clipboard still receives full URL. */
  const displaySnippet = referralUrl && userId ? userId : t("profileInviteLinkEmpty");

  const displayUserIdDigits = useMemo(() => nineDigitUserIdDisplay(userId), [userId]);

  // Preview: NEXT_PUBLIC_GOGOPASS_PREVIEW=1 forces GoGoPass for all signed-in users.
  const sessionTier = (session?.user as { membership_tier?: MembershipTier } | undefined)
    ?.membership_tier;
  const membershipTier: MembershipTier | undefined =
    sessionTier ??
    (process.env.NEXT_PUBLIC_GOGOPASS_PREVIEW === "1" && session?.user ? "gogopass" : undefined);

  const displayAvatarSrc = useMemo(() => {
    if (uploadPreviewUrl) return uploadPreviewUrl;
    const fromSession = session?.user?.avatar_url;
    if (typeof fromSession === "string" && fromSession.length > 0) return fromSession;
    if (storedAvatarSnapshot) return storedAvatarSnapshot;
    return DEFAULT_AVATAR;
  }, [uploadPreviewUrl, session?.user?.avatar_url, storedAvatarSnapshot]);
  const avatarUnoptimized = displayAvatarSrc.startsWith("data:");

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onAvatarFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !userId) return;

      try {
        assertProfileAvatarFile(file);
        const dataUrl = await compressProfileAvatarToDataUrl(file);
        const res = (await fetcherPut([
          `/user/profile`,
          {
            data: { avatar_url: dataUrl },
          },
        ])) as { avatar_url?: string | null } | null;

        const nextUrl = res?.avatar_url ?? dataUrl;
        try {
          localStorage.setItem(profileAvatarStorageKey(userId), nextUrl);
        } catch {
          /* quota / private mode */
        }
        setUploadPreviewUrl(nextUrl);
        await update({
          ...session,
          user: {
            ...session?.user,
            ...(res && typeof res === "object" ? res : {}),
            avatar_url: nextUrl,
          },
        });
        setUploadPreviewUrl(null);
        toast.success(t("profileAvatarUpdatedToast"));
      } catch (err) {
        setUploadPreviewUrl(null);
        try {
          localStorage.removeItem(profileAvatarStorageKey(userId));
        } catch {
          /* ignore */
        }
        toast.error(err instanceof Error ? err.message : t("profileAvatarUploadFailedToast"));
      }
    },
    [session, update, t, userId]
  );

  const copyInviteLink = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success(t("profileInviteCopiedToast"));
    } catch {
      toast.error(t("profileInviteCopyFailed"));
    }
  };

  const copyUserId = async () => {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(displayUserIdDigits);
      toast.success(t("profileUserIdCopiedToast"));
    } catch {
      toast.error(t("profileUserIdCopyFailed"));
    }
  };

  return (
    <div className="relative w-full min-h-[173px] overflow-hidden rounded-3xl bg-[#00CC99] md:flex md:min-h-[173px] md:items-center md:gap-12 md:px-12 md:py-6 lg:gap-20">
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept="image/*"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void onAvatarFileChange(e)}
      />
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
        <div className="relative shrink-0 self-start md:self-center">
          <PremiumAvatar tier={membershipTier} size={120} ringWidth={4}>
            <button
              type="button"
              onClick={openFilePicker}
              disabled={!userId}
              aria-label={t("profileAvatarEditAria")}
              className="relative block h-full w-full cursor-pointer overflow-hidden rounded-full border-0 bg-transparent p-0 shadow-none outline-none transition-[opacity,transform] hover:opacity-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#00CC99] motion-reduce:transition-none motion-reduce:active:scale-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:opacity-50 disabled:active:scale-100"
            >
              <Image
                src={displayAvatarSrc}
                alt=""
                width={360}
                height={360}
                sizes="120px"
                quality={92}
                unoptimized={avatarUnoptimized}
                className="pointer-events-none h-full w-full rounded-full bg-[#f6f6f6] object-cover"
              />
            </button>
          </PremiumAvatar>
          <span
            className="pointer-events-none absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
            aria-hidden
          >
            <Edit sx={{ fontSize: 20, color: "#3b3b3b" }} />
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-2 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <h4 className="text-2xl font-semibold text-[#3b3b3b]">
                {session?.user?.username || t("profileFieldName")}
              </h4>
              <PremiumBadge tier={membershipTier} size="md" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <p className="text-base font-normal text-[#7f7f7f] md:text-lg">
                {t("profileUserIdLabel")}:{" "}
                <span className="font-mono tabular-nums text-[#3b3b3b]">{displayUserIdDigits}</span>
              </p>
              <button
                type="button"
                onClick={() => void copyUserId()}
                disabled={!userId}
                aria-label={t("profileUserIdCopyAria")}
                className="inline-flex shrink-0 items-center justify-center rounded-lg p-1.5 text-[#3b3b3b] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b3b3b]/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ContentCopyOutlined sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </button>
            </div>
          </div>

          <button
            type="button"
            className={inviteRowClass}
            onClick={() => void copyInviteLink()}
            disabled={!referralUrl}
            title={referralUrl ?? undefined}
            aria-label={referralUrl ? t("profileInviteCopyAria") : t("profileInviteLinkEmpty")}
          >
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold leading-tight text-white sm:text-sm">
              {t("invite link")} :
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
              <span className="min-w-0 flex-1 truncate text-xs font-normal leading-tight text-white sm:text-sm">
                {displaySnippet}
              </span>
              <span
                className="inline-flex size-5 shrink-0 items-center justify-center text-white sm:size-6"
                aria-hidden
              >
                <ContentCopyOutlined sx={{ fontSize: { xs: 18, sm: 20 }, color: "#fff" }} />
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardProfile;
