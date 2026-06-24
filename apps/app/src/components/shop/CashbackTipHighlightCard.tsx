import { StyleSheet, Text, View } from "react-native";

import { CashbackTipIllustration } from "@mobile/components/shop/CashbackTipIllustration";
import { catalogEnglish } from "@mobile/components/shop/catalogCopy";
import type { ShopCashbackTipHighlight } from "@mobile/components/shop/shopCashbackTipsTypes";
import { useCopy } from "@mobile/i18n/useCopy";
import { pickThemed, type ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, typography } from "@mobile/theme/tokens";

type CashbackTipHighlightCardProps = {
  readonly tip: ShopCashbackTipHighlight;
};

export function CashbackTipHighlightCard({ tip }: CashbackTipHighlightCardProps) {
  const styles = useThemedStyles(createStyles);
  const tc = useCopy();

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <CashbackTipIllustration tipId={tip.id} />
        <View style={styles.content}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tc(catalogEnglish(tip.badgeKey))}</Text>
          </View>
          <Text style={styles.lead}>
            {tc(catalogEnglish(tip.leadKey))}
            <Text style={styles.emphasis}>{tc(catalogEnglish(tip.emphasisKey))}</Text>
          </Text>
          {tip.showLiveVideoLabels ? (
            <View style={styles.liveVideoRow}>
              <View style={styles.liveVideoPill}>
                <Text style={styles.liveVideoLabel}>{tc(catalogEnglish("merchantTipShopFromLive"))}</Text>
              </View>
              <View style={styles.liveVideoPill}>
                <Text style={styles.liveVideoLabel}>{tc(catalogEnglish("merchantTipShopFromVideo"))}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: pickThemed(colors, "#F0FDFA", colors.primarySoft),
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      padding: 16,
      width: "100%",
    },
    cardRow: {
      flexDirection: "row",
      gap: 14,
      width: "100%",
    },
    content: {
      flex: 1,
      gap: 12,
      minWidth: 0,
    },
    badge: {
      alignSelf: "flex-start",
      backgroundColor: pickThemed(colors, "#FEE2E2", colors.warningSoft),
      borderRadius: radii.chip,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeText: {
      color: colors.danger,
      fontFamily: typography.family,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 16,
    },
    lead: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: typography.bodyWeight,
      lineHeight: 22,
    },
    emphasis: {
      color: colors.primaryDark,
      fontWeight: "600",
    },
    liveVideoRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    liveVideoPill: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.chip,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    liveVideoLabel: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 12,
      fontWeight: "500",
      lineHeight: 16,
    },
  });
}
