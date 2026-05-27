import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { CustomerDesktopRouteChrome } from "@mobile/components/CustomerDesktopRouteChrome";
import { AppProviders } from "@mobile/providers/AppProviders";

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <CustomerDesktopRouteChrome>
        <Stack screenOptions={{ headerShown: false }} />
      </CustomerDesktopRouteChrome>
    </AppProviders>
  );
}
