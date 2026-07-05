import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement, type ComponentProps } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerGoGoTrackScreen reaches i18n/LocaleProvider (-> CustomerLocaleRegionControl ->
// expo-localization -> expo-modules-core, which touches the native `expo` global that does
// not exist under happy-dom: "__DEV__ is not defined"). Device locale is not under test, so
// mock the module at the seam — the same pattern the discovery/wallet/auth render tests use.
// (No @mobile/observability mock needed: this screen imports no Sentry.)
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import {
  CustomerGoGoTrackScreen,
  type GoGoTrackFlowMode,
} from "@mobile/screens/CustomerGoGoTrackScreen";
import { ToastProvider } from "@mobile/components/Toast";

function renderGoGoTrackScreen(props: ComponentProps<typeof CustomerGoGoTrackScreen>) {
  return render(createElement(ToastProvider, {}, createElement(CustomerGoGoTrackScreen, props)));
}

// Wave B (B5) per-screen UX adoption for the GoGoTrack feature screen. RENDER suite: it MOUNTS
// every flow `mode` (react-native -> react-native-web, happy-dom) to prove the screen still
// renders after the additive changes, AND reads the screen source to assert a behavior/source
// signal for each applied Wave A foundation.
//
// Applied here:
//  - haptics.impact() on the primary/secondary navigation CTAs (a selection cue), wired onto the
//    EXISTING Link-button press via an additive onPress — Link navigation still fires; the haptic
//    is fire-and-forget (never throws). This screen's only interactive controls are these CTAs.
//  - Thai-truncation: numberOfLines={1} on the single-line labels that overflow in Thai (eyebrow,
//    title, button text, section/row titles, timeline status). Multi-line bodies stay uncapped.
//
// Intentionally NOT adopted (reviewer NOTEs):
//  - Skeleton / pull-to-refresh: the screen owns NO async resource and no refetch — every section
//    is rendered from synchronous module constants (gogoSenseFlowCopy / permissionRows / timeline-
//    Rows / setupRows / settingRows). There is no loading branch to render a skeleton into and no
//    network round-trip to pull-to-refresh. Skipped by design (same rationale as B4 discovery).
//  - useReducedMotion: the screen declares no screen-local `Animated`. Its only motion lives inside
//    MotionPressable, which already consumes useReducedMotion (Wave A1) internally. Nothing to gate.
//  - hitSlop: there are no icon-only buttons; the only pressables are full-width text CTAs with
//    minHeight 46 (>= 44). No sub-44 tap target.
//  - KeyboardAwareScreen: the screen has no text inputs.
const gogoSenseSource = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../screens/CustomerGoGoTrackScreen.tsx",
  ),
  "utf8",
);

const grantSectionSource = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../gototrack/GoGoTrackPermissionGrantSection.tsx",
  ),
  "utf8",
);

const webDesignParitySource = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../design/webDesignParity.ts",
  ),
  "utf8",
);

const MODES: GoGoTrackFlowMode[] = [
  "hub",
  "merchant",
  "onboarding",
  "permissions",
  "settings",
];

describe("CustomerGoGoTrackScreen (render)", () => {
  for (const mode of MODES) {
    it(`mounts the ${mode} flow without throwing`, () => {
      expect(() => renderGoGoTrackScreen({ mode })).not.toThrow();
    });
  }

  it("mounts the merchant flow with a merchantId without throwing", () => {
    expect(() =>
      renderGoGoTrackScreen({
        mode: "merchant",
        merchantId: "grocery-galaxy",
      }),
    ).not.toThrow();
  });
});

describe("CustomerGoGoTrackScreen permission-backed settings", () => {
  it("gates OS permission settings before saving the server preference", () => {
    expect(gogoSenseSource).toContain('field === "usageStatsEnabled"');
    expect(gogoSenseSource).toContain('field === "backgroundPromptsEnabled"');
    expect(gogoSenseSource).toContain("useGoGoTrackBackgroundPrompts");
    expect(gogoSenseSource).toContain("detector.hasUsageAccessPermission()");
    expect(gogoSenseSource).toContain("detector.openUsageAccessSettings()");
    expect(gogoSenseSource).not.toContain(
      'field === "notificationListenerEnabled"',
    );
    expect(gogoSenseSource).not.toContain(
      "detector.hasNotificationListenerPermission()",
    );
    expect(gogoSenseSource).not.toContain(
      "detector.openNotificationListenerSettings()",
    );
    expect(gogoSenseSource).not.toContain("Notification listener matching");
    expect(gogoSenseSource).not.toContain(
      "onValueChange={(value) => setField(row.field, value)}",
    );
  });
});

describe("CustomerGoGoTrackScreen route wiring", () => {
  it("hub mode mounts the activation nudge banner for merchant detections", () => {
    expect(gogoSenseSource).toContain("GoGoTrackDetectionBanner");
    expect(gogoSenseSource).toMatch(
      /function HubContent[\s\S]*GoGoTrackDetectionBanner[\s\S]*GoGoTrackPermissionGrantSection/,
    );
  });

  it("GoGoTrack routes pass the native detector into the shared screen", () => {
    [
      "app/gototrack/index.tsx",
      "app/gototrack/onboarding.tsx",
      "app/gototrack/permissions.tsx",
      "app/gototrack/settings.tsx",
      "app/gototrack/merchant/[id].tsx",
    ].forEach((routeFile) => {
      const routeSource = readFileSync(routeFile, "utf8");

      expect(routeSource).toContain("gototrackDetector");
      expect(routeSource).toContain("detector={gototrackDetector}");
    });
  });

  it("legacy timeline and recovery deep links redirect to the GoGoTrack hub", () => {
    [
      "app/gototrack/timeline.tsx",
      "app/gototrack/recovery.tsx",
    ].forEach((routeFile) => {
      const routeSource = readFileSync(routeFile, "utf8");

      expect(routeSource).toContain('Redirect href="/gototrack"');
    });
  });
});

