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

const sendPhoneOtp = vi.fn();
vi.mock("@mobile/auth/firebasePhoneAuth", () => ({
  sendPhoneOtp: (...args: unknown[]) => sendPhoneOtp(...args),
  confirmPhoneOtp: vi.fn(),
}));
vi.mock("@mobile/auth/firebaseLogin", () => ({
  exchangeFirebaseIdToken: vi.fn(),
}));

import { authSendErrorMessages, toastErrorMessages } from "@mobile/i18n/toastMessages";
import { CustomerAuthScreen } from "@mobile/screens/CustomerAuthScreen";

describe("CustomerAuthScreen — live send failure is visible", () => {
  beforeEach(() => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    window.localStorage.clear();
    sendPhoneOtp.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it("given sendPhoneOtp rejects without a known code > then shows the request-failed copy and stays on the phone step", async () => {
    sendPhoneOtp.mockRejectedValue(new Error("blocked"));

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    fireEvent.change(screen.getByPlaceholderText("Phone Number"), {
      target: { value: "0812346789" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "I have read and understand" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText(toastErrorMessages.requestFailed)).toBeTruthy();
    });
    // Still on the phone step — the OTP input never mounted, nothing navigated.
    expect(screen.queryByLabelText("Verification code")).toBeNull();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it("given sendPhoneOtp rejects with auth/too-many-requests > then shows the rate-limit copy", async () => {
    sendPhoneOtp.mockRejectedValue(
      Object.assign(new Error("blocked"), { code: "auth/too-many-requests" })
    );

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    fireEvent.change(screen.getByPlaceholderText("Phone Number"), {
      target: { value: "0812346789" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "I have read and understand" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(
        screen.getByText(authSendErrorMessages.rateLimit)
      ).toBeTruthy();
    });
    expect(screen.queryByText(toastErrorMessages.requestFailed)).toBeNull();
  });

  it("given sendPhoneOtp rejects with auth/invalid-app-credential > then shows the security-check copy", async () => {
    sendPhoneOtp.mockRejectedValue(
      Object.assign(new Error("rejected"), { code: "auth/invalid-app-credential" })
    );

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    fireEvent.change(screen.getByPlaceholderText("Phone Number"), {
      target: { value: "0812346789" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "I have read and understand" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(
        screen.getByText(authSendErrorMessages.securityCheck)
      ).toBeTruthy();
    });
    expect(screen.queryByText(toastErrorMessages.requestFailed)).toBeNull();
  });

  it("given the user edits the phone after a failure > then the failure notice clears", async () => {
    sendPhoneOtp.mockRejectedValue(new Error("network"));

    render(createElement(CustomerAuthScreen, { mode: "login" }));
    fireEvent.change(screen.getByPlaceholderText("Phone Number"), {
      target: { value: "0812346789" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "I have read and understand" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(screen.getByText(toastErrorMessages.requestFailed)).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText("Phone Number"), {
      target: { value: "0812346788" },
    });

    expect(screen.queryByText(toastErrorMessages.requestFailed)).toBeNull();
  });
});
