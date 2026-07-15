import { createElement, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

const platformState = { OS: "web" as "web" | "android" | "ios" };
vi.mock("react-native", async () => {
  const actual =
    await vi.importActual<typeof import("react-native")>("react-native");
  return {
    ...actual,
    get Platform() {
      return { ...actual.Platform, OS: platformState.OS };
    },
  };
});

vi.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    navigate: vi.fn(),
  }),
  usePathname: () => "/login",
  useLocalSearchParams: () => ({}),
}));

const isLineLoginConfigured = vi.fn(() =>
  Boolean(process.env.EXPO_PUBLIC_LIFF_ID?.trim()),
);
const requestLineLogin = vi.fn();
const exchangeLineAuth = vi.fn();
const lineAuthUserMessages = {
  "account-disabled": "This GoGoCash account is disabled. Contact support.",
  "account-link-failed":
    "We couldn't link your LINE account. Please try again or contact support.",
  "provider-unavailable":
    "LINE sign-in is temporarily unavailable. Please try again.",
  "session-expired": "Your LINE sign-in expired. Start LINE sign-in again.",
  unknown: "We couldn't finish LINE sign-in. Please try again.",
} as const;
vi.mock("@mobile/auth/lineLogin", () => ({
  isLineLoginConfigured: () => isLineLoginConfigured(),
  requestLineLogin: (...args: unknown[]) => requestLineLogin(...args),
  exchangeLineAuth: (...args: unknown[]) => exchangeLineAuth(...args),
  getLineAuthUserMessage: (error: unknown) => {
    if (
      typeof error !== "object" ||
      error === null ||
      !("kind" in error) ||
      typeof error.kind !== "string"
    ) {
      return null;
    }
    return (
      lineAuthUserMessages[
        error.kind as keyof typeof lineAuthUserMessages
      ] ?? null
    );
  },
}));

import { ToastProvider } from "@mobile/components/Toast";
import { authSendErrorMessages } from "@mobile/i18n/toastMessages";
import { CustomerAuthScreen } from "@mobile/screens/CustomerAuthScreen";

function renderLogin() {
  return render(
    createElement(
      ToastProvider,
      {},
      createElement(CustomerAuthScreen, { mode: "login" }),
    ),
  );
}

describe("CustomerAuthScreen — LINE platform guard", () => {
  beforeEach(() => {
    platformState.OS = "web";
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    vi.stubEnv("EXPO_PUBLIC_API_URL", "https://api-staging.gogocash.co");
    vi.stubEnv("EXPO_PUBLIC_LIFF_ID", "");
    isLineLoginConfigured.mockClear();
    requestLineLogin.mockReset();
    exchangeLineAuth.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    platformState.OS = "web";
  });

  it("native > given no LIFF id > reports that LINE sign-in is web-only before checking web config", async () => {
    platformState.OS = "android";

    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "LINE" }));

    await waitFor(() => {
      expect(screen.getByText(authSendErrorMessages.webOnly)).toBeTruthy();
    });
    expect(isLineLoginConfigured).not.toHaveBeenCalled();
    expect(requestLineLogin).not.toHaveBeenCalled();
  });

  it("web > given no LIFF id > reports Coming soon and does not start LINE login", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "LINE" }));

    await waitFor(() => {
      expect(screen.getByText("Coming soon")).toBeTruthy();
    });
    expect(isLineLoginConfigured).toHaveBeenCalledOnce();
    expect(requestLineLogin).not.toHaveBeenCalled();
  });

  it("web > given the staging LIFF id > starts LINE login", async () => {
    vi.stubEnv("EXPO_PUBLIC_LIFF_ID", "2008237916-KY5oR5mW");
    requestLineLogin.mockImplementation(() => new Promise(() => {}));

    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: "LINE" }));

    await waitFor(() => {
      expect(requestLineLogin).toHaveBeenCalledOnce();
    });
    expect(isLineLoginConfigured).toHaveBeenCalledOnce();
    expect(screen.queryByText("Coming soon")).toBeNull();
  });

  it.each([
    ["account-disabled", lineAuthUserMessages["account-disabled"]],
    ["provider-unavailable", lineAuthUserMessages["provider-unavailable"]],
    ["account-link-failed", lineAuthUserMessages["account-link-failed"]],
  ] as const)(
    "web > retained LIFF session with %s > shows scenario-specific recovery copy",
    async (kind, expectedCopy) => {
      vi.stubEnv("EXPO_PUBLIC_LIFF_ID", "2008237916-KY5oR5mW");
      requestLineLogin.mockResolvedValue({
        accessToken: "line-access-token",
        profile: { userId: "line-user" },
      });
      exchangeLineAuth.mockRejectedValue(
        Object.assign(new Error("safe typed LINE failure"), { kind }),
      );

      renderLogin();
      fireEvent.click(screen.getByRole("button", { name: "LINE" }));

      await waitFor(() => {
        expect(screen.getByText(expectedCopy)).toBeTruthy();
      });
      expect(screen.queryByText("Could not complete your request. Please try again.")).toBeNull();
    },
  );
});
