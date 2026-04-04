"use client";

import useCrossmintLogin from "@/hooks/useCrossmintLogin";
import { Session } from "next-auth";
import { createContext, ReactNode, useContext } from "react";

type CrossmintLoginContextValue = ReturnType<typeof useCrossmintLogin> | undefined;

const CrossmintLoginStateContext = createContext<CrossmintLoginContextValue>(undefined);

/** SSR / missing-provider fallback: no fake `getCheck` object — use `isGetCheckPending` vs real data. */
const createSafeFallback = (): ReturnType<typeof useCrossmintLogin> => ({
  user: null,
  jwt: null,
  wallet: null,
  status: "loading" as const,
  loginState: {
    isLoggingIn: false,
    hasAttemptedLogin: false,
    error: null,
    retryCount: 0,
  },
  signOutAuth: async () => {},
  login: () => {},
  logout: async () => {},
  getOrCreateWallet: async () => null,
  createPasskeySigner: async () => null,
  getUser: () => {},
  getCheck: undefined,
  isGetCheckPending: true,
  isGetCheckError: false,
  getCheckError: null,
  session: {} as Session,
});

export const CrossmintLoginContext = ({ children }: { children: ReactNode }) => {
  const value = useCrossmintLogin();
  return (
    <CrossmintLoginStateContext.Provider value={{ ...value }}>
      {children}
    </CrossmintLoginStateContext.Provider>
  );
};

export const useCrossmintLoginContext = () => {
  const context = useContext(CrossmintLoginStateContext);

  // Handle SSR and hydration issues
  if (!context) {
    // Check if we're on the server or during hydration
    if (typeof window === "undefined") {
      // SSR - provide safe defaults
      return createSafeFallback();
    } else {
      return createSafeFallback();
    }
  }
  return context;
};
