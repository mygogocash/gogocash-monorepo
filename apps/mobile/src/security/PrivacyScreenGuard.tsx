import { useEffect, useState, type ReactNode } from "react";
import { AppState, type AppStateStatus, Image, StyleSheet, View } from "react-native";

import logoMarkImage from "../../assets/nav/logo.png";
import { colors } from "@mobile/theme/tokens";

// Device-lifecycle privacy: when the app leaves the foreground — the iOS app
// switcher (state "inactive"), a backgrounded app (state "background"), or the
// transition a crash-relaunch passes through — cover the UI with an opaque brand
// screen so account data is never captured in the app-switcher snapshot or a
// background screenshot. Pure React Native (AppState), so it works on web/native
// without a custom native module.
export function PrivacyScreenGuard({ children }: { children: ReactNode }) {
  const [covered, setCovered] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
      setCovered(nextState !== "active");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <View style={styles.root}>
      {children}
      {covered ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={styles.cover}
        >
          <Image alt="" source={logoMarkImage} style={styles.coverLogo} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  cover: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    backgroundColor: colors.background,
    justifyContent: "center",
    zIndex: 9999,
  },
  coverLogo: {
    height: 48,
    width: 48,
  },
});
