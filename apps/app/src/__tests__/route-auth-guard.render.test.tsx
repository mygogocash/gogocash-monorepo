import { createElement, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Render-level coverage for the Wallet/Profile route self-guards across the native
// session-hydrate transition (ready:false -> ready:true). The prior suite only
// grepped source, so it could not catch the "Sign in required" flash a logged-in user
// saw on cold Profile open, nor the blank Wallet screen while !ready. We mount the real
// route components with a mocked useAuthGuardSession and assert the rendered branch.

let mockReady = false;
let mockIsAuthed = false;

vi.mock("@mobile/auth/useAuthGuardSession", () => ({
  useAuthGuardSession: () => ({ ready: mockReady, isAuthed: mockIsAuthed }),
}));

vi.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  Redirect: ({ href }: { href: unknown }) =>
    createElement("span", { "data-testid": "redirect", "data-href": String(href) }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), navigate: vi.fn() }),
  usePathname: () => "/",
  useLocalSearchParams: () => ({}),
}));

vi.mock("@mobile/screens/CustomerProfileScreen", () => ({
  CustomerProfileScreen: () =>
    createElement("span", { "data-testid": "profile-screen" }, "profile"),
}));

vi.mock("@mobile/screens/CustomerWalletScreen", () => ({
  CustomerWalletScreen: () =>
    createElement("span", { "data-testid": "wallet-screen" }, "wallet"),
}));

import ProfileRoute from "../../app/(tabs)/profile";
import WalletRoute from "../../app/wallet";

describe("ProfileRoute self-guard across hydrate", () => {
  beforeEach(() => {
    mockReady = false;
    mockIsAuthed = false;
  });

  it("while the session is hydrating (!ready) shows a neutral loading state, not 'Sign in required'", () => {
    mockReady = false;
    mockIsAuthed = false;
    render(createElement(ProfileRoute));
    expect(screen.getByTestId("profile-loading")).toBeTruthy();
    expect(screen.queryByTestId("profile-auth-guard")).toBeNull();
  });

  it("when hydrated and logged out shows the 'Sign in required' card", () => {
    mockReady = true;
    mockIsAuthed = false;
    render(createElement(ProfileRoute));
    expect(screen.getByTestId("profile-auth-guard")).toBeTruthy();
    expect(screen.queryByTestId("profile-loading")).toBeNull();
  });

  it("when hydrated and authenticated renders the profile screen", () => {
    mockReady = true;
    mockIsAuthed = true;
    render(createElement(ProfileRoute));
    expect(screen.getByTestId("profile-screen")).toBeTruthy();
  });
});

describe("WalletRoute self-guard across hydrate", () => {
  beforeEach(() => {
    mockReady = false;
    mockIsAuthed = false;
  });

  it("while the session is hydrating (!ready) shows a neutral loading state, not a blank screen", () => {
    mockReady = false;
    mockIsAuthed = false;
    render(createElement(WalletRoute));
    expect(screen.getByTestId("wallet-loading")).toBeTruthy();
    expect(screen.queryByTestId("redirect")).toBeNull();
    expect(screen.queryByTestId("wallet-screen")).toBeNull();
  });

  it("when hydrated and logged out redirects to the login callback", () => {
    mockReady = true;
    mockIsAuthed = false;
    render(createElement(WalletRoute));
    const redirect = screen.getByTestId("redirect");
    expect(redirect.getAttribute("data-href")).toContain("login");
  });

  it("when hydrated and authenticated renders the wallet screen", () => {
    mockReady = true;
    mockIsAuthed = true;
    render(createElement(WalletRoute));
    expect(screen.getByTestId("wallet-screen")).toBeTruthy();
  });
});
