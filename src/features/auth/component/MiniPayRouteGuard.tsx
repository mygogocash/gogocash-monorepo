"use client";

/**
 * Redirect MiniPay users away from routes that don't apply to them:
 * auth (`/login`, `/register`), Link-MyCashBack and Account Setup
 * (Thai-only flows that assume phone/bank infrastructure). Mounts
 * invisibly in the client shell; returns null.
 */

import { useIsInMiniPay } from "@/lib/web3/useIsInMiniPay";
import { useIsWalletUser } from "@/lib/web3/useIsWalletUser";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const REDIRECT_PREFIXES = [
  "/login",
  "/register",
  "/link-mycashback",
  "/account-setup",
];

const LOCALES = ["en", "th"];

function stripLocale(pathname: string | null): string | null {
  if (!pathname) return pathname;
  const [, first, ...rest] = pathname.split("/");
  if (first && LOCALES.includes(first)) {
    return `/${rest.join("/")}` || "/";
  }
  return pathname;
}

function pathIsBlocked(pathname: string | null): boolean {
  const p = stripLocale(pathname);
  if (!p) return false;
  return REDIRECT_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
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
