"use client";

import { useSyncExternalStore } from "react";

/**
 * True when the app is running inside the MiniPay in-app browser.
 *
 * MiniPay injects an EIP-1193 provider at `window.ethereum` with the flag
 * `isMiniPay: true` (see https://docs.minipay.xyz). We also accept a dev
 * override via `sessionStorage.gc_minipay_mock = "1"` so QA can exercise the
 * MiniPay branch in a desktop browser without the real wallet.
 *
 * Returns `false` during SSR and on first client render (pre-hydration) to
 * avoid hydration mismatches — the flag flips once the wallet injects.
 */
type MiniPayEthereum = { isMiniPay?: boolean } | undefined;

function readIsInMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  const eth = (window as typeof window & { ethereum?: MiniPayEthereum }).ethereum;
  if (eth?.isMiniPay === true) return true;
  try {
    if (window.sessionStorage.getItem("gc_minipay_mock") === "1") return true;
  } catch {
    // Private mode may throw on sessionStorage access — ignore.
  }
  return false;
}

/** No-op subscription: the injection flag doesn't change once mounted. */
const subscribe = () => () => {};

export function useIsInMiniPay(): boolean {
  return useSyncExternalStore(
    subscribe,
    readIsInMiniPay,
    () => false // SSR snapshot
  );
}
