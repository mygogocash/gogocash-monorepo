import { useState } from "react";
import { Link } from "expo-router";
import { Image, Text, View } from "react-native";
import logoMarkImage from "../../../assets/nav/logo.png";
import questHeaderImage from "../../../assets/nav/quest-header.png";
import { getDesktopShellHorizontalPadding, mobileShellLayout, webDesktopHeaderNavItems } from "@mobile/design/webDesignParity";
import { CustomerLocaleRegionControl } from "@mobile/components/CustomerLocaleRegionControl";
import { CustomerProfileNav } from "@mobile/components/CustomerProfileNav";
import { CustomerSignInNavGraphic } from "@mobile/components/CustomerSignInNavGraphic";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useMobileSessionSnapshot } from "@mobile/auth/useMobileSessionSnapshot";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { DesktopCategoryNav } from "./DesktopCategoryNav";
import { useHomeScreenStyles } from "./homeScreenHooks";

export function DesktopHeader({ viewportWidth }: { viewportWidth: number }) {
  const styles = useHomeScreenStyles();
  const tc = useCopy();
  const session = useMobileSessionSnapshot();
  const shellPadding = getDesktopShellHorizontalPadding(viewportWidth);
  const shellContentWidth = Math.min(viewportWidth, mobileShellLayout.desktopContentMaxWidth);
  const shellOffset = Math.max(0, (viewportWidth - shellContentWidth) / 2);
  const [localePanelOpen, setLocalePanelOpen] = useState(false);
  const [profilePanelOpen, setProfilePanelOpen] = useState(false);

  return (
    <View
      style={[
        styles.desktopShell,
        {
          marginLeft: -shellOffset,
          width: viewportWidth,
        },
      ]}
    >
      <View
        style={[
          styles.desktopHeader,
          localePanelOpen || profilePanelOpen ? styles.desktopHeaderOverlayLayer : null,
        ]}
      >
        <View
          style={[
            styles.desktopHeaderContent,
            { paddingHorizontal: shellPadding, width: shellContentWidth },
          ]}
        >
          <Link asChild href="/">
            <MotionPressable pressScale={motion.scale.subtlePress} style={styles.desktopLogoLink}>
              <Image
                alt="GoGoCash logo"
                accessibilityLabel="GoGoCash logo"
                source={logoMarkImage}
                style={styles.desktopLogoMark}
              />
              <Text style={styles.desktopLogoText}>GoGoCash</Text>
            </MotionPressable>
          </Link>
          <View style={styles.desktopHeaderActions}>
            <Link asChild href="/quest">
              <MotionPressable
                accessibilityLabel={tc("Quest")}
                pressScale={motion.scale.subtlePress}
                style={styles.desktopQuestPill}
              >
                <Image
                  alt={tc("Quest")}
                  accessibilityLabel={tc("Quest")}
                  resizeMode="cover"
                  source={questHeaderImage}
                  style={styles.desktopQuestImage}
                />
              </MotionPressable>
            </Link>
            {session ? (
              <CustomerProfileNav onExpandedChange={setProfilePanelOpen} session={session} />
            ) : (
              <Link asChild href="/login">
                <MotionPressable
                  accessibilityLabel={tc("Sign in")}
                  pressScale={motion.scale.subtlePress}
                  style={styles.desktopSignIn}
                >
                  <CustomerSignInNavGraphic />
                </MotionPressable>
              </Link>
            )}
            <CustomerLocaleRegionControl onExpandedChange={setLocalePanelOpen} />
          </View>
        </View>
      </View>
      <DesktopCategoryNav shellContentWidth={shellContentWidth} shellPadding={shellPadding} />
    </View>
  );
}
