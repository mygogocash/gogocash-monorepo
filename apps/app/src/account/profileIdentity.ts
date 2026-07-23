import type { MobileSession } from "@mobile/auth/session";
import { getMobileEnv } from "@mobile/config/env";
import { webProfileHeroCard, webProfileWalletSummary } from "@mobile/design/webDesignParity";

/**
 * Live-session identity display, replacing fixture fallbacks on real screens.
 *
 * Field bug 2026-07-10: a live signed-in account without a username rendered
 * as fixture "Mock User" next to a REAL wallet balance, and the hero showed
 * the fixture "Last Updated: 28 Mar 2026 07:00" — mock data on live surfaces
 * makes real screens look fake and demo screens look real. In backend mode
 * every fallback here derives from the session; the fixture strings survive
 * only in fixtures mode (design parity).
 */

function isBackendMode(): boolean {
  return getMobileEnv().accountDataSource === "backend";
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function maskTrailing(value: string): string {
  return `***${value.slice(-4).padStart(4, "*")}`;
}

export function resolveProfileDisplayName(session: MobileSession | null): string {
  const username = str(session?.username);
  if (username) {
    return username;
  }
  if (!isBackendMode()) {
    return webProfileWalletSummary.username;
  }
  const mobile = str(session?.mobile);
  if (mobile) {
    return maskTrailing(mobile.replace(/\D/g, "") || mobile);
  }
  const id = str(session?._id);
  return id ? maskTrailing(id) : "";
}

/** Backend mode has no real balance timestamp — hide the row instead of faking one. */
export function resolveProfileLastUpdated(): string | null {
  return isBackendMode() ? null : webProfileWalletSummary.lastUpdated;
}

/** Hero "USER ID" chip value — the real account id in backend mode (it is also
 * what the copy button copies), the design-parity fixture otherwise. */
export function resolveProfileUserId(session: MobileSession | null): string {
  if (!isBackendMode()) {
    return webProfileHeroCard.userId;
  }
  return str(session?._id) ?? "";
}

export function resolveProfileMaskedId(session: MobileSession | null): string {
  const id = str(session?._id);
  if (id) {
    return maskTrailing(id);
  }
  return isBackendMode() ? "" : webProfileWalletSummary.maskedId;
}

/** Design-parity fixtures for Personal Information Link Email / Phone (fixtures mode only). */
export const FIXTURE_PROFILE_EMAIL = "mock.user@gogocash.test";
export const FIXTURE_PROFILE_PHONE = "+66123456789";

/**
 * Issue #411: Link Email painted fixture `mock.user@gogocash.test` on live sessions.
 * Backend mode reads `session.email`; fixtures mode keeps design-parity mocks.
 */
export function resolveProfileEmail(session: MobileSession | null): string {
  if (!isBackendMode()) {
    return FIXTURE_PROFILE_EMAIL;
  }
  return str(session?.email) ?? "";
}

/**
 * Issue #411: Link Phone painted fixture `+66123456789` on live sessions.
 * Backend mode reads `session.mobile`; fixtures mode keeps design-parity mocks.
 */
export function resolveProfilePhone(session: MobileSession | null): string {
  if (!isBackendMode()) {
    return FIXTURE_PROFILE_PHONE;
  }
  return str(session?.mobile) ?? "";
}
