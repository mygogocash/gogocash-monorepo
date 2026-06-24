import { Link } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import menuFireImage from "../../../assets/nav/menu-fire.png";
import { webDesktopHeaderNavItems } from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { DesktopCategoryNavIcon } from "./DesktopCategoryNavIcon";
import { useHomeScreenStyles } from "./homeScreenHooks";

export function DesktopCategoryNav({
  shellContentWidth,
  shellPadding,
}: {
  shellContentWidth: number;
  shellPadding: number;
}) {
  const styles = useHomeScreenStyles();
  const tc = useCopy();
  return (
    <View accessibilityLabel={tc("Category navigation")} style={styles.desktopCategoryNav}>
      <View
        style={[
          styles.desktopCategoryNavInner,
          { paddingHorizontal: shellPadding, width: shellContentWidth },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.desktopCategoryNavList}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.desktopCategoryNavScroller}
        >
          {webDesktopHeaderNavItems.map((item) => (
            <Link asChild href={item.href as never} key={item.id}>
              <MotionPressable
                pressScale={motion.scale.subtlePress}
                style={StyleSheet.flatten([
                  styles.desktopCategoryNavItem,
                  "menuTypography" in item && item.menuTypography === "lead"
                    ? styles.desktopCategoryNavItemLead
                    : null,
                ])}
              >
                <DesktopCategoryNavIcon name={item.icon} active={Boolean(item.active)} />
                <Text
                  ellipsizeMode="tail"
                  numberOfLines={1}
                  style={[
                    styles.desktopCategoryNavText,
                    "menuTypography" in item && item.menuTypography === "lead"
                      ? styles.desktopCategoryNavTextLead
                      : null,
                  ]}
                >
                  {tc(item.label)}
                </Text>
                {"showFire" in item && item.showFire ? (
                  <Image
                    alt=""
                    resizeMode="cover"
                    source={menuFireImage}
                    style={styles.desktopCategoryFire}
                  />
                ) : null}
                {item.active ? <View style={styles.desktopCategoryUnderline} /> : null}
              </MotionPressable>
            </Link>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
