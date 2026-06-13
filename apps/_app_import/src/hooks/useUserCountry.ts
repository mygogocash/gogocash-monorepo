"use client";

import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/axios/client";
import type { User } from "@/interfaces/auth";
import { toIso2 } from "@/lib/countries/canonical";

/**
 * Returns the signed-in user's country as canonical ISO-2 (e.g. `"TH"`) or
 * `null` when:
 *   - the user is signed out / profile not loaded yet, or
 *   - the user has not set a country on their profile.
 *
 * `toIso2` normalises legacy values (full English names written before the
 * format was standardised, plus cached NextAuth sessions issued pre-migration)
 * so downstream consumers see a single canonical format regardless of when
 * the row was written.
 *
 * Discovery surfaces (home, Discover, search) feed this into
 * `filterOffersByCountry` / `dedupeOffersByBrand` so country-specific brands
 * only show to matching users. Guests / users without a country see only
 * `is_global=true` brands.
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
  const raw = data?.country ?? null;
  const country = raw ? toIso2(raw) || null : null;
  return { country, isLoading: isPending };
}
