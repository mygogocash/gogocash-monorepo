import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { fetchFavoriteOfferIds, toggleFavoriteOffer } from "@mobile/account/favoriteResource";
import { hasUsableMobileSessionToken } from "@mobile/auth/sessionValidity";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { getMobileEnv } from "@mobile/config/env";

export const INITIAL_FAVORITE_OFFER_IDS = [
  "brand-grocery-galaxy-1001",
  "brand-glow-theory-1005",
] as const;

type FavoriteBrandsContextValue = {
  readonly favoriteIds: readonly string[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
};

const FavoriteBrandsContext = createContext<FavoriteBrandsContextValue | null>(null);

/**
 * Apply optimistic toggles made while the initial fetch was in flight on top of the
 * server favorites. The server list is the base (so existing favorites are preserved);
 * each pending entry re-applies the user's intent (true = favorited, false = removed).
 */
function mergePendingFavoriteToggles(
  serverIds: readonly string[],
  pending: ReadonlyMap<string, boolean>,
): string[] {
  const merged = new Set(serverIds);
  for (const [id, desiredFavorite] of pending) {
    if (desiredFavorite) {
      merged.add(id);
    } else {
      merged.delete(id);
    }
  }
  return [...merged];
}

export function FavoriteBrandsProvider({ children }: PropsWithChildren) {
  const env = getMobileEnv();
  const session = useMobileSessionSnapshot();
  const isAuthed = hasUsableMobileSessionToken(session, env.accountDataSource);
  const [favoriteIds, setFavoriteIds] = useState<readonly string[]>(() =>
    env.accountDataSource === "backend" ? [] : [...INITIAL_FAVORITE_OFFER_IDS],
  );
  // Mirror committed favorites so toggleFavorite reads the latest set without depending
  // on `favoriteIds` (which would re-create the callback on every favorites change).
  const favoriteIdsRef = useRef(favoriteIds);
  favoriteIdsRef.current = favoriteIds;

  const favoritesFetchEpochRef = useRef(0);
  // Optimistic toggles recorded while the initial backend fetch is in flight, merged
  // onto the resolved server favorites so a toggle never erases the user's existing set.
  const pendingTogglesRef = useRef<Map<string, boolean>>(new Map());
  const initialFetchInFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const fetchEpoch = ++favoritesFetchEpochRef.current;

    if (env.accountDataSource !== "backend" || !env.apiUrl) {
      initialFetchInFlightRef.current = false;
      pendingTogglesRef.current.clear();
      return () => {
        cancelled = true;
      };
    }

    if (!isAuthed) {
      initialFetchInFlightRef.current = false;
      pendingTogglesRef.current.clear();
      setFavoriteIds([]);
      return () => {
        cancelled = true;
      };
    }

    initialFetchInFlightRef.current = true;
    pendingTogglesRef.current.clear();

    const settle = (serverIds: readonly string[]) => {
      // Ignore a fetch superseded by a later effect run (deps changed / logged out).
      if (cancelled || fetchEpoch !== favoritesFetchEpochRef.current) {
        return;
      }
      setFavoriteIds(mergePendingFavoriteToggles(serverIds, pendingTogglesRef.current));
      pendingTogglesRef.current.clear();
      initialFetchInFlightRef.current = false;
    };

    void fetchFavoriteOfferIds({ apiUrl: env.apiUrl })
      .then((ids) => settle(ids))
      .catch(() => settle([]));

    return () => {
      cancelled = true;
    };
  }, [env.accountDataSource, env.apiUrl, isAuthed]);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      const willFavorite = !favoriteIdsRef.current.includes(id);

      setFavoriteIds((previous) => {
        const has = previous.includes(id);
        if (willFavorite) {
          return has ? previous : [...previous, id];
        }
        return has ? previous.filter((entry) => entry !== id) : previous;
      });

      // While the initial fetch is still resolving, record the intent so the incoming
      // server favorites are merged with this toggle instead of dropping it (or dropping
      // the user's existing favorites). Once the fetch has settled there is nothing to
      // race, so no pending entry is needed.
      if (initialFetchInFlightRef.current) {
        pendingTogglesRef.current.set(id, willFavorite);
      }

      if (env.accountDataSource === "backend" && env.apiUrl && isAuthed) {
        void toggleFavoriteOffer({ apiUrl: env.apiUrl, offerId: id }).catch(() => {
          // Roll back the optimistic change, and if the fetch is still in flight, record
          // the reverted truth so the merge does not re-apply the failed toggle.
          if (initialFetchInFlightRef.current) {
            pendingTogglesRef.current.set(id, !willFavorite);
          }
          setFavoriteIds((previous) =>
            previous.includes(id)
              ? previous.filter((entry) => entry !== id)
              : [...previous, id],
          );
        });
      }
    },
    [env.accountDataSource, env.apiUrl, isAuthed],
  );

  const value = useMemo(
    () => ({ favoriteIds, isFavorite, toggleFavorite }),
    [favoriteIds, isFavorite, toggleFavorite],
  );

  return (
    <FavoriteBrandsContext.Provider value={value}>{children}</FavoriteBrandsContext.Provider>
  );
}

export function useFavoriteBrands(): FavoriteBrandsContextValue {
  const context = useContext(FavoriteBrandsContext);
  if (!context) {
    throw new Error("useFavoriteBrands must be used within <FavoriteBrandsProvider>");
  }
  return context;
}
