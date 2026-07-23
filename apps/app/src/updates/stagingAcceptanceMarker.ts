/** Visible in device logcat after a staging-channel OTA applies to preview APKs. */
export const STAGING_ACCEPTANCE_MARKER = "issue-35-ota-2026-07-19";

export function logStagingAcceptanceMarker(
  log: (message: string) => void = console.log,
): void {
  log(`[gogocash] stagingAcceptanceMarker=${STAGING_ACCEPTANCE_MARKER}`);
}
