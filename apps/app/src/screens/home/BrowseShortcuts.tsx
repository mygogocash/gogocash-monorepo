import { Link } from "expo-router";
import { Text, View } from "react-native";
import { webBrowseShortcuts, webHomeSectionOrder } from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { ShortcutIcon } from "./ShortcutIcon";
import { useHomeScreenStyles } from "./homeScreenHooks";

export function BrowseShortcuts() {
  const styles = useHomeScreenStyles();
  const tc = useCopy();

  if (!webHomeSectionOrder.includes("browseShortcuts")) {
    return null;
  }

  return (
    <View style={styles.shortcutRow}>
      {webBrowseShortcuts.map((shortcut) => (
        <Link asChild href={shortcut.href as never} key={shortcut.id}>
          <MotionPressable
            accessibilityLabel={tc(shortcut.label)}
            accessibilityRole="button"
            pressScale={motion.scale.subtlePress}
            style={styles.shortcutPill}
          >
            <ShortcutIcon name={shortcut.icon} />
            <Text ellipsizeMode="tail" numberOfLines={1} style={styles.shortcutText}>
              {tc(shortcut.label)}
            </Text>
          </MotionPressable>
        </Link>
      ))}
    </View>
  );
}
