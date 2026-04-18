"use client";

import React from "react";
import type { MembershipTier } from "@/interfaces/auth";
import { premiumStyleFor } from "./premiumTokens";

/**
 * Small "GoGoPass" pill shown next to a username or profile card.
 *
 * Renders nothing for free/undefined tiers — safe to drop anywhere
 * without conditional wrapping at the call site.
 *
 * @example
 * <span>{user.username} <PremiumBadge tier={user.membership_tier} /></span>
 */
interface PremiumBadgeProps {
  tier: MembershipTier | undefined;
  /** "sm" | "md" — default "sm". */
  size?: "sm" | "md";
  /** Override the default label ("GoGoPass" / "GoGoPass Pro"). */
  label?: string;
  className?: string;
}

export default function PremiumBadge({
  tier,
  size = "sm",
  label,
  className,
}: PremiumBadgeProps): React.ReactElement | null {
  const style = premiumStyleFor(tier);
  if (!style) return null;

  const sizeStyles =
    size === "sm"
      ? { padding: "2px 8px", fontSize: "10px", gap: 3 }
      : { padding: "4px 10px", fontSize: "12px", gap: 4 };

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        background: `linear-gradient(135deg, ${style.accent} 0%, ${style.accentSoft} 100%)`,
        color: style.onAccent,
        fontWeight: 700,
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        lineHeight: 1,
        whiteSpace: "nowrap",
        boxShadow: "0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.3)",
        ...sizeStyles,
      }}
      aria-label={`${style.label} member`}
    >
      <svg
        width={size === "sm" ? 9 : 11}
        height={size === "sm" ? 9 : 11}
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden
      >
        <path d="M6 1l1.5 3.2L11 5l-2.5 2.5L9 11 6 9.3 3 11l.5-3.5L1 5l3.5-.8L6 1z" />
      </svg>
      {label ?? style.label}
    </span>
  );
}