describe("CustomerGoGoTrackScreen — Wave B (B5) foundations adopted (source signals)", () => {
  it("renders inside AccountPageShell so desktop profile routes get the sidebar rail", () => {
    expect(gogoSenseSource).toContain("AccountPageShell");
    expect(gogoSenseSource).toContain("showProfileRail");
    expect(gogoSenseSource).not.toContain("styles.phoneFrame");
    expect(gogoSenseSource).not.toContain("CustomerDesktopFooterSlot");
  });

  it("renders in-content GoGoTrack sub-nav from profileHubGoGoTrackSubNavItems", () => {
    expect(gogoSenseSource).toContain("GoGoTrackSectionNav");
    expect(gogoSenseSource).toContain("profileHubGoGoTrackSubNavItems");
    expect(gogoSenseSource).toContain("isGoGoTrackSubNavItemActive");
  });

  it("fires haptics.impact() on the navigation CTAs", () => {
    // Wired onto the EXISTING Link-button press (selection cue), not a new navigation path.
    expect(gogoSenseSource).toContain('from "@mobile/lib/haptics"');
    expect(gogoSenseSource).toContain("haptics.impact(");
  });

  it("caps the single-line labels with numberOfLines so they don't overflow in Thai", () => {
    // The eyebrow, title, CTA text, section/row titles and the timeline status are single-line
    // labels that grow in Thai; cap each to one line (additive prop). Multi-line bodies are left
    // to wrap on purpose, so they are intentionally NOT capped.
    expect(gogoSenseSource).toMatch(
      /numberOfLines=\{1\}\s+style=\{styles\.eyebrow\}/,
    );
    expect(gogoSenseSource).toMatch(
      /numberOfLines=\{1\}\s+style=\{styles\.title\}/,
    );
    expect(gogoSenseSource).toMatch(
      /numberOfLines=\{1\}\s+style=\{styles\.sectionTitle\}/,
    );
    expect(gogoSenseSource).toMatch(
      /numberOfLines=\{1\}\s+style=\{styles\.rowTitle\}/,
    );
    expect(gogoSenseSource).toMatch(
      /numberOfLines=\{1\}\s+style=\{styles\.primaryButtonText\}/,
    );
    expect(gogoSenseSource).toMatch(
      /numberOfLines=\{1\}\s+style=\{styles\.secondaryButtonText\}/,
    );
  });

  it("keeps merchant-detail copy aligned to the Android UsageStats MVP boundary", () => {
    expect(gogoSenseSource).toContain("Android package detection");
    expect(gogoSenseSource).toContain("Checking live merchant catalog.");
    expect(webDesignParitySource).toContain("Android Usage Access");
    expect(gogoSenseSource).not.toContain("Notification listener matching");
    expect(gogoSenseSource).not.toContain("notificationListenerEnabled");
    expect(gogoSenseSource).not.toContain("NotificationListenerService");
  });

  it("onboarding > discloses optional background prompt opt-in per platform", () => {
    expect(gogoSenseSource).toContain("backgroundPromptCopy");
    expect(gogoSenseSource).toContain("enable background cashback notifications");
    expect(gogoSenseSource).toContain("enable Live Activity prompts");
  });
});

describe("CustomerGoGoTrackScreen grant-access UI (web parity source signals)", () => {
  it("grant hero CTA > given mobile > then uses a refined outline button instead of a heavy fill pill", () => {
    expect(grantSectionSource).toContain("hoverLift={false}");
    expect(grantSectionSource).toContain("premiumOutlineButtonStyle");
    expect(grantSectionSource).toMatch(/permissionCard: premiumPanelCardStyle\(colors/);
    expect(grantSectionSource).toMatch(
      /permissionCardTitle:[\s\S]*color: colors\.ink[\s\S]*fontWeight: "600"/,
    );
  });

  it("hub + permissions modes wire GoGoTrackPermissionGrantSection from shared parity copy", () => {
    expect(gogoSenseSource).toContain("GoGoTrackPermissionGrantSection");
    expect(gogoSenseSource).toContain("GoGoTrackPermissionDisclosure");
    expect(grantSectionSource).toContain("webGoGoTrackPermissionsPage");
    expect(grantSectionSource).toContain("useGoGoTrack");
    expect(grantSectionSource).toContain("useGoGoTrackSettings");
    expect(grantSectionSource).toContain("onPersistError");
    expect(grantSectionSource).toContain("saveGoGoTrackSettingsFailed");
    expect(grantSectionSource).toContain("hero.hintWeb");
    expect(grantSectionSource).toContain('Platform.OS === "web"');
    expect(grantSectionSource).toContain("AppState");
  });
});
