import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// CustomerSubscriptionScreen reaches i18n/LocaleProvider indirectly via the shared
// CustomerAccountResourceState (-> CustomerRouteState) on the non-ready path, and the
// route tree touches expo-localization (-> expo-modules-core, which references the
// native `expo` global that does not exist under happy-dom: "__DEV__ is not defined").
// Device locale is not under test, so mock the module at the seam — the same pattern the
// wallet/quest/auth render tests use. (No @mobile/observability mock needed: this screen
// does not import Sentry — verified in source.)
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { CustomerSubscriptionScreen } from "@mobile/screens/CustomerSubscriptionScreen";

// Wave B (B5) per-screen UX adoption for the GoGoPass SUBSCRIPTION status screen
// (pricing / subscription / billing modes — the "not ready" + active-subscription
// states). RENDER suite: it MOUNTS the screen (react-native -> react-native-web,
// happy-dom) to prove it still renders after the additive changes, AND reads the
// screen source to assert a behavior/source signal for each applied Wave A foundation.
//
// useCopy is stubbed to a passthrough in the render harness (vitest.render.config.ts),
// so tc("...") returns the English literal verbatim — getByText asserts against English.
//
// Applied here:
//  - Skeleton + Pull-to-refresh: the screen loads its status via the shared async
//    resource (useCustomerAccountResource resourceId:"billing"), and the non-ready
//    guard delegates to CustomerAccountResourceState. That shared component accepts an
//    opt-in loadingSkeleton (B3 central enhancement) — the subscription screen hands it
//    a Skeleton-built placeholder so loading shows content-shaped chrome instead of the
//    generic spinner. The ready-state ScrollView also gets a RefreshControl wired to the
//    resource refetch (billingResource.retry).
//  - haptics.impact() on the navigation CTAs (the View Plans / View pricing / View
//    membership / Change Plan links). Wired onto the EXISTING <Link asChild><Pressable>
//    press path (a navigation/selection cue), not a duplicated handler. The per-plan
//    "Subscribe…" and "Manage Subscription" controls are inert disabled <View>s (Stripe
//    is off in this env) — they have no press handler, so they correctly get no haptic.
//  - Thai-truncation: numberOfLines on the status labels (No active subscription / Status
//    line), plan names, and the muted status copy — text that grows in Thai inside fixed
//    status chrome / plan cards and can overflow its row.
//  - hitSlop: the icon-bearing "Change Plan" secondary action is only minHeight:42 and
//    alignSelf:flex-start (a compact, sub-44 tap target) — give it a hitSlop to reach 44px.
//
// Intentionally NOT adopted (NOTE for reviewer):
//  - KeyboardAwareScreen: no text inputs on this screen (the only useState is the
//    pricing annual/monthly toggle, not a form). Skipped.
//  - useReducedMotion gate: the screen has NO screen-local Animated. Skipped.
const subscriptionSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerSubscriptionScreen.tsx"),
  "utf8"
);

// Mount inside QueryClientProvider: useCustomerAccountResource calls useQuery
// unconditionally. The default account data source is "fixtures", so the resource
// resolves to status "ready" and the screen renders its hero + mode panel (with the
// RefreshControl-bearing ScrollView) rather than delegating to the shared resource state.
function renderScreen(mode: "billing" | "pricing" | "subscription") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CustomerSubscriptionScreen, { mode })
    )
  );
}

describe("CustomerSubscriptionScreen (render)", () => {
  it("mounts each mode without throwing inside a QueryClientProvider", () => {
    expect(() => renderScreen("pricing")).not.toThrow();
    expect(() => renderScreen("subscription")).not.toThrow();
    expect(() => renderScreen("billing")).not.toThrow();
  });

  it("renders the pricing hero + the disabled-Stripe notice", () => {
    renderScreen("pricing");
    expect(screen.getByText("Unlock GoGoPass")).toBeTruthy();
    expect(screen.getByText("Stripe checkout is not enabled in this environment.")).toBeTruthy();
  });

  it("renders the subscription status panel with the no-active-subscription label", () => {
    renderScreen("subscription");
    expect(screen.getByText("No active subscription")).toBeTruthy();
    expect(screen.getByText("Change Plan")).toBeTruthy();
  });

  it("renders the billing panel status line", () => {
    renderScreen("billing");
    expect(screen.getByText("Status: No active subscription")).toBeTruthy();
  });
});

