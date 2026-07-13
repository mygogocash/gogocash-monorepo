import type { AccountDataSource } from "@mobile/auth/routeGuard";

/**
 * Legacy API surfaces the mobile app does not wire under `accountDataSource=backend`.
 * The NestJS API may still expose them for web/MiniPay; mobile uses Firebase phone OTP only.
 */
export const MOBILE_BACKEND_EXCLUDED_INTEGRATIONS = [
  "crossmint-auth",
  "web3-on-chain-withdraw",
  "minipay-siwe",
  "connect-wallet-auth",
  "crypto-payout-method",
] as const;

export const MOBILE_BACKEND_EXCLUDED_API_PREFIXES = [
  "/auth/sign-in",
  "/auth/minipay-siwe",
  "/auth/siwe-nonce",
] as const;

export function isWeb3ExcludedFromMobileBackend(source: AccountDataSource): boolean {
  return source === "backend";
}

// Providers hidden from the real (backend) app. wallet/telegram have no
// backend integration; apple/x/microsoft are disabled for launch (founder,
// 2026-07-12) — their sign-in seams stay intact, so re-enabling one is just
// removing its id here. Fixtures mode keeps the full parity list.
const BACKEND_HIDDEN_PROVIDER_IDS = new Set([
  "wallet",
  "telegram",
  "apple",
  "x",
  "microsoft",
]);

export function resolveAuthSocialProviders<T extends { id: string }>(
  providers: readonly T[],
  source: AccountDataSource,
): readonly T[] {
  if (!isWeb3ExcludedFromMobileBackend(source)) {
    return providers;
  }

  return providers.filter((provider) => !BACKEND_HIDDEN_PROVIDER_IDS.has(provider.id));
}

export const PAYOUT_METHOD_TABS = ["promptpay", "bank", "crypto"] as const;
export type PayoutMethodTab = (typeof PAYOUT_METHOD_TABS)[number];

export function resolvePayoutMethodTabs(
  source: AccountDataSource,
): readonly PayoutMethodTab[] {
  if (isWeb3ExcludedFromMobileBackend(source)) {
    return PAYOUT_METHOD_TABS.filter((tab) => tab !== "crypto");
  }

  return PAYOUT_METHOD_TABS;
}
