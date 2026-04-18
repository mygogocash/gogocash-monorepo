"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { signOut, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { useQuery } from "@tanstack/react-query";
import { fetcherPost } from "@/lib/axios/client";
import { clearAxiosSessionCache } from "@/lib/axios/sessionForAxios";
import type { ResponseWithdrawCheck } from "@/interfaces/withdraw";

/**
 * App-wide session context.
 *
 * Exposes the NextAuth session, a logout wrapper, and the shared
 * `/withdraw/check` React Query result so multiple consumers (profile bar,
 * profile card, wallet hero) share one fetch. Auth flows through the
 * Firebase-based NextAuth config in `src/lib/authFirebase.ts`.
 */
type SessionContextValue = {
  session: Session | null | undefined;
  signOutAuth: () => Promise<void>;
  getCheck: ResponseWithdrawCheck | undefined;
  isGetCheckPending: boolean;
  isGetCheckError: boolean;
  getCheckError: unknown;
};

/** SSR / missing-provider fallback — mirrors the pre-existing "loading" shape. */
const createSafeFallback = (): SessionContextValue => ({
  session: null,
  signOutAuth: async () => {},
  getCheck: undefined,
  isGetCheckPending: true,
  isGetCheckError: false,
  getCheckError: null,
});

const SessionStateContext = createContext<SessionContextValue | null>(null);

export const SessionContextProvider = ({ children }: { children: ReactNode }) => {
  const { data: session } = useSession();

  const getCheckQuery = useQuery<ResponseWithdrawCheck>({
    queryKey: ["getCheck"],
    queryFn: () => fetcherPost("/withdraw/check"),
    enabled: Boolean(session?.user),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const signOutAuth = useCallback(async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
    clearAxiosSessionCache();
  }, []);

  const value: SessionContextValue = {
    session,
    signOutAuth,
    getCheck: getCheckQuery.data,
    isGetCheckPending: getCheckQuery.isPending,
    isGetCheckError: getCheckQuery.isError,
    getCheckError: getCheckQuery.error,
  };

  return <SessionStateContext.Provider value={value}>{children}</SessionStateContext.Provider>;
};

export const useSessionContext = (): SessionContextValue => {
  const context = useContext(SessionStateContext);
  if (!context) {
    return createSafeFallback();
  }
  return context;
};
