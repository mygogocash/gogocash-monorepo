import { createElement, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

const routerPush = vi.fn();
vi.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useRouter: () => ({ push: routerPush, replace: vi.fn(), back: vi.fn(), navigate: vi.fn() }),
  usePathname: () => "/login",
}));

const signInWithSocialProvider = vi.fn();
vi.mock("@mobile/auth/firebaseSocialAuth", () => ({
  isFirebaseSocialProviderId: (id: string) =>
    ["facebook", "google", "apple", "x", "microsoft"].includes(id),
  signInWithSocialProvider: (...args: unknown[]) => signInWithSocialProvider(...args),
}));

const exchangeFirebaseIdToken = vi.fn();
vi.mock("@mobile/auth/firebaseLogin", () => ({
  exchangeFirebaseIdToken: (...args: unknown[]) => exchangeFirebaseIdToken(...args),
}));

import { CustomerAuthScreen } from "@mobile/screens/CustomerAuthScreen";
import { mobileSessionStorageKey } from "@mobile/auth/session";

function readStoredSession(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(mobileSessionStorageKey);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

describe("CustomerAuthScreen — backend mode social sign-in", () => {
  beforeEach(() => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    vi.stubEnv("EXPO_PUBLIC_API_URL", "https://api.dev.gogocash.co");
    window.localStorage.clear();
    routerPush.mockClear();
    signInWithSocialProvider.mockReset();
    exchangeFirebaseIdToken.mockReset();
    signInWithSocialProvider.mockResolvedValue({ idToken: "google-id-token" });
    exchangeFirebaseIdToken.mockResolvedValue({
      access_token: "backend-access-token",
      provider: "google.com",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it("backend mode > tapping Google > exchanges the Firebase token and persists the session", async () => {
    render(createElement(CustomerAuthScreen, { mode: "login" }));

    fireEvent.click(screen.getByRole("button", { name: "Gmail" }));

    await waitFor(() => {
      expect(signInWithSocialProvider).toHaveBeenCalledWith("google");
    });
    await waitFor(() => {
      expect(exchangeFirebaseIdToken).toHaveBeenCalledWith({
        apiUrl: "https://api.dev.gogocash.co",
        country: "TH",
        idToken: "google-id-token",
      });
    });
    await waitFor(() => {
      expect(readStoredSession()?.access_token).toBe("backend-access-token");
    });
    expect(routerPush).toHaveBeenCalledWith("/link-mycashback");
  });
});
