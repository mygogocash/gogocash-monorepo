"use client";

import { useQuery } from "@tanstack/react-query";
import { getUserSubscription } from "../actions";
import type { SubscriptionState } from "../types";

function normalizeSubscriptionState(raw: SubscriptionState): SubscriptionState {
  const end = raw.currentPeriodEnd;
  return {
    ...raw,
    currentPeriodEnd:
      end == null ? null : end instanceof Date ? end : new Date(end as unknown as string | number),
  };
}

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => normalizeSubscriptionState(await getUserSubscription()),
  });
}
