import { createElement, type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@mobile/components/Toast";
import { ProfileInfoPanel } from "@mobile/components/ProfileInfoPanel";
import type { MobileSession } from "@mobile/auth/session";

const accountDataSource = vi.hoisted(() => ({ current: "backend" as string }));

vi.mock("@mobile/config/env", () => ({
  getMobileEnv: () => ({ accountDataSource: accountDataSource.current }),
}));

// ProfileInfoPanel (+ ProfileHeroCard) calls useToast(), so wrap in ToastProvider — the same
// provider AppProviders supplies in the real app (mirrors customer-profile-detail-validators).
function renderPanel(session: MobileSession = { username: "Mock User" }): ReturnType<typeof render> {
  const panel: ReactElement = createElement(ProfileInfoPanel, { session });
  return render(createElement(ToastProvider, {}, panel));
}

// Web parity: the Profile subpage shows two sections below personal info — the MyCashBack
// account linking block and the social-media linking block (ProfileDesktopPersonalPanel).
describe("ProfileInfoPanel — MyCashBack + social link sections (web parity)", () => {
  beforeEach(() => {
    accountDataSource.current = "backend";
  });

  // Issue #411: live sessions must show real contact fields, not mock.user@gogocash.test.
  it("profile > given backend session email/mobile > then Link Email / Phone show those values", () => {
    renderPanel({
      email: "jan.phatsar@gmail.com",
      mobile: "+66812345678",
      username: "Jan",
    });
    expect(screen.getByDisplayValue("jan.phatsar@gmail.com")).toBeTruthy();
    expect(screen.getByDisplayValue("+66812345678")).toBeTruthy();
    expect(screen.queryByDisplayValue("mock.user@gogocash.test")).toBeNull();
    expect(screen.queryByDisplayValue("+66123456789")).toBeNull();
  });

  // Issue #411, the path the reporter actually hits. useMobileSessionSnapshot
  // starts at null and resolves the session in an effect, and
  // CustomerProfileDetailScreen renders <ProfileInfoPanel session={session ?? {}} />
  // ungated — so the panel's FIRST render always sees an empty session and the
  // real one arrives on a later render, with no remount. Seeding these fields
  // from a one-shot useState initializer therefore freezes them at their
  // empty-session value forever. Passing a populated session straight in (the
  // test above) cannot catch that; this rerender can.
  it("profile > given the session hydrates after mount > then Link Email / Phone adopt the real values", () => {
    const { rerender } = renderPanel({});

    rerender(
      createElement(
        ToastProvider,
        {},
        createElement(ProfileInfoPanel, {
          session: {
            email: "jan.phatsar@gmail.com",
            mobile: "+66812345678",
            username: "Jan",
          },
        }),
      ),
    );

    expect(screen.getByDisplayValue("jan.phatsar@gmail.com")).toBeTruthy();
    expect(screen.getByDisplayValue("+66812345678")).toBeTruthy();
  });

  // Same mount race, same issue family: the Name field hardcoded "Mock User" as
  // its fallback, so a live account with no username rendered fake data next to
  // a real balance.
  it("profile > given the session hydrates after mount > then Name adopts the real username", () => {
    const { rerender } = renderPanel({});

    expect(screen.queryByDisplayValue("Mock User")).toBeNull();

    rerender(
      createElement(
        ToastProvider,
        {},
        createElement(ProfileInfoPanel, { session: { username: "Jan" } }),
      ),
    );

    expect(screen.getByDisplayValue("Jan")).toBeTruthy();
  });

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
