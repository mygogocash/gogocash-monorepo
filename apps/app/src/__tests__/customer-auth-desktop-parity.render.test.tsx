import { createElement, type ReactNode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

vi.mock("expo-router", () => ({
  Link: ({ children }: { children: ReactNode }) => children,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), navigate: vi.fn() }),
  usePathname: () => "/login",
  useLocalSearchParams: () => ({}),
}));

import { ToastProvider } from "@mobile/components/Toast";
import { CustomerAuthScreen } from "@mobile/screens/CustomerAuthScreen";

function renderAuth(mode: "login" | "register", withToast = false) {
  const screenEl = createElement(CustomerAuthScreen, { mode });
  if (!withToast) {
    return render(screenEl);
  }
  return render(createElement(ToastProvider, {}, screenEl));
}

describe("CustomerAuthScreen — login/register link and social stubs", () => {
  it("given login mode > then hides the Create new account link (founder: disabled for launch)", () => {
    renderAuth("login");
    expect(screen.queryByText("Create new account")).toBeNull();
  });

  it("given register mode > then still shows the Already have an account link back to login", () => {
    renderAuth("register");
    expect(screen.getByText("Already have an account")).toBeTruthy();
  });

  it("given a social provider button inside ToastProvider > then tapping it shows Coming soon", async () => {
    renderAuth("login", true);
    fireEvent.click(screen.getByRole("button", { name: "Google" }));
    await waitFor(() => {
      expect(screen.getByText("Coming soon")).toBeTruthy();
    });
  });
});
