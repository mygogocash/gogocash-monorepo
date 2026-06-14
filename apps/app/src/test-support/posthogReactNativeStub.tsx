import { createElement, Fragment, type ReactNode } from "react";

// Test stub for posthog-react-native used ONLY by the render-test config. The real
// package ships source with a value-position `typeof` type alias that the render
// config's rolldown/oxc TS-stripping transform rejects ("Unexpected token
// 'typeof'", though tsc accepts it) — the same class of issue handled for
// phosphor-react-native and CustomerDesktopFooterSlot.
//
// usePostHog() returns undefined here (no client), which exercises the production
// "no PostHog key configured" branch: useAnalytics() then returns null and the
// event helpers no-op. PostHogProvider is a passthrough (AppProviders imports it).
// Never bundled into the app.
export function usePostHog(): undefined {
  return undefined;
}

export function PostHogProvider({ children }: { children?: ReactNode }) {
  return createElement(Fragment, null, children);
}

export default { usePostHog, PostHogProvider };