describe("CustomerSubscriptionScreen — Wave B (B5) foundations adopted (source signals)", () => {
  it("passes a Skeleton-built loadingSkeleton to the shared resource state", () => {
    // The status !== "ready" guard still delegates to CustomerAccountResourceState (owned
    // centrally), but that shared component accepts an opt-in loadingSkeleton prop (B3
    // enhancement). The subscription screen hands it a Skeleton/SkeletonText placeholder so
    // the loading state renders content-shaped chrome instead of the generic spinner.
    expect(subscriptionSource).toContain("CustomerAccountResourceState");
    expect(subscriptionSource).toContain('billingResource.status !== "ready"');
    expect(subscriptionSource).toContain('from "@mobile/components/Skeleton"');
    expect(subscriptionSource).toContain("loadingSkeleton={");
  });

  it("adds pull-to-refresh (RefreshControl) wired to the resource refetch", () => {
    // RefreshControl comes from react-native (aliased to react-native-web in the render
    // harness). It must be mounted on the ready-state ScrollView and its onRefresh wired to
    // the existing resource refetch (billingResource.retry).
    expect(subscriptionSource).toContain("RefreshControl");
    expect(subscriptionSource).toContain("<RefreshControl");
    expect(subscriptionSource).toContain("onRefresh=");
    expect(subscriptionSource).toContain(".retry");
  });

  it("imports haptics and fires impact() on the navigation CTAs", () => {
    // Wired onto the EXISTING <Link asChild><Pressable> press path (navigation cue),
    // not a new handler. The disabled Subscribe/Manage <View>s are inert and get none.
    expect(subscriptionSource).toContain('from "@mobile/lib/haptics"');
    expect(subscriptionSource).toContain("haptics.impact(");
    expect(subscriptionSource).toMatch(/onPress=\{\(\) => haptics\.impact\(\)\}/);
  });

  it("caps the status labels and plan names with numberOfLines so they don't overflow in Thai", () => {
    // Status copy ("No active subscription" / "Status: …") and plan names grow in Thai
    // inside fixed status chrome / plan cards. Format-agnostic (\s+) so a Prettier
    // one-line/multi-line reflow doesn't break the assertion.
    expect(subscriptionSource).toMatch(/numberOfLines=\{1\}\s+style=\{styles\.mutedText\}/);
    expect(subscriptionSource).toMatch(/numberOfLines=\{1\}\s+style=\{styles\.planName\}/);
  });

  it("gives the icon-bearing compact Change Plan secondary action a hitSlop to reach 44px", () => {
    // styles.secondaryAction is minHeight:42 + alignSelf:flex-start (a compact sub-44
    // target with the SwapIcon); add hitSlop on the MotionPressable/Pressable.
    expect(subscriptionSource).toContain("hitSlop=");
    expect(subscriptionSource).toMatch(/hitSlop=[\s\S]*?style=\{styles\.secondaryAction\}/);
  });
});

describe("CustomerSubscriptionScreen GoGoPass rollout flag (render)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('given EXPO_PUBLIC_ENABLE_GOGOPASS="0" > then every mode renders nothing (redirect guard)', () => {
    // One guard in the shared screen covers /pricing, /subscription AND /billing.
    vi.stubEnv("EXPO_PUBLIC_ENABLE_GOGOPASS", "0");
    renderScreen("pricing");
    expect(screen.queryByText("Unlock GoGoPass")).toBeNull();
    renderScreen("subscription");
    expect(screen.queryByText("No active subscription")).toBeNull();
    renderScreen("billing");
    expect(screen.queryByText("Status: No active subscription")).toBeNull();
  });

  it("given the flag unset > then the pricing hero still renders (default unchanged)", () => {
    delete process.env.EXPO_PUBLIC_ENABLE_GOGOPASS;
    renderScreen("pricing");
    expect(screen.getByText("Unlock GoGoPass")).toBeTruthy();
  });
});
