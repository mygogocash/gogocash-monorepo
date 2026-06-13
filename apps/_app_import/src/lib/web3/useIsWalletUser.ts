"use client";

import { useSession } from "next-auth/react";

/**
 * True when the current session was issued via the MiniPay SIWE flow.
 * Distinct from `useIsInMiniPay()`: a user may *be in* MiniPay but not yet
 * authenticated, or may have signed in via MiniPay and then opened the app
 * in a regular browser where the wallet is no longer injected.
 */
export function useIsWalletUser(): boolean {
  const { data: session } = useSession();
  return session?.user?.provider === "minipay";
}
