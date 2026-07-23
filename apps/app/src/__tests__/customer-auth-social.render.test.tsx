import { createElement, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

const platformState = { OS: "web" as "web" | "android" | "ios" };
vi.mock("react-native", async () => {
  const actual = await vi.importActual<typeof import("react-native")>("react-native");
  return {
    ...actual,
    get Platform() {
      return { ...actual.Platform, OS: platformState.OS };
    },
  };
});

const routerPush = vi.fn();
const routerReplace = vi.fn();
vi.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useRouter: () => ({
    push: routerPush,
    replace: routerReplace,
    back: vi.fn(),
    navigate: vi.fn(),
  }),
  usePathname: () => "/login",
  useLocalSearchParams: () => ({}),
}));

const signInWithSocialProvider = vi.fn();
vi.mock("@mobile/auth/firebaseSocialAuth", () => ({
  isFirebaseSocialProviderId: (id: string) =>
    ["facebook", "google", "apple", "x", "microsoft"].includes(id),
  signInWithSocialProvider: (...args: unknown[]) => signInWithSocialProvider(...args),
}));

const signInWithNativeGoogle = vi.fn();
class GoogleSignInNotConfiguredError extends Error {
  constructor(message = "Google Sign-In is not configured") {
    super(message);
    this.name = "GoogleSignInNotConfiguredError";
  }
}
vi.mock("@mobile/auth/nativeGoogleAuth", () => ({
  GoogleSignInNotConfiguredError,
  signInWithNativeGoogle: (...args: unknown[]) => signInWithNativeGoogle(...args),
}));

const signInWithNativeOAuth = vi.fn();
class NativeOAuthNotConfiguredError extends Error {
  constructor(message = "Native social sign-in is not configured") {
    super(message);
    this.name = "NativeOAuthNotConfiguredError";
  }
}
vi.mock("@mobile/auth/nativeOAuthSignIn", () => ({
  NativeOAuthNotConfiguredError,
  signInWithNativeOAuth: (...args: unknown[]) => signInWithNativeOAuth(...args),
}));

const exchangeFirebaseIdToken = vi.fn();
vi.mock("@mobile/auth/firebaseLogin", () => ({
  exchangeFirebaseIdToken: (...args: unknown[]) => exchangeFirebaseIdToken(...args),
}));

import { ToastProvider } from "@mobile/components/Toast";
import { CustomerAuthScreen } from "@mobile/screens/CustomerAuthScreen";
import { mobileSessionStorageKey } from "@mobile/auth/session";

function readStoredSession(): Record<string, unknown> | null {
  const raw = window.localStorage.getItem(mobileSessionStorageKey);
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
}

function renderLogin() {
  return render(
    createElement(ToastProvider, {}, createElement(CustomerAuthScreen, { mode: "login" }))
  );
}

describe("CustomerAuthScreen — backend mode social sign-in", () => {
  beforeEach(() => {
    platformState.OS = "web";
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    vi.stubEnv("EXPO_PUBLIC_API_URL", "https://api.dev.gogocash.co");
    window.localStorage.clear();
    routerPush.mockClear();
    routerReplace.mockClear();
    signInWithSocialProvider.mockReset();
    signInWithNativeGoogle.mockReset();
    signInWithNativeOAuth.mockReset();
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
    platformState.OS = "web";
  });

  it("backend mode > tapping Google > exchanges the Firebase token and persists the session", async () => {
    renderLogin();

    fireEvent.click(screen.getByRole("button", { name: "Google" }));

    await waitFor(() => {
      expect(signInWithSocialProvider).toHaveBeenCalledWith("google");
    });
    await waitFor(() => {
      expect(exchangeFirebaseIdToken).toHaveBeenCalledWith({
        apiUrl: "https://api.dev.gogocash.co",
        country: "TH",
        idToken: "google-id-token",
        intent: "login",
      });
    });
    await waitFor(() => {
      expect(readStoredSession()?.access_token).toBe("backend-access-token");
    });
    expect(routerReplace).toHaveBeenCalledWith("/link-mycashback");
  });

  it("native Google > given configured client > uses nativeGoogleAuth and exchanges the token", async () => {
    platformState.OS = "android";
    signInWithNativeGoogle.mockResolvedValue({ idToken: "native-google-id-token" });

    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Google" }));

    await waitFor(() => {
      expect(signInWithNativeGoogle).toHaveBeenCalled();
    });
    expect(signInWithSocialProvider).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(exchangeFirebaseIdToken).toHaveBeenCalledWith({
        apiUrl: "https://api.dev.gogocash.co",
        country: "TH",
        idToken: "native-google-id-token",
        intent: "login",
      });
    });
    await waitFor(() => {
      expect(readStoredSession()?.access_token).toBe("backend-access-token");
    });
  });

  it("native Google > given not configured > shows Coming soon toast", async () => {
    platformState.OS = "android";
    signInWithNativeGoogle.mockRejectedValue(new GoogleSignInNotConfiguredError());

    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "Google" }));

    await waitFor(() => {
      expect(signInWithNativeGoogle).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText("Coming soon")).toBeTruthy();
    });
    expect(exchangeFirebaseIdToken).not.toHaveBeenCalled();
  });

  it("disabled providers > Apple is not rendered in backend mode", () => {
    // Founder (2026-07-12): Apple/X/Microsoft disabled for launch. The apple
    // native OAuth seam stays covered by native-oauth-signin.test.ts for when
    // the provider is re-enabled.
    platformState.OS = "android";

    renderLogin();
    expect(screen.queryByRole("button", { name: "Apple" })).toBeNull();
  });

  it("re-enabled providers > Facebook and Telegram render in backend mode", () => {
    // Founder (2026-07-22): Facebook + Telegram re-enabled. Both sign-in seams were
    // already built — Facebook via Firebase FacebookAuthProvider, Telegram via the
    // /auth/log-in/telegram endpoint + Login Widget (web-only tap handler).
    platformState.OS = "android";

    renderLogin();
    expect(screen.queryByRole("button", { name: "Facebook" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Telegram" })).not.toBeNull();
  });

  it("disabled providers > Microsoft and X are not rendered in backend mode", () => {
    platformState.OS = "android";

    renderLogin();
    expect(screen.queryByRole("button", { name: "Microsoft" })).toBeNull();
    expect(screen.queryByRole("button", { name: "X" })).toBeNull();
  });
});
