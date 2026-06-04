import { Tabs } from "expo-router";

import { useAuthGuardSession } from "@mobile/auth/useAuthGuardSession";
import { colors } from "@mobile/theme/tokens";

export default function TabLayout() {
  const { isAuthed } = useAuthGuardSession();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          borderTopColor: colors.border,
          display: "none",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="discover" options={{ title: "Discover" }} />
      <Tabs.Screen name="shops" options={{ title: "Shops" }} />
      <Tabs.Screen name="quest" options={{ title: "Quest" }} />

      {/* `/profile` requires auth. When unauthenticated the tab is removed and the
          navigator falls back to the first available tab (home). */}
      <Tabs.Protected guard={isAuthed}>
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs.Protected>
    </Tabs>
  );
}
