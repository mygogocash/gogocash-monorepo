import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { fetchFavoriteOfferIds, toggleFavoriteOffer } from "@mobile/account/favoriteResource";
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

export function FavoriteBrandsProvider({ children }: PropsWithChildren) {
  const env = getMobileEnv();
  const [favoriteIds, setFavoriteIds] = useState<readonly string[]>(INITIAL_FAVORITE_OFFER_IDS);

  useEffect(() => {
    if (env.accountDataSource !== "backend" || !env.apiUrl) {
      return;
    }

    void fetchFavoriteOfferIds({ apiUrl: env.apiUrl })
      .then((ids) => {
        if (ids.length > 0) {
          setFavoriteIds(ids);
        }
      })
      .catch(() => {
        // Keep fixture defaults when the backend favorites list is unavailable.
      });
  }, [env.accountDataSource, env.apiUrl]);

  const isFavorite = useCallback(
    (id: string) => favoriteIds.includes(id),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavoriteIds((previous) =>
        previous.includes(id) ? previous.filter((entry) => entry !== id) : [...previous, id],
      );

      if (env.accountDataSource === "backend" && env.apiUrl) {
        void toggleFavoriteOffer({ apiUrl: env.apiUrl, offerId: id }).catch(() => {
          setFavoriteIds((previous) =>
            previous.includes(id)
              ? previous.filter((entry) => entry !== id)
              : [...previous, id],
          );
        });
      }
    },
    [env.accountDataSource, env.apiUrl],
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
