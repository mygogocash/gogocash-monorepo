import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";

import logoMarkImage from "../../../assets/nav/logo.png";
import { useCopy } from "@mobile/i18n/useCopy";
import { ArrowRight, Link2, Share2 } from "@mobile/theme/icons";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useTheme } from "@mobile/theme/ThemeProvider";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

type GoLinkGuidelineStep = 1 | 2 | 3;

export function GoLinkGuidelineFlowIllustration() {
  const styles = useThemedStyles(createFlowStyles);
  const { colors } = useTheme();
  const tc = useCopy();

  return (
    <View style={styles.row}>
      <View style={styles.item}>
        <View style={styles.copySquare}>
          <Link2 color={colors.muted} size={28} strokeWidth={typography.iconStrokeWidth} />
        </View>
        <Text style={styles.label}>{tc("Copy")}</Text>
      </View>
      <ArrowRight color={colors.muted} size={22} strokeWidth={typography.iconStrokeWidth} />
      <View style={styles.item}>
        <View style={styles.pasteSquare}>
          <Image
            accessibilityLabel="GoGoCash logo"
            source={logoMarkImage}
            style={styles.pasteLogo}
          />
          <View style={styles.pasteLinkBadge}>
            <Link2 color={colors.white} size={14} strokeWidth={2.4} />
          </View>
        </View>
        <Text style={styles.label}>{tc("Paste")}</Text>
      </View>
    </View>
  );
}

export function GoLinkGuidelineStepIllustration({ step }: { readonly step: GoLinkGuidelineStep }) {
  const styles = useThemedStyles(createStepStyles);
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Svg height={96} style={styles.canvas} viewBox="0 0 96 96" width={96}>
        <Rect
          fill={pickThemed(colors, "#E8F8F2", colors.primarySoft)}
          height={96}
          rx={12}
          width={96}
          x={0}
          y={0}
        />
        <Rect
          fill={colors.card}
          height={72}
          rx={10}
          stroke={colors.border}
          strokeWidth={1.5}
          width={42}
          x={27}
          y={12}
        />
        {step !== 2 ? (
          <Circle cx={48} cy={30} fill={pickThemed(colors, "#D4A574", "#B8956A")} r={9} />
        ) : null}
        {step === 1 ? (
          <>
            <Rect fill={pickThemed(colors, "#F3F4F6", colors.fieldMuted)} height={24} rx={4} width={34} x={31} y={48} />
            {[0, 1, 2, 3].map((column) =>
              [0, 1].map((row) => (
                <Circle
                  key={`${column}-${row}`}
                  cx={37 + column * 7}
                  cy={54 + row * 7}
                  fill={colors.border}
                  r={2.2}
                />
              ))
            )}
            <Circle cx={68} cy={52} fill={colors.card} r={10} stroke={colors.border} strokeWidth={1.5} />
            <Circle cx={68} cy={52} fill="transparent" r={4} stroke={colors.muted} strokeWidth={1.6} />
          </>
        ) : null}
        {step === 2 ? (
          <Rect
            fill={pickThemed(colors, colors.primarySoft, colors.fieldMuted)}
            height={46}
            rx={6}
            width={30}
            x={33}
            y={24}
          />
        ) : null}
        {step === 3 ? (
          <>
            <Rect fill={colors.primary} height={12} rx={6} width={28} x={34} y={58} />
            <Rect fill={colors.white} height={2} opacity={0.95} rx={1} width={16} x={40} y={63} />
          </>
        ) : null}
      </Svg>
      {step === 2 ? (
        <View style={styles.phoneGoWrap}>
          <Text style={styles.phoneGoMark}>GO</Text>
        </View>
      ) : null}
      {step === 1 ? (
        <View style={styles.shareBadge}>
          <Share2 color={colors.primaryDark} size={11} strokeWidth={2.2} />
        </View>
      ) : null}
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>{step}</Text>
      </View>
    </View>
  );
}

function createFlowStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: 28,
      justifyContent: "center",
      width: "100%",
    },
    item: {
      alignItems: "center",
      gap: 8,
      minWidth: 72,
    },
    copySquare: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      height: 64,
      justifyContent: "center",
      width: 64,
    },
    pasteSquare: {
      alignItems: "center",
      borderRadius: 16,
      height: 64,
      justifyContent: "center",
      position: "relative",
      width: 64,
    },
    pasteLogo: {
      borderRadius: 16,
      height: 64,
      width: 64,
    },
    pasteLinkBadge: {
      alignItems: "center",
      backgroundColor: pickThemed(colors, "rgba(255,255,255,0.22)", "rgba(255,255,255,0.18)"),
      borderRadius: 8,
      bottom: 6,
      height: 20,
      justifyContent: "center",
      position: "absolute",
      right: 6,
      width: 20,
    },
    label: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 18,
    },
  });
}

function createStepStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      height: 96,
      position: "relative",
      width: 96,
    },
    canvas: {
      borderRadius: 12,
    },
    stepBadge: {
      alignItems: "center",
      backgroundColor: colors.primary,
      borderRadius: 11,
      height: 22,
      justifyContent: "center",
      left: 4,
      pointerEvents: "none",
      position: "absolute",
      top: 4,
      width: 22,
    },
    stepBadgeText: {
      color: colors.white,
      fontFamily: typography.family,
      fontSize: 12,
      fontWeight: "800",
      lineHeight: 14,
    },
    shareBadge: {
      alignItems: "center",
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: 10,
      borderWidth: 1,
      bottom: 8,
      height: 20,
      justifyContent: "center",
      pointerEvents: "none",
      position: "absolute",
      right: 8,
      width: 20,
    },
    phoneGoWrap: {
      alignItems: "center",
      justifyContent: "center",
      left: 33,
      pointerEvents: "none",
      position: "absolute",
      top: 36,
      width: 30,
    },
    phoneGoMark: {
      color: colors.primaryDark,
      fontFamily: typography.family,
      fontSize: 16,
      fontWeight: "800",
    },
  });
}
