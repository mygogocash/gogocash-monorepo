import { ServiceUnavailableException } from '@nestjs/common';

/**
 * Global withdrawal kill-switch for cutover/maintenance windows.
 *
 * During the Railway beta/cutover the real chain signer can be live while
 * risky operations run (DNS flips, DB repoints). Setting
 * WITHDRAWALS_ENABLED=false pauses signature issuance and on-chain
 * broadcasting with a clean 503 while the rest of the API keeps serving.
 * Only the literal string 'false' disables (same exact-match idiom as
 * CRON_ENABLED / POSTHOG_ENABLED) so a dropped or typo'd variable can
 * never silently pause real payouts.
 */
export function isWithdrawalsEnabled(
  raw: string | undefined = process.env.WITHDRAWALS_ENABLED,
): boolean {
  return raw !== 'false';
}

export function assertWithdrawalsEnabled(
  raw: string | undefined = process.env.WITHDRAWALS_ENABLED,
): void {
  if (!isWithdrawalsEnabled(raw)) {
    throw new ServiceUnavailableException(
      'Withdrawals are temporarily paused. Please try again shortly.',
    );
  }
}
