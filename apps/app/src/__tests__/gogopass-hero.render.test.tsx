import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { AccountWalletHeroCard } from "@mobile/components/AccountPageShell";
import { ToastProvider } from "@mobile/components/Toast";
import { LocaleProvider } from "@mobile/i18n/LocaleProvider";
import { ThemeProvider } from "@mobile/theme/ThemeProvider";

const renderHero = (props: Parameters<typeof AccountWalletHeroCard>[0] = {}) =>
  render(
    createElement(
      ThemeProvider,
      {},
      createElement(
        LocaleProvider,
        {},
        createElement(
          ToastProvider,
          {},
          createElement(AccountWalletHeroCard, {
            maskedId: "***user",
            tier: "gogopass",
            title: "Demo User",
            userId: "demo-user-id",
            ...props,
          }),
        ),
      ),
    ),
  );

describe("AccountWalletHeroCard masked user id (render)", () => {
  it("shows the masked id by default with reveal and copy controls", () => {
    renderHero();
    expect(screen.getByText("***user")).toBeTruthy();
    expect(screen.getByLabelText("Show User ID")).toBeTruthy();
    expect(screen.getByLabelText("Copy User ID")).toBeTruthy();
    expect(screen.queryByText("demo-user-id")).toBeNull();
  });

  it("reveals the full user id when the eye control is pressed", () => {
    renderHero();
    fireEvent.click(screen.getByLabelText("Show User ID"));
    expect(screen.getByText("demo-user-id")).toBeTruthy();
    expect(screen.getByLabelText("Hide User ID")).toBeTruthy();
    expect(screen.queryByText("***user")).toBeNull();
  });
});

describe("AccountWalletHeroCard GoGoPass treatment (render)", () => {
  it("shows the GOGOPASS badge for a gogopass member", () => {
    renderHero();
    expect(screen.getByText("GOGOPASS")).toBeTruthy();
    expect(screen.getByText("Demo User")).toBeTruthy();
  });

  it("hides the badge for a free / undefined tier", () => {
    render(
      createElement(
        ThemeProvider,
        {},
        createElement(
          LocaleProvider,
          {},
          createElement(
            ToastProvider,
            {},
            createElement(AccountWalletHeroCard, { title: "Mock User" }),
          ),
        ),
      ),
    );
    expect(screen.queryByText("GOGOPASS")).toBeNull();
  });

  it("mounts the gold ring + badge without throwing", () => {
    expect(() => renderHero()).not.toThrow();
  });
});

describe("AccountWalletHeroCard GoGoPass rollout flag (render)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('given EXPO_PUBLIC_ENABLE_GOGOPASS="0" > then a gogopass tier renders a plain avatar and no badge', () => {
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOGOPASS", "0");
    renderHero(); // default props include tier: "gogopass"
    // GoGoPassAvatar's premium wrapper carries accessibilityLabel "GoGoPass member";
    // GoGoPassBadge carries "GOGOPASS member". Neither may render when hidden.
    expect(screen.queryByLabelText("GoGoPass member")).toBeNull();
    expect(screen.queryByLabelText("GOGOPASS member")).toBeNull();
    expect(screen.queryByText("GOGOPASS")).toBeNull();
    // The card itself still renders (plain variant), it is only de-branded.
    expect(screen.getByText("Demo User")).toBeTruthy();
  });

  it("given the flag unset > then the gogopass tier still renders the ring + badge (default unchanged)", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOGOPASS;
    renderHero();
    expect(screen.getByLabelText("GoGoPass member")).toBeTruthy();
    expect(screen.getByLabelText("GOGOPASS member")).toBeTruthy();
  });
});
