import { StyleSheet, Text, View } from "react-native";

import { CashbackTipIllustration } from "@mobile/components/shop/CashbackTipIllustration";
import { catalogEnglish } from "@mobile/components/shop/catalogCopy";
import type { ShopCashbackTipText } from "@mobile/components/shop/shopCashbackTipsTypes";
import { useCopy } from "@mobile/i18n/useCopy";
import { type ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { radii, typography } from "@mobile/theme/tokens";

type CashbackTipTextCardProps = {
  readonly tip: ShopCashbackTipText;
};

export function CashbackTipTextCard({ tip }: CashbackTipTextCardProps) {
  const styles = useThemedStyles(createStyles);
  const tc = useCopy();

  return (
    <View style={styles.card}>
      <CashbackTipIllustration tipId={tip.id} />
      <View style={styles.copy}>
        <Text style={styles.title}>{tc(catalogEnglish(tip.titleKey))}</Text>
        <Text style={styles.body}>{tc(catalogEnglish(tip.bodyKey))}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderRadius: radii.lg,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      padding: 16,
      width: "100%",
    },
    copy: {
      flex: 1,
      gap: 4,
      minWidth: 0,
    },
    title: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 15,
      fontWeight: "600",
      lineHeight: 20,
    },
    body: {
      color: colors.muted,
      fontFamily: typography.family,
      fontSize: 14,
      fontWeight: typography.bodyWeight,
      lineHeight: 22,
    },
  });
}
