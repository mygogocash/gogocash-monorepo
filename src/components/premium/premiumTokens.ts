/**
 * Design tokens for the GoGoPass premium visual treatment.
 *
 * Single source of truth so Badge + Ring + future premium surfaces stay
 * consistent. Keep these values — they're tuned to read as "gold" without
 * looking cheap or clashing with the mint brand accent.
 */

import type { MembershipTier } from "@/interfaces/auth";

/** True when the tier earns the premium visual treatment. */
export function isPremiumTier(tier: MembershipTier | undefined): boolean {
  return tier === "gogopass" || tier === "gogopass-pro";
}

export interface PremiumStyle {
  /** Primary accent color (borders, badge bg). */
  readonly accent: string;
  /** Secondary accent for gradients. */
  readonly accentSoft: string;
  /** High-contrast foreground that reads on top of `accent`. */
  readonly onAccent: string;
  /** Pre-baked conic-gradient used for the rotating ring around avatars. */
  readonly ringGradient: string;
  /** Short label shown in the badge pill. */
  readonly label: string;
}

const GOGOPASS: PremiumStyle = {
  accent: "#D4AF37",
  accentSoft: "#F4E4A8",
  onAccent: "#1A1400",
  /* Three-stop conic gradient creates a subtle gold shimmer. */
  ringGradient:
    "conic-gradient(from 0deg, #F4E4A8, #D4AF37, #B8860B, #F4E4A8, #D4AF37)",
  label: "GoGoPass",
};

const GOGOPASS_PRO: PremiumStyle = {
  accent: "#C9A227",
  accentSoft: "#FFE680",
  onAccent: "#1A1400",
  ringGradient:
    "conic-gradient(from 0deg, #FFE680, #C9A227, #8B6914, #FFE680, #C9A227)",
  label: "GoGoPass Pro",
};

const TIER_STYLES: Readonly<Record<"gogopass" | "gogopass-pro", PremiumStyle>> =
  {
    gogopass: GOGOPASS,
    "gogopass-pro": GOGOPASS_PRO,
  };

export function premiumStyleFor(
  tier: MembershipTier | undefined,
): PremiumStyle | null {
  if (tier === "gogopass" || tier === "gogopass-pro") {
    return TIER_STYLES[tier];
  }
  return null;
}
