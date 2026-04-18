"use client";

/**
 * Redirect MiniPay users away from routes that don't apply to them:
 * auth (`/login`, `/register`), Link-MyCashBack and Account Setup
 * (Thai-only flows that assume phone/bank infrastructure). Mounts
 * invisibly in the client shell; returns null.
 */

import { useIsInMiniPay } from "@/lib/web3/useIsInMiniPay";
import { useIsWalletUser } from "@/lib/web3/useIsWalletUser";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useEffect } from "react";

const REDIRECT_PREFIXES = [
  "/login",
  "/register",
  "/link-mycashback",
  "/account-setup",
];

function pathIsBlocked(pathname: string | null): boolean {
  if (!pathname) return false;
  return REDIRECT_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function MiniPayRouteGuard() {
  const isInMiniPay = useIsInMiniPay();
  const isWalletUser = useIsWalletUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isInMiniPay && !isWalletUser) return;
    if (pathIsBlocked(pathname)) {
      router.replace("/");
    }
  }, [isInMiniPay, isWalletUser, pathname, router]);

  return null;
}
