import { Platform } from "react-native";

import type { BackendLoginResponse } from "@mobile/auth/firebaseLogin";
import { mapLoginResponseToMobileSession } from "@mobile/auth/firebaseLogin";
import type { MobileSession } from "@mobile/auth/session";

export type LineProfilePayload = {
  userId: string;
  displayName?: string;
  pictureUrl?: string;
};

type LiffSdk = {
  init: (config: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: (config?: { redirectUri?: string }) => void;
  getAccessToken: () => string | null;
  getProfile: () => Promise<LineProfilePayload>;
};

declare global {
  interface Window {
    liff?: LiffSdk;
  }
}

const LIFF_SDK_SCRIPT = "https://static.line-scdn.net/liff/edge/2/sdk.js";

export class LineLoginNotConfiguredError extends Error {
  constructor(message = "LINE login is not configured") {
    super(message);
    this.name = "LineLoginNotConfiguredError";
  }
}

export function getLiffId(): string {
  return process.env.EXPO_PUBLIC_LIFF_ID?.trim() || "";
}

export function isLineLoginConfigured(): boolean {
  return getLiffId().length > 0;
}

async function loadLiffSdk(): Promise<LiffSdk> {
  if (typeof window === "undefined") {
    throw new Error("LINE login currently supports Expo web only.");
  }

  if (window.liff) {
    return window.liff;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LIFF_SDK_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("LINE SDK failed to load")), {
        once: true,
      });
      if (window.liff) {
        resolve();
      }
      return;
    }

    const script = document.createElement("script");
    script.src = LIFF_SDK_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("LINE SDK failed to load"));
    document.head.appendChild(script);
  });

  if (!window.liff) {
    throw new Error("LINE SDK unavailable after load");
  }
  return window.liff;
}

/**
 * Opens LIFF login (web). When already logged in inside LINE Mini App / LIFF,
 * returns the access token + profile without a redirect.
 */
export async function requestLineLogin(liffId = getLiffId()): Promise<{
  accessToken: string;
  profile: LineProfilePayload;
}> {
  if (Platform.OS !== "web") {
    return Promise.reject(new Error("LINE login currently supports Expo web only."));
  }
  if (!liffId) {
    throw new LineLoginNotConfiguredError();
  }

  const liff = await loadLiffSdk();
  await liff.init({ liffId });

  if (!liff.isLoggedIn()) {
    liff.login({
      redirectUri: typeof window !== "undefined" ? window.location.href : undefined,
    });
    // Redirect in progress — reject so the caller does not keep a busy spinner forever.
    throw Object.assign(new Error("Redirecting to LINE login"), {
      code: "auth/popup-closed-by-user",
    });
  }

  const accessToken = liff.getAccessToken();
  if (!accessToken) {
    throw new Error("LINE access token missing after login");
  }

  const profile = await liff.getProfile();
  if (!profile?.userId) {
    throw new Error("LINE profile missing userId");
  }

  return { accessToken, profile };
}

export async function exchangeLineAuth({
  accessToken,
  apiUrl,
  country,
  fetchImpl = fetch,
  profile,
}: {
  accessToken: string;
  apiUrl: string;
  country?: string;
  fetchImpl?: typeof fetch;
  profile: LineProfilePayload;
}): Promise<MobileSession> {
  const baseUrl = apiUrl.replace(/\/+$/, "");
  const response = await fetchImpl(`${baseUrl}/auth/line-login`, {
    body: JSON.stringify({
      id_line: profile.userId,
      ...(profile.displayName ? { username: profile.displayName } : {}),
      ...(profile.pictureUrl ? { picture_url: profile.pictureUrl } : {}),
      ...(country ? { country } : {}),
    }),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const body = (await response.json().catch(() => ({}))) as BackendLoginResponse & {
    message?: string;
  };
  if (!response.ok) {
    throw new Error(body?.message || `LINE login failed with status ${response.status}.`);
  }

  return mapLoginResponseToMobileSession(body);
}
