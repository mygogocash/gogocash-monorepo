import { Tabs } from "expo-router";

import { useThemeColors } from "@mobile/theme/ThemeProvider";

export default function TabLayout() {
  const colors = useThemeColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.muted,
        // Theme the tab scene background (React Navigation defaults to light #F2F2F2).
        sceneStyle: { backgroundColor: colors.background },
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
      {/* `profile` requires auth, but it self-guards in `(tabs)/profile.tsx` with a
          <Redirect> to /login (a Tabs.Protected fallback would only reach a sibling tab). */}
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
