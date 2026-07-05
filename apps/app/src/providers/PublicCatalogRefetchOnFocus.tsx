import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";

import { refetchPublicCatalogResources } from "@mobile/account/accountResourcePrefetch";
import { getMobileEnv } from "@mobile/config/env";

/**
 * Keeps home/catalog brand data fresh after admin updates by refetching public
 * catalog queries when the app returns to foreground (native) or tab visibility
 * (web). React Query's refetchOnWindowFocus covers web focus; this adds native
 * AppState and a visibility fallback for Expo web.
 */
export function PublicCatalogRefetchOnFocus() {
  const queryClient = useQueryClient();
  const env = getMobileEnv();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!env.apiUrl || env.accountDataSource !== "backend") {
      return;
    }

    const refetch = () => {
      void refetchPublicCatalogResources(queryClient, env.apiUrl, env.accountDataSource);
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasBackground =
        appStateRef.current === "inactive" || appStateRef.current === "background";

      if (wasBackground && nextState === "active") {
        refetch();
      }

      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [queryClient, env.apiUrl, env.accountDataSource]);

  useEffect(() => {
    if (Platform.OS !== "web" || !env.apiUrl || env.accountDataSource !== "backend") {
      return;
    }

    const refetch = () => {
      void refetchPublicCatalogResources(queryClient, env.apiUrl, env.accountDataSource);
    };

    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refetch();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [queryClient, env.apiUrl, env.accountDataSource]);

  return null;
}
