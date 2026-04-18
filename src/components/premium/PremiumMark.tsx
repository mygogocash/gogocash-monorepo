"use client";

import React from "react";
import type { MembershipTier } from "@/interfaces/auth";
import { premiumStyleFor } from "./premiumTokens";

/**
 * Compact icon-only premium indicator.
 *
 * Used inline after a username in dense UI (header pills, list rows, chat
 * bubbles, etc.) — the full "GoGoPass" text pill from {@link PremiumBadge}
 * reads as a second label at small sizes and competes with the name.
 *
 * Renders nothing for free / undefined tiers — safe to drop next to any name.
 *
 * @example
 * <span>{user.username}<PremiumMark tier={user.membership_tier} /></span>
 */
interface PremiumMarkProps {
  tier: MembershipTier | undefined;
  /** Icon size in pixels. Default 14 (reads cleanly next to 12–14px text). */
  size?: number;
  /** Optional margin-left (in px) — default 4 for inline after a name. */
  marginLeft?: number;
  className?: string;
}

export default function PremiumMark({
  tier,
  size = 14,
  marginLeft = 4,
  className,
}: PremiumMarkProps): React.ReactElement | null {
  const style = premiumStyleFor(tier);
  if (!style) return null;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        marginLeft,
        flexShrink: 0,
        lineHeight: 0,
        filter: `drop-shadow(0 1px 1px ${style.accent}55)`,
      }}
      aria-label={`${style.label} member`}
      title={`${style.label} member`}
    >
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
        <defs>
          <linearGradient id={`gg-mark-${tier}`} x1="0" y1="0" x2="16" y2="16">
            <stop offset="0%" stopColor={style.accentSoft} />
            <stop offset="60%" stopColor={style.accent} />
            <stop offset="100%" stopColor="#8B6914" />
          </linearGradient>
        </defs>
        {/* Soft verification burst — rounded 12-point star, reads as "premium tick". */}
        <path
          d="M8 1l1.3 1.8L11.5 2l.3 2.2L14 5l-1.1 1.9L14 9l-2.2.8L11.5 12l-2.2-.2L8 13.5 6.7 11.8 4.5 12l-.3-2.2L2 9l1.1-1.9L2 5l2.2-.8L4.5 2l2.2.2L8 1z"
          fill={`url(#gg-mark-${tier})`}
        />
        {/* Inner sparkle — a 4-point gleam centered in the star. */}
        <path
          d="M8 5.2l.6 1.4 1.4.6-1.4.6L8 9.2l-.6-1.4L6 7.2l1.4-.6L8 5.2z"
          fill={style.accentSoft}
          opacity="0.9"
        />
      </svg>
    </span>
  );
}
