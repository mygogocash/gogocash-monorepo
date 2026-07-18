import { createElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routerState = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  replace: vi.fn(),
}));

vi.mock("expo-router", async () => {
  const actual = await vi.importActual<
    typeof import("../test-support/expoRouterStub")
  >("../test-support/expoRouterStub");
  return {
    ...actual,
    useLocalSearchParams: () => routerState.params,
    useRouter: () => ({ ...actual.router, replace: routerState.replace }),
  };
});

const lineAuth = vi.hoisted(() => ({
  exchange: vi.fn(),
  resume: vi.fn(),
}));

vi.mock("@mobile/auth/lineLogin", () => {
  class LineAuthExchangeError extends Error {
    constructor(
      public readonly kind:
        | "account-disabled"
        | "account-link-failed"
        | "provider-unavailable"
        | "session-expired"
        | "unknown",
      public readonly status: number,
    ) {
      super("Safe LINE sign-in failure");
      this.name = "LineAuthExchangeError";
    }
  }

  class LineLoginSessionMissingError extends Error {
    constructor() {
      super("LINE login session missing");
      this.name = "LineLoginSessionMissingError";
    }
  }

  return {
    exchangeLineAuth: (...args: unknown[]) => lineAuth.exchange(...args),
    LINE_AUTH_DEFAULT_POST_LOGIN_PATH: "/profile",
    LineAuthExchangeError,
    LineLoginSessionMissingError,
    navigateAfterLineAuthSuccess: (path: string, replaceFn: (href: string) => void) => {
      replaceFn(path);
    },
    resumeLineLogin: (...args: unknown[]) => lineAuth.resume(...args),
  };
});

const persistMobileSession = vi.hoisted(() => vi.fn());
vi.mock("@mobile/auth/session", () => ({
  persistMobileSession: (...args: unknown[]) => persistMobileSession(...args),
}));

const markIntroModalPending = vi.hoisted(() => vi.fn());
vi.mock("@mobile/features/introModal/introModalSession", () => ({
  markIntroModalPending: () => markIntroModalPending(),
}));

const hapticsSuccess = vi.hoisted(() => vi.fn());
const hapticsError = vi.hoisted(() => vi.fn());
vi.mock("@mobile/lib/haptics", () => ({
  haptics: {
    error: () => hapticsError(),
    success: () => hapticsSuccess(),
  },
}));

import {
  LineAuthExchangeError,
  LineLoginSessionMissingError,
} from "@mobile/auth/lineLogin";
import { CustomerLineAuthCallbackScreen } from "@mobile/screens/CustomerLineAuthCallbackScreen";

describe("CustomerLineAuthCallbackScreen", () => {
  beforeEach(() => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    vi.stubEnv("EXPO_PUBLIC_API_URL", "https://api-staging.gogocash.co");
    vi.stubEnv("EXPO_PUBLIC_LIFF_ID", "2008237916-KY5oR5mW");
    routerState.params = {};
    routerState.replace.mockReset();
    lineAuth.resume.mockReset();
    lineAuth.exchange.mockReset();
    persistMobileSession.mockReset();
    markIntroModalPending.mockReset();
    hapticsSuccess.mockReset();
    hapticsError.mockReset();
    lineAuth.resume.mockResolvedValue({
      accessToken: "line-access",
      profile: { displayName: "LINE User", userId: "U123" },
    });
    lineAuth.exchange.mockResolvedValue({
      access_token: "backend-token",
      provider: "line",
    });
    persistMobileSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returned browser load > automatically resumes, exchanges, persists, and redirects without a second tap", async () => {
    routerState.params = { callbackUrl: "/wallet" };

    render(createElement(CustomerLineAuthCallbackScreen));

    await waitFor(() => {
      expect(routerState.replace).toHaveBeenCalledWith("/wallet");
    });
    expect(lineAuth.resume).toHaveBeenCalledTimes(1);
    expect(lineAuth.exchange).toHaveBeenCalledWith({
      accessToken: "line-access",
      apiUrl: "https://api-staging.gogocash.co",
      profile: { displayName: "LINE User", userId: "U123" },
    });
    expect(persistMobileSession).toHaveBeenCalledWith({
      access_token: "backend-token",
      provider: "line",
      username: "LINE User",
    });
    expect(markIntroModalPending).toHaveBeenCalledOnce();
    expect(hapticsSuccess).toHaveBeenCalledOnce();
    expect(persistMobileSession.mock.invocationCallOrder[0]).toBeLessThan(
      routerState.replace.mock.invocationCallOrder[0],
    );
  });

  it("unsafe callback > falls back to the fixed post-login route", async () => {
    routerState.params = { callbackUrl: "https://evil.example/steal" };

    render(createElement(CustomerLineAuthCallbackScreen));

    await waitFor(() => {
      expect(routerState.replace).toHaveBeenCalledWith("/profile");
    });
  });

  it("missing LIFF session > renders actionable expired copy without exchanging or redirecting", async () => {
    lineAuth.resume.mockRejectedValue(new LineLoginSessionMissingError());

    render(createElement(CustomerLineAuthCallbackScreen));

    await waitFor(() => {
      expect(screen.getByText("LINE sign-in expired")).toBeTruthy();
    });
    expect(
      screen.getByText("Return to sign in and try LINE again."),
    ).toBeTruthy();
    expect(lineAuth.exchange).not.toHaveBeenCalled();
    expect(persistMobileSession).not.toHaveBeenCalled();
    expect(routerState.replace).not.toHaveBeenCalled();
    expect(hapticsError).toHaveBeenCalledOnce();
  });

  it("typed account-disabled failure > shows safe scenario copy and never persists", async () => {
    lineAuth.exchange.mockRejectedValue(
      new LineAuthExchangeError("account-disabled", 403),
    );

    render(createElement(CustomerLineAuthCallbackScreen));

    await waitFor(() => {
      expect(screen.getByText("Account unavailable")).toBeTruthy();
    });
    expect(
      screen.getByText(
        "This GoGoCash account is disabled. Contact support if you need help.",
      ),
    ).toBeTruthy();
    expect(persistMobileSession).not.toHaveBeenCalled();
    expect(routerState.replace).not.toHaveBeenCalled();
  });

  it("temporary exchange failure > Retry reruns the callback completion", async () => {
    lineAuth.exchange
      .mockRejectedValueOnce(
        new LineAuthExchangeError("provider-unavailable", 503),
      )
      .mockResolvedValueOnce({
        access_token: "backend-token",
        provider: "line",
      });

    render(createElement(CustomerLineAuthCallbackScreen));

    await waitFor(() => {
      expect(screen.getByText("LINE sign-in is unavailable")).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => {
      expect(routerState.replace).toHaveBeenCalledWith("/profile");
    });
    expect(lineAuth.resume).toHaveBeenCalledTimes(2);
    expect(lineAuth.exchange).toHaveBeenCalledTimes(2);
    expect(persistMobileSession).toHaveBeenCalledOnce();
  });
});
