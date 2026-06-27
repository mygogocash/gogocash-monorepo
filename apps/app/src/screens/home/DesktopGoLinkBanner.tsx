import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import {
  ClipboardText as ClipboardIcon,
  Copy as CopyIcon,
  Info as InfoIcon,
  Link2 as LinkIcon,
  ShoppingBag as ShoppingBagIcon,
} from "@mobile/theme/icons";
import { webGoLinkFeature } from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { isValidGoLinkUrl } from "@mobile/features/golink";
import { pickThemed } from "@mobile/theme/colorPalettes";
import { motion } from "@mobile/theme/motion";
import {
  goLinkBackdropGradient,
  homeIconStrokeWidth,
  webSearchInputFocusReset,
} from "./homeAssets";
import { useHomeScreenColors, useHomeScreenStyles } from "./homeScreenHooks";
import { type DesktopGoLinkBannerProps } from "./homeTypes";

export function DesktopGoLinkBanner({
  onOpenGuideline,
  onResultHref,
  variant = "default",
}: DesktopGoLinkBannerProps) {
  const styles = useHomeScreenStyles();
  const colors = useHomeScreenColors();
  const isMobileTabletHeader = variant === "mobileTabletHeader";
  const [goLinkError, setGoLinkError] = useState("");
  const [goLinkInput, setGoLinkInput] = useState("");
  const tc = useCopy();

  const handlePasteAndGo = () => {
    const nextGoLinkInput = goLinkInput.trim();

    setGoLinkError("");

    if (!nextGoLinkInput) {
      setGoLinkError(webGoLinkFeature.emptyError);
      return;
    }

    if (!isValidGoLinkUrl(nextGoLinkInput)) {
      setGoLinkError(webGoLinkFeature.invalidUrlError);
      return;
    }

    onResultHref(nextGoLinkInput);
  };

  return (
    <View
      accessibilityLabel={tc(isMobileTabletHeader ? "GoGoLink header banner" : "GoGoLink desktop banner")}
      style={[
        styles.desktopGoLinkBanner,
        isMobileTabletHeader ? styles.mobileTabletGoLinkBanner : null,
      ]}
      testID={isMobileTabletHeader ? "mobile-tablet-golink-banner" : "desktop-golink-banner"}
    >
      <View
        style={[
          styles.desktopGoLinkBackdrop,
          // Web-only light frosted gradient; in dark mode the solid dark backdrop stands in.
          colors.isDark ? null : goLinkBackdropGradient,
          { pointerEvents: "none" },
        ]}
      />
      <View
        style={[
          styles.desktopGoLinkAccentGlow,
          { pointerEvents: "none" },
        ]}
      />
      <MotionPressable
        accessibilityLabel={tc("About GoLink")}
        accessibilityRole="button"
        hitSlop={10}
        onPress={onOpenGuideline}
        pressScale={motion.scale.subtlePress}
        style={styles.desktopGoLinkInfoButton}
      >
        <InfoIcon
          color={pickThemed(colors, "rgba(10, 92, 74, 0.55)", colors.muted)}
          size={18}
          strokeWidth={homeIconStrokeWidth}
        />
      </MotionPressable>
      <View
        accessibilityLabel={tc("GoGoLink cashback link illustration")}
        style={[
          styles.desktopGoLinkIllustrationWrap,
          isMobileTabletHeader ? styles.mobileTabletGoLinkIllustrationWrap : null,
        ]}
      >
        <LinkIcon color={colors.primary} size={46} strokeWidth={homeIconStrokeWidth} />
        <View style={styles.desktopGoLinkGoBadge}>
          <Text style={styles.desktopGoLinkGoBadgeText}>GO</Text>
        </View>
      </View>
      <View
        style={[
          styles.desktopGoLinkForm,
          isMobileTabletHeader ? styles.mobileTabletGoLinkForm : null,
        ]}
      >
        <View style={styles.desktopGoLinkEyebrow}>
          <Text style={styles.desktopGoLinkEyebrowText}>GoGoLink</Text>
        </View>
        <View style={styles.desktopGoLinkHeadlineRow}>
          <Text
            nativeID="golink-banner-heading"
            style={[
              styles.desktopGoLinkTitle,
              isMobileTabletHeader ? styles.mobileTabletGoLinkTitle : null,
            ]}
          >
            {tc("Easy to earn cashback by just")}
          </Text>
          <View style={styles.desktopGoLinkSteps}>
            <View style={styles.desktopGoLinkStep}>
              <View style={styles.desktopGoLinkStepNum}>
                <Text style={styles.desktopGoLinkStepNumText}>1</Text>
              </View>
              <CopyIcon color={pickThemed(colors, colors.primaryDark, colors.accent)} size={15} strokeWidth={homeIconStrokeWidth} />
              <Text style={styles.desktopGoLinkStepText}>{tc("Copy link")}</Text>
            </View>
            <Text style={styles.desktopGoLinkStepArrow}>›</Text>
            <View style={styles.desktopGoLinkStep}>
              <View style={styles.desktopGoLinkStepNum}>
                <Text style={styles.desktopGoLinkStepNumText}>2</Text>
              </View>
              <ClipboardIcon color={pickThemed(colors, colors.primaryDark, colors.accent)} size={15} strokeWidth={homeIconStrokeWidth} />
              <Text style={styles.desktopGoLinkStepText}>{tc("Paste here")}</Text>
            </View>
            <Text style={styles.desktopGoLinkStepArrow}>›</Text>
            <View style={styles.desktopGoLinkStep}>
              <View style={styles.desktopGoLinkStepNum}>
                <Text style={styles.desktopGoLinkStepNumText}>3</Text>
              </View>
              <ShoppingBagIcon color={pickThemed(colors, colors.primaryDark, colors.accent)} size={15} strokeWidth={homeIconStrokeWidth} />
              <Text style={styles.desktopGoLinkStepText}>{tc("Shop & earn")}</Text>
            </View>
          </View>
        </View>
        <View
          style={[
            styles.desktopGoLinkControls,
            isMobileTabletHeader ? styles.mobileTabletGoLinkControls : null,
          ]}
        >
          <View style={styles.desktopGoLinkInputField}>
            <View
              style={[
                styles.desktopGoLinkInputShell,
                goLinkError ? styles.desktopGoLinkInputShellError : null,
              ]}
            >
              <LinkIcon
                color={pickThemed(colors, "rgba(0, 170, 128, 0.48)", colors.primaryDark)}
                size={18}
                strokeWidth={homeIconStrokeWidth}
              />
              <TextInput
                accessibilityLabel={tc(webGoLinkFeature.inputLabel)}
                autoCapitalize="none"
                autoCorrect={false}
                inputMode="url"
                onChangeText={(nextValue) => {
                  setGoLinkInput(nextValue);
                  if (goLinkError) {
                    setGoLinkError("");
                  }
                }}
                onSubmitEditing={handlePasteAndGo}
                placeholder={tc(webGoLinkFeature.inputPlaceholder)}
                placeholderTextColor={pickThemed(colors, "rgba(92, 114, 107, 0.55)", colors.muted)}
                returnKeyType="go"
                style={[styles.desktopGoLinkInput, webSearchInputFocusReset]}
                value={goLinkInput}
              />
            </View>
            {goLinkError ? <Text style={styles.desktopGoLinkError}>{tc(goLinkError)}</Text> : null}
          </View>
          <MotionPressable
            accessibilityRole="button"
            onPress={handlePasteAndGo}
            pressScale={motion.scale.subtlePress}
            style={[
              styles.desktopGoLinkAction,
              isMobileTabletHeader ? styles.mobileTabletGoLinkAction : null,
            ]}
          >
            <Text style={styles.desktopGoLinkActionText}>{tc(webGoLinkFeature.ctaLabel)}</Text>
          </MotionPressable>
        </View>
      </View>
    </View>
  );
}
