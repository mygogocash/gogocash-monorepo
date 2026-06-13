/**
 * Renders "Invited : N" label for the profile referral row, matching Figma 9812:166734.
 * Negative or non-integer inputs clamp to non-negative integers so server jitter never produces
 * "-3" or "2.7" in the UI.
 */
export function formatInvitedCountLabel(count: number): string {
  const safe = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return `Invited : ${safe}`;
}
