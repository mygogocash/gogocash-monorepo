"use client";

/**
 * Redirect MiniPay users away from routes that don't apply to them.
 *
 * Two tiers:
 * - Thai-only post-auth flows (`/link-mycashback`, `/account-setup`) never
 *   apply in a MiniPay context, signed in or not → blocked whenever
 *   `isInMiniPay || isWalletUser`.
 * - Auth routes (`/login`, `/register`) are only blocked once the user is
 *   actually authenticated as a wallet user. An anonymous visitor in the
 *   MiniPay mock (or a real MiniPay session where auto-SIWE hasn't landed
 *   yet) still needs `/login` as an escape hatch.
 */

import { routing } from "@/i18n/routing";
import { useIsInMiniPay } from "@/lib/web3/useIsInMiniPay";
import { useIsWalletUser } from "@/lib/web3/useIsWalletUser";
// NOTE: We intentionally import from `next/navigation` (not
// `@/i18n/navigation`) even though most other components use the i18n-aware
// wrapper. This component mounts inside ProviderDefault in the ROOT
// `app/layout.tsx`, which sits ABOVE the NextIntlClientProvider in
// `app/[locale]/layout.tsx`. Importing from `@/i18n/navigation` throws
// "No intl context found" on first render. `router.replace("/")` still
// lands the user on the correct locale because next-intl middleware
// re-applies the locale prefix on the redirect response.
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const THAI_ONLY_PREFIXES = ["/link-mycashback", "/account-setup"];
const AUTH_PREFIXES = ["/login", "/register"];

function stripLocale(pathname: string | null): string | null {
  if (!pathname) return pathname;
  const [, first, ...rest] = pathname.split("/");
  if (first && (routing.locales as readonly string[]).includes(first)) {
    return `/${rest.join("/")}` || "/";
  }
  return pathname;
}

function matchesPrefix(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function MiniPayRouteGuard() {
  const isInMiniPay = useIsInMiniPay();
  const isWalletUser = useIsWalletUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isInMiniPay && !isWalletUser) return;
    const p = stripLocale(pathname);
    if (!p) return;

    const blockThai = matchesPrefix(p, THAI_ONLY_PREFIXES);
    const blockAuth = isWalletUser && matchesPrefix(p, AUTH_PREFIXES);

    if (blockThai || blockAuth) {
      router.replace("/");
    }
  }, [isInMiniPay, isWalletUser, pathname, router]);

  return null;
}
