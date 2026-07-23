import { createElement, useMemo } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CustomerMobileBottomNav as HomeBottomNav } from "@mobile/screens/home/CustomerMobileBottomNav";
import { CustomerMobileBottomNav as ShellBottomNav } from "@mobile/components/CustomerMobileBottomNav";
import { MobileTabletHomeHeader } from "@mobile/screens/home/MobileTabletHomeHeader";
import { createHomeScreenStyles } from "@mobile/screens/home/customerHomeStyles";
import { HomeScreenThemeProvider } from "@mobile/screens/home/homeScreenHooks";
import { webGoLinkFeature } from "@mobile/design/webDesignParity";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { getThemeSurfaces } from "@mobile/theme/themeSurfaces";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

// GoLink coming-soon (2026-07): the founder decision keeps GoLink VISIBLE but
// NON-CLICKABLE on mobile until launch. These render tests prove the two mobile
// surfaces — the bottom-nav "GoGoLink" tab and the home paste box — mount in the
// coming-soon state as visible-but-disabled (Soon/Coming soon affordance, no-op
// press). useCopy is stubbed to a passthrough by the render harness, so tc("X")
// renders "X" verbatim here.

function findButton(el: HTMLElement | null): HTMLElement | null {
  return (el?.closest('[role="button"]') as HTMLElement | null) ?? null;
}

function HomeNavHarness({ onGoLinkPress }: { onGoLinkPress: () => void }) {
  const { colors, resolved } = useTheme();
  const surfaces = getThemeSurfaces(colors, resolved);
  const styles = useThemedStyles((palette) => createHomeScreenStyles(palette, surfaces));
  const homeTheme = useMemo(() => ({ styles, colors, surfaces }), [styles, colors, surfaces]);
  return createElement(HomeScreenThemeProvider, {
    value: homeTheme,
    children: createElement(HomeBottomNav, { bottomInset: 0, onGoLinkPress }),
  });
}

function HomeHeaderHarness({
  onGuideline,
  onResult,
}: {
  onGuideline: (() => void) & { mock?: unknown };
  onResult: ((href: string) => void) & { mock?: unknown };
}) {
  const { colors, resolved } = useTheme();
  const surfaces = getThemeSurfaces(colors, resolved);
  const styles = useThemedStyles((palette) => createHomeScreenStyles(palette, surfaces));
  const homeTheme = useMemo(() => ({ styles, colors, surfaces }), [styles, colors, surfaces]);
  return createElement(HomeScreenThemeProvider, {
    value: homeTheme,
    children: createElement(MobileTabletHomeHeader, {
      homeLayout: { contentWidth: 390, contentHorizontalPadding: 16 } as never,
      isGoLinkCovered: false,
      onOpenGoLinkGuideline: onGuideline,
      onOpenSearchPopover: () => {},
      onGoLinkResultHref: onResult,
    }),
  });
}

describe("GoLink coming-soon (mobile bottom-nav tab)", () => {
  beforeEach(() => {
    // Force the coming-soon mode: neither env var forces enabled/hidden.
    delete process.env.EXPO_PUBLIC_ENABLE_GOLINK;
    delete process.env.EXPO_PUBLIC_GOLINK_COMING_SOON;
    globalThis.localStorage?.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("home bottom nav > given coming-soon > then the GoGoLink tab is visible, badged 'Soon', and disabled", () => {
    const spy = vi.fn();
    render(createElement(HomeNavHarness, { onGoLinkPress: spy }));

    expect(screen.getByText("GoGoLink")).toBeTruthy();
    expect(screen.getByText("Soon")).toBeTruthy();

    const tab = findButton(screen.getByText("GoGoLink"));
    expect(tab?.getAttribute("aria-disabled")).toBe("true");

    fireEvent.click(tab as HTMLElement);
    expect(spy).not.toHaveBeenCalled();
  });

  it("shell bottom nav > given coming-soon > then the GoGoLink tab is visible, badged 'Soon', and disabled", () => {
    render(createElement(ShellBottomNav, { bottomInset: 0 }));

    expect(screen.getByText("GoGoLink")).toBeTruthy();
    expect(screen.getByText("Soon")).toBeTruthy();

    const tab = findButton(screen.getByText("GoGoLink"));
    expect(tab?.getAttribute("aria-disabled")).toBe("true");
  });
});

describe("GoLink coming-soon (home paste box)", () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOLINK;
    delete process.env.EXPO_PUBLIC_GOLINK_COMING_SOON;
    globalThis.localStorage?.clear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("home header > given coming-soon > then the GoLink box renders with a 'Coming soon' label", () => {
    render(
      createElement(HomeHeaderHarness, { onGuideline: vi.fn(), onResult: vi.fn() }),
    );
    expect(screen.getByText("Coming soon")).toBeTruthy();
  });

  it("home header > given coming-soon > then the paste input is read-only", () => {
    render(
      createElement(HomeHeaderHarness, { onGuideline: vi.fn(), onResult: vi.fn() }),
    );
    const input = screen.getByLabelText(webGoLinkFeature.inputLabel) as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  it("home header > given coming-soon > then the submit action is disabled and no-ops", () => {
    const onResult = vi.fn();
    render(
      createElement(HomeHeaderHarness, { onGuideline: vi.fn(), onResult }),
    );
    const action = findButton(screen.getByText(webGoLinkFeature.ctaLabel));
    expect(action?.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(action as HTMLElement);
    expect(onResult).not.toHaveBeenCalled();
  });
});
