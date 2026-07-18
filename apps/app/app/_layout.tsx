import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider as NavThemeProvider,
} from "expo-router";

import { redirectStagingWebAliasToCanonicalHost } from "@mobile/auth/canonicalWebOrigin";
import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { CustomerDesktopRouteChrome } from "@mobile/components/CustomerDesktopRouteChrome";
import { AppProviders } from "@mobile/providers/AppProviders";
import { ThemedStatusBar, useThemeColors } from "@mobile/theme/ThemeProvider";

// Alias hosts (e.g. staging.gogocash.co) share this Railway service but not
// localStorage / LIFF Endpoint URL with app-staging — bounce before auth UI.
redirectStagingWebAliasToCanonicalHost();

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
  "withdraw/index",
  "withdraw/my-cashback",
  "method/index",
  "method/create",
  "favorite",
  "referral",
  "billing",
  "catalog/cart",
  "catalog/orders",
  "commerce/checkout/success",
  "commerce/checkout/cancel",
  "subscription",
  "pricing",
  "membership",
  "credit-score",
  "missing-orders",
  "age-verification",
  "language",
  "privacy-center",
  "quest/history",
  "gototrack/index",
  "gototrack/onboarding",
  "gototrack/permissions",
  "gototrack/timeline",
  "gototrack/settings",
  "gototrack/recovery",
  "gototrack/merchant/[id]",
] as const;

export default function RootLayout() {
  return (
    <AppProviders>
      <ThemedStatusBar />
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
  const colors = useThemeColors();

  // React Navigation paints the scene background from its theme (DefaultTheme is the
  // light #F2F2F2). Feed it our resolved palette so every screen's backdrop follows
  // the customer's appearance setting, not just our own View backgrounds.
  const baseNavTheme = colors.isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseNavTheme,
    colors: {
      ...baseNavTheme.colors,
      background: colors.background,
      card: colors.card,
      text: colors.ink,
      border: colors.border,
      primary: colors.primary,
    },
  };

  return (
    <NavThemeProvider value={navTheme}>
    <Stack
      screenOptions={{
        headerShown: false,
        // Theme the navigator scene background; otherwise React Navigation's default
        // light (#F2F2F2) shows through behind every screen in dark mode.
        contentStyle: { backgroundColor: colors.background },
      }}
    >
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

      {/* Self-guarded in `app/wallet.tsx` (redirect to /login when logged out). */}
      <Stack.Screen name="wallet" />

      {/* Authenticated-only routes. */}
      <Stack.Protected guard={isAuthed}>
        {PROTECTED_SCREEN_NAMES.map((name) => (
          <Stack.Screen key={name} name={name} />
        ))}
      </Stack.Protected>
    </Stack>
    </NavThemeProvider>
  );
}
