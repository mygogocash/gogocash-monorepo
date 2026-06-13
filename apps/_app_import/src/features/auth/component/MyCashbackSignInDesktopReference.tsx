"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";

/** Static asset for MyCashback desktop sign-in reference (Figma: Sign in Page _ Desktop.svg). */
export const MYCASHBACK_SIGN_IN_DESKTOP_REFERENCE = {
  src: "/images/link-mycashback-sign-in-desktop.svg",
  width: 480,
  height: 574,
} as const;

/** Match `en.json` when the client catalog is missing keys (e.g. Turbopack stale JSON). */
export const LINK_MYCASHBACK_LINK_PREVIEW_ALT_FALLBACK =
  "MyCashback sign-in screen (desktop reference)";

/**
 * Resolved alt text for the desktop reference image (i18n + stale-catalog fallback).
 */
export function useLinkMyCashbackSignInDesktopAlt(): string {
  const t = useTranslations();
  return t.has("linkMyCashbackLinkPreviewAlt")
    ? t("linkMyCashbackLinkPreviewAlt")
    : LINK_MYCASHBACK_LINK_PREVIEW_ALT_FALLBACK;
}

export type MyCashbackSignInDesktopReferenceProps = {
  /** Extra classes on the Next/Image root. */
  className?: string;
  priority?: boolean;
  unoptimized?: boolean;
};

/**
 * MyCashback desktop sign-in reference artwork — reusable anywhere you need this asset.
 */
export function MyCashbackSignInDesktopReference({
  className,
  priority = true,
  unoptimized = true,
}: MyCashbackSignInDesktopReferenceProps) {
  const alt = useLinkMyCashbackSignInDesktopAlt();

  return (
    <Image
      src={MYCASHBACK_SIGN_IN_DESKTOP_REFERENCE.src}
      alt={alt}
      width={MYCASHBACK_SIGN_IN_DESKTOP_REFERENCE.width}
      height={MYCASHBACK_SIGN_IN_DESKTOP_REFERENCE.height}
      className={cn("h-auto w-full", className)}
      unoptimized={unoptimized}
      priority={priority}
    />
  );
}
