"use client";
import { createContext, ReactNode, useState, useMemo, useContext, useCallback } from "react";

interface CrossmintReadyContextType {
  isReady: boolean;
  setReady: () => void;
  reset: () => void;
  version: number;
}

export const CrossmintReadyContext = createContext<CrossmintReadyContextType>({
  isReady: false,
  setReady: () => {},
  reset: () => {},
  version: 0,
});

export const CrossmintReadyProvider = ({ children }: { children: ReactNode }) => {
  const [isReady, setIsReady] = useState(false);
  const [version, setVersion] = useState(0);

  const setReady = useCallback(() => {
    setIsReady(true);
  }, []);

  const reset = useCallback(() => {
    setIsReady(false);
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo(
    () => ({ isReady, setReady, reset, version }),
    [isReady, setReady, reset, version]
  );

  return <CrossmintReadyContext.Provider value={value}>{children}</CrossmintReadyContext.Provider>;
};

export const useCrossmintReady = () => {
  const context = useContext(CrossmintReadyContext);
  if (context === undefined) {
    throw new Error("useCrossmintReady must be used within a CrossmintReadyProvider");
  }
  return context;
};
