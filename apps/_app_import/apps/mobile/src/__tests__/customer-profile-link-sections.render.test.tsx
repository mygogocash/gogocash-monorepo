import { createElement, type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "@mobile/components/Toast";
import { ProfileInfoPanel } from "@mobile/components/ProfileInfoPanel";

// ProfileInfoPanel (+ ProfileHeroCard) calls useToast(), so wrap in ToastProvider — the same
// provider AppProviders supplies in the real app (mirrors customer-profile-detail-validators).
function renderPanel(): ReturnType<typeof render> {
  const panel: ReactElement = createElement(ProfileInfoPanel, { session: { username: "Mock User" } });
  return render(createElement(ToastProvider, {}, panel));
}

// Web parity: the Profile subpage shows two sections below personal info — the MyCashBack
// account linking block and the social-media linking block (ProfileDesktopPersonalPanel).
describe("ProfileInfoPanel — MyCashBack + social link sections (web parity)", () => {
  it("profile > given the MyCashBack block > then shows the question, link CTA, description, and linked account row", () => {
    renderPanel();
    expect(screen.getByText("Have you ever had an account(s) with MyCashBack?")).toBeTruthy();
    expect(screen.getByText("Link your account here !!")).toBeTruthy();
    expect(
      screen.getByText(
        "For users with multiple MyCashBack accounts, you may link all of them to your GoGoCash profile here to manage your balances and activities from one centralized location.",
      ),
    ).toBeTruthy();
    // Linked account row: masked id + "Linked" badge + "Unlink" action.
    expect(screen.getByText("***5678")).toBeTruthy();
    expect(screen.getByText("Linked")).toBeTruthy();
    expect(screen.getByText("Unlink")).toBeTruthy();
  });

  it("profile > given the social block > then shows the heading and all six providers", () => {
    renderPanel();
    expect(screen.getByText("Link to your Social Media for Easy in One-click!")).toBeTruthy();
    for (const label of [
      "Link with Gmail",
      "Link with Facebook",
      "Link with Line",
      "Link with X",
      "Link with Telegram",
      "Link with Apple",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });
});
