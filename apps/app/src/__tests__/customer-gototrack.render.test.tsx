import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
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

const MODES: GoGoTrackFlowMode[] = [
  "hub",
  "merchant",
  "onboarding",
  "permissions",
  "recovery",
  "settings",
  "timeline",
];

describe("CustomerGoGoTrackScreen (render)", () => {
  for (const mode of MODES) {
    it(`mounts the ${mode} flow without throwing`, () => {
      expect(() =>
        render(createElement(CustomerGoGoTrackScreen, { mode })),
      ).not.toThrow();
    });
  }

  it("mounts the merchant flow with a merchantId without throwing", () => {
    expect(() =>
      render(
        createElement(CustomerGoGoTrackScreen, {
          mode: "merchant",
          merchantId: "grocery-galaxy",
        }),
      ),
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
    expect(gogoSenseSource).toContain(
      'field === "notificationListenerEnabled"',
    );
    expect(gogoSenseSource).toContain(
      "detector.hasNotificationListenerPermission()",
    );
    expect(gogoSenseSource).toContain(
      "detector.openNotificationListenerSettings()",
    );
    expect(gogoSenseSource).not.toContain(
      "onValueChange={(value) => setField(row.field, value)}",
    );
  });
});

describe("CustomerGoGoTrackScreen route wiring", () => {
  it("GoGoTrack routes pass the native detector into the shared screen", () => {
    [
      "app/gototrack/index.tsx",
      "app/gototrack/onboarding.tsx",
      "app/gototrack/permissions.tsx",
      "app/gototrack/timeline.tsx",
      "app/gototrack/settings.tsx",
      "app/gototrack/recovery.tsx",
      "app/gototrack/merchant/[id].tsx",
    ].forEach((routeFile) => {
      const routeSource = readFileSync(routeFile, "utf8");

      expect(routeSource).toContain("gototrackDetector");
      expect(routeSource).toContain("detector={gototrackDetector}");
    });
  });
});

describe("CustomerGoGoTrackScreen — Wave B (B5) foundations adopted (source signals)", () => {
  it("renders inside AccountPageShell so desktop profile routes get the sidebar rail", () => {
    expect(gogoSenseSource).toContain("AccountPageShell");
    expect(gogoSenseSource).not.toContain("styles.phoneFrame");
    expect(gogoSenseSource).not.toContain("CustomerDesktopFooterSlot");
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
      /numberOfLines=\{1\}\s+style=\{styles\.timelineStatus\}/,
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
    expect(gogoSenseSource).toContain("Android Usage Access");
    expect(gogoSenseSource).toMatch(
      /notification matching|NotificationListenerService|merchant tracking notifications|merchant confirmation notices|notificationListenerEnabled/i,
    );
  });

  it("onboarding > discloses optional background prompt opt-in per platform", () => {
    expect(gogoSenseSource).toContain("backgroundPromptCopy");
    expect(gogoSenseSource).toContain("enable background cashback notifications");
    expect(gogoSenseSource).toContain("enable Live Activity prompts");
  });
});
