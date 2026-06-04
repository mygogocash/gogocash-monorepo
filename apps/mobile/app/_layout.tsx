import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { CustomerDesktopRouteChrome } from "@mobile/components/CustomerDesktopRouteChrome";
import { AppProviders } from "@mobile/providers/AppProviders";

// Authenticated-only routes — the `requiresAuth: true` entries from
// `mobileParityRoutes` (src/navigation/routes.ts). Listed as expo-router screen
// names (path relative to app/, keeping `index` for directory index files).
// `/profile` itself is a tab and is guarded inside `(tabs)/_layout.tsx`.
const PROTECTED_SCREEN_NAMES = [
  "profile/info",
  "profile/cf-phone",
  "profile/verify-phone",
  "profile/my-rating",
  "profile/offer",
  "wallet",
  "withdraw/index",
  "withdraw/my-cashback",
  "method/index",
  "method/create",
  "favorite",
  "referral",
  "billing",
  "subscription",
  "pricing",
  "membership",
  "credit-score",
  "missing-orders",
  "age-verification",
  "language",
  "privacy-center",
  "quest/history",
  "gogosense/index",
  "gogosense/onboarding",
  "gogosense/permissions",
  "gogosense/timeline",
  "gogosense/settings",
  "gogosense/recovery",
  "gogosense/merchant/[id]",
] as const;

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <CustomerDesktopRouteChrome>
        <RootStack />
      </CustomerDesktopRouteChrome>
    </AppProviders>
  );
}

/**
 * Root navigator with expo-router native route protection.
 *
 * `Stack.Protected` removes guarded screens from the navigator (instead of
 * unmounting the whole `<Stack>` mid-navigation, which would collapse
 * protected-route taps back to home).
 * When a guard denies access, expo-router falls back to the FIRST AVAILABLE
 * screen in declaration order — so `login` is declared first to make
 * unauthenticated access to a protected route land on `/login`, and `(tabs)`
 * is declared next so an authenticated user hitting `/login` (now removed)
 * falls back to home.
 *
 * `isAuthed` is synchronous-correct on web (localStorage) via
 * `useAuthGuardSession`, and `AppProviders` gates this subtree behind the
 * one-time session bootstrap, so the guard is correct the moment the Stack mounts.
 */
function RootStack() {
  const { isAuthed } = useAuthGuardSession();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Unauthenticated-only. Declared first → the fallback target for a denied
          protected route is `/login`. */}
      <Stack.Protected guard={!isAuthed}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack.Protected>

      {/* Public home/tabs. Declared before the protected group so an authenticated
          user hitting the now-removed `/login` falls back to home, not a protected
          screen. */}
      <Stack.Screen name="(tabs)" />

      {/* Authenticated-only routes. */}
      <Stack.Protected guard={isAuthed}>
        {PROTECTED_SCREEN_NAMES.map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
      </Stack.Protected>
    </Stack>
  );
}
