"use client";

import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/axios/client";
import type { User } from "@/interfaces/auth";

/**
 * Returns the signed-in user's country (e.g. `"Thailand"`) or `null` when:
 *   - the user is signed out / profile not loaded yet, or
 *   - the user has not set a country on their profile.
 *
 * Discovery surfaces (home, Discover, search) feed this into
 * `filterOffersByCountry` so country-specific brands only show to matching users.
 * Guests / users without a country see only `is_global=true` brands.
 *
 * The hook reuses the `["user", "profile"]` query so it shares the cache with
 * other call-sites that already fetch `/user/profile` (e.g. wallet/withdraw).
 */
export function useUserCountry(): { country: string | null; isLoading: boolean } {
  const { data, isPending } = useQuery<User>({
    queryKey: ["user", "profile"],
    queryFn: () => fetcher(`/user/profile`),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Soft-fail: if the request errors (e.g. signed out), treat as guest.
    retry: false,
  });
  const country = (data?.country ?? null) || null;
  return { country, isLoading: isPending };
}
