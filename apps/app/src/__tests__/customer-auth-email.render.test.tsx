import { createElement, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Same seam stubs as customer-auth-live.render.test.tsx.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

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

// Email auth seam — the screen dynamic-imports the module, so mocking the
// send functions keeps the firebase package out of the render suite. The
// error-kind mapping and copy stay REAL so the rendered copy is under test.
const signInWithEmail = vi.fn();
const registerWithEmail = vi.fn();
vi.mock("@mobile/auth/emailPasswordAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mobile/auth/emailPasswordAuth")>();
  return {
    ...actual,
    signInWithEmail: (...args: unknown[]) => signInWithEmail(...args),
    registerWithEmail: (...args: unknown[]) => registerWithEmail(...args),
  };
});

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

function openEmailForm() {
  render(createElement(CustomerAuthScreen, { mode: "login" }));
  fireEvent.click(screen.getByText("Sign in with email"));
}

function fillEmailForm(email: string, password: string) {
  fireEvent.change(screen.getByPlaceholderText("Email address"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText("Password"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: "I have read and understand" }));
}

describe("CustomerAuthScreen — email/password (backend mode)", () => {
  beforeEach(() => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    vi.stubEnv("EXPO_PUBLIC_API_URL", "https://api-staging.gogocash.co");
    window.localStorage.clear();
    routerReplace.mockClear();
    signInWithEmail.mockReset();
    registerWithEmail.mockReset();
    exchangeFirebaseIdToken.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.localStorage.clear();
  });

  it("phone step > offers a 'Sign in with email' entry that switches to the email form", () => {
    openEmailForm();

    expect(screen.getByPlaceholderText("Email address")).toBeTruthy();
    expect(screen.getByPlaceholderText("Password")).toBeTruthy();
    // The phone field is gone while the email form is active.
    expect(screen.queryByPlaceholderText("Phone Number")).toBeNull();
  });

  it("email sign-in > exchanges the Firebase token, persists the session, and navigates", async () => {
    signInWithEmail.mockResolvedValue({ idToken: "email-id-token" });
    exchangeFirebaseIdToken.mockResolvedValue({
      access_token: "backend-access-token",
      provider: "password",
    });

    openEmailForm();
    fillEmailForm("user@example.com", "hunter22");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith("user@example.com", "hunter22");
    });
    await waitFor(() => {
      expect(exchangeFirebaseIdToken).toHaveBeenCalledWith({
        apiUrl: "https://api-staging.gogocash.co",
        country: "TH",
        idToken: "email-id-token",
      });
    });
    await waitFor(() => {
      expect(readStoredSession()?.access_token).toBe("backend-access-token");
    });
    expect(routerReplace).toHaveBeenCalledWith("/link-mycashback");
  });

  it("email sign-in > given wrong credentials > shows one non-probing error, persists nothing", async () => {
    signInWithEmail.mockRejectedValue(
      Object.assign(new Error("bad"), { code: "auth/wrong-password" })
    );

    openEmailForm();
    fillEmailForm("user@example.com", "wrong");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByText(/Email or password is incorrect/)).toBeTruthy();
    });
    expect(exchangeFirebaseIdToken).not.toHaveBeenCalled();
    expect(readStoredSession()).toBeNull();
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it("create-account mode > registers the account then exchanges and navigates", async () => {
    registerWithEmail.mockResolvedValue({ idToken: "new-id-token" });
    exchangeFirebaseIdToken.mockResolvedValue({
      access_token: "new-backend-token",
      provider: "password",
    });

    openEmailForm();
    fireEvent.click(screen.getByText("New to GoGoCash? Create an account"));
    fillEmailForm("new@example.com", "hunter22");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(registerWithEmail).toHaveBeenCalledWith("new@example.com", "hunter22");
    });
    await waitFor(() => {
      expect(readStoredSession()?.access_token).toBe("new-backend-token");
    });
    expect(signInWithEmail).not.toHaveBeenCalled();
  });

  it("email form > 'Use phone number instead' returns to the phone step", () => {
    openEmailForm();
    fireEvent.click(screen.getByText("Use phone number instead"));

    expect(screen.getByPlaceholderText("Phone Number")).toBeTruthy();
    expect(screen.queryByPlaceholderText("Email address")).toBeNull();
  });
});
