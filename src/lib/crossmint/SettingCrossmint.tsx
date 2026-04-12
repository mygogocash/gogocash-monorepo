"use client";
import {
  CrossmintAuthProvider,
  CrossmintProvider,
  CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-ui";
import { ReactNode, memo, useEffect } from "react";
import { env } from "@/env";
import { shouldUseMockApi } from "@/lib/env";
import { useCrossmintReady } from "@/providers/CrossmintReadyContext";

const SettingCrossmint = ({ children }: { children: ReactNode }) => {
  const { setReady, version } = useCrossmintReady();

  const clientSecret = env.NEXT_PUBLIC_CROSSMINT_API_KEY || "";
  const hasValidApiKey =
    clientSecret && (clientSecret.startsWith("ck_") || clientSecret.startsWith("sk_"));

  const demoModeWithoutBackend = shouldUseMockApi();

  useEffect(() => {
    if (!hasValidApiKey) {
      queueMicrotask(() => setReady());
      return;
    }
    const delayMs = demoModeWithoutBackend ? 0 : 120;
    const timer = setTimeout(() => setReady(), delayMs);
    return () => clearTimeout(timer);
  }, [demoModeWithoutBackend, hasValidApiKey, setReady, version]);

  if (!hasValidApiKey) {
    return <>{children}</>;
  }

  return (
    <CrossmintProvider key={version} apiKey={clientSecret}>
      <CrossmintAuthProvider
        onLoginSuccess={() => {
          window.sessionStorage.setItem("isAfterLogin", "true");
        }}
        loginMethods={["email", "google", "twitter"]}
      >
        <CrossmintWalletProvider>{children}</CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
};

export default memo(SettingCrossmint);
