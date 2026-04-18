"use client";

import React from "react";
import type { MembershipTier } from "@/interfaces/auth";
import { isPremiumTier, premiumStyleFor } from "./premiumTokens";

/**
 * GoGoPass profile ring wrapper.
 *
 * Wrap any avatar (Image, div, whatever) and it gets a rotating gold
 * conic-gradient ring when `tier` is premium. Non-premium tiers render
 * children unchanged with zero visual overhead.
 *
 * The ring sits OUTSIDE the avatar, not behind it, so the avatar stays its
 * original size and bordered area. We use an absolutely-positioned padded
 * wrapper so the caller doesn't need to know about the ring's dimensions.
 *
 * @example
 * <PremiumAvatar tier={user.membership_tier} size={34}>
 *   <Image src="/profile.png" width={34} height={34} />
 * </PremiumAvatar>
 */
interface PremiumAvatarProps {
  /** Membership tier driving the visual treatment. */
  tier: MembershipTier | undefined;
  /** Avatar size in pixels — used to offset the ring correctly. */
  size: number;
  /** The avatar itself (Image, div, etc.). */
  children: React.ReactNode;
  /** Optional extra class names on the outer wrapper. */
  className?: string;
  /**
   * Ring thickness in pixels. Default 2.
   * Keep this proportional to size; 2–3px for small avatars, 3–4 for large.
   */
  ringWidth?: number;
  /**
   * Disable the shimmer rotation (for performance in large lists).
   * Still renders the static gradient.
   */
  staticRing?: boolean;
}

export default function PremiumAvatar({
  tier,
  size,
  children,
  className,
  ringWidth = 2,
  staticRing = false,
}: PremiumAvatarProps): React.ReactElement {
  const style = premiumStyleFor(tier);

  // Non-premium: render children unchanged.
  if (!style || !isPremiumTier(tier)) {
    return (
      <div className={className} style={{ width: size, height: size }} data-tier="free">
        {children}
      </div>
    );
  }

  const outerSize = size + ringWidth * 2 + 2; // 1px gap on each side for depth

  return (
    <div
      className={className}
      style={{
        width: outerSize,
        height: outerSize,
        position: "relative",
        display: "inline-block",
      }}
      data-tier={tier}
      aria-label={`${style.label} member`}
    >
      {/* Rotating gold ring — sits behind the avatar, masked to show only edge. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          padding: ringWidth,
          background: style.ringGradient,
          animation: staticRing ? "none" : "gogopass-spin 6s linear infinite",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      {/* White inset so the avatar edge reads cleanly against the ring. */}
      <div
        style={{
          position: "absolute",
          inset: ringWidth,
          borderRadius: "50%",
          background: "#fff",
        }}
      />
      {/* Avatar, centered on top. */}
      <div
        style={{
          position: "absolute",
          inset: ringWidth + 1,
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
        }}
      >
        {children}
      </div>

      <style jsx>{`
        @keyframes gogopass-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          div[data-tier="${tier}"] > div[aria-hidden] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
