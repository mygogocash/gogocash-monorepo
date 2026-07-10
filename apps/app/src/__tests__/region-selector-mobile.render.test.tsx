import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useMemo } from "react";

import { createHomeScreenStyles } from "@mobile/screens/home/customerHomeStyles";
import { HomeScreenThemeProvider } from "@mobile/screens/home/homeScreenHooks";
import { MobileTabletHomeHeader } from "@mobile/screens/home/MobileTabletHomeHeader";
import { webLocaleRegionPanel } from "@mobile/design/webDesignParity";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { getThemeSurfaces } from "@mobile/theme/themeSurfaces";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

// Country selector (2026-07-10): the region picker existed only in the
// desktop-web header globe — the mobile/Android chrome had NO way to change
// country at all. The mobile home header now carries the same globe (with the
// current region's flag as a badge) opening a bottom-sheet edition of the
// language + region panel.

const REGION_STORAGE_KEY = "gogocash.region";

// Mutable device-locale state exposed by the render setup's expo-localization
// mock (per-file vi.mock cannot override a setup-level factory).
type MockDeviceLocale = { languageTag: string; languageCode: string; regionCode?: string };
const deviceLocale = (globalThis as { __mockDeviceLocale?: MockDeviceLocale }).__mockDeviceLocale;

const headerProps = {
  homeLayout: {
    contentWidth: 390,
    contentHorizontalPadding: 16,
  } as never,
  isGoLinkCovered: false,
  onOpenGoLinkGuideline: () => {},
  onOpenSearchPopover: () => {},
  onGoLinkResultHref: () => {},
};

// The header reads the home-screen theme context CustomerHomeScreen normally
// provides; build the same value here so the header renders in isolation.
function HeaderHarness() {
  const { colors, resolved } = useTheme();
  const surfaces = getThemeSurfaces(colors, resolved);
  const styles = useThemedStyles((palette) => createHomeScreenStyles(palette, surfaces));
  const homeTheme = useMemo(() => ({ styles, colors, surfaces }), [styles, colors, surfaces]);
  return createElement(
    HomeScreenThemeProvider,
    { value: homeTheme, children: createElement(MobileTabletHomeHeader, headerProps) },
  );
}

function renderHeader() {
  return render(createElement(HeaderHarness));
}

describe("Mobile country selector", () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
  });

  afterEach(() => {
    globalThis.localStorage?.clear();
  });

  it("home header > given the mobile header > then it shows the language-and-region globe with the active region's flag", () => {
    globalThis.localStorage.setItem(REGION_STORAGE_KEY, "TH");
    renderHeader();

    const globeButton = screen.getByLabelText("Language and region");
    expect(globeButton).toBeTruthy();
    const thFlag = webLocaleRegionPanel.regions.find((r) => r.code === "TH")?.flag ?? "";
    expect(globeButton.textContent).toContain(thFlag);
  });

  it("home header > given a tap on the globe > then the sheet lists both languages and all markets", () => {
    renderHeader();

    fireEvent.click(screen.getByLabelText("Language and region"));

    const dialog = screen.getByLabelText(webLocaleRegionPanel.ariaLabel);
    expect(dialog).toBeTruthy();
    for (const language of webLocaleRegionPanel.languages) {
      expect(screen.getByText(language.label)).toBeTruthy();
    }
    for (const region of webLocaleRegionPanel.regions) {
      expect(screen.getByText(region.label)).toBeTruthy();
    }
  });

  it("region sheet > given a market pick > then the choice persists and the sheet closes", () => {
    globalThis.localStorage.setItem(REGION_STORAGE_KEY, "TH");
    renderHeader();

    fireEvent.click(screen.getByLabelText("Language and region"));
    fireEvent.click(screen.getByText("Malaysia"));

    expect(globalThis.localStorage.getItem(REGION_STORAGE_KEY)).toBe("MY");
    expect(screen.queryByLabelText(webLocaleRegionPanel.ariaLabel)).toBeNull();
  });

  it("region sheet > given a language pick > then the sheet stays open for the market pick", () => {
    renderHeader();

    fireEvent.click(screen.getByLabelText("Language and region"));
    fireEvent.click(screen.getByText("ไทย"));

    expect(screen.getByLabelText(webLocaleRegionPanel.ariaLabel)).toBeTruthy();
    expect(globalThis.localStorage.getItem("gogocash.locale")).toBe("th");
  });
});

describe("Detected-region confirm banner", () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    if (deviceLocale) {
      deviceLocale.regionCode = "MY";
    }
  });

  afterEach(() => {
    globalThis.localStorage?.clear();
    if (deviceLocale) {
      delete deviceLocale.regionCode;
    }
  });

  it("given a detected (never confirmed) region > then a one-time banner names the market with a Change action", async () => {
    renderHeader();

    expect(await screen.findByText(/Showing deals for/)).toBeTruthy();
    expect(screen.getByText(/Malaysia/)).toBeTruthy();
    expect(screen.getByText("Change")).toBeTruthy();
  });

  it("given an explicitly chosen region > then no banner shows", () => {
    globalThis.localStorage.setItem(REGION_STORAGE_KEY, "TH");
    renderHeader();

    expect(screen.queryByText(/Showing deals for/)).toBeNull();
  });

  it("given a tap on Change > then the region sheet opens", async () => {
    renderHeader();

    fireEvent.click(await screen.findByText("Change"));

    expect(screen.getByLabelText(webLocaleRegionPanel.ariaLabel)).toBeTruthy();
  });

  it("given a dismiss > then the banner never comes back", async () => {
    const first = renderHeader();
    fireEvent.click(await first.findByLabelText("Dismiss region notice"));
    expect(first.queryByText(/Showing deals for/)).toBeNull();
    first.unmount();

    renderHeader();
    expect(screen.queryByText(/Showing deals for/)).toBeNull();
  });
});
