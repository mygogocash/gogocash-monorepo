"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** True on the client after hydration — use to skip SSR for chart/DOM-measured UI. */
export function useClientMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
