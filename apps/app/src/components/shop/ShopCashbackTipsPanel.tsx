import { StyleSheet, Text, View } from "react-native";

import { CashbackTipHighlightCard } from "@mobile/components/shop/CashbackTipHighlightCard";
import { CashbackTipTextCard } from "@mobile/components/shop/CashbackTipTextCard";
import {
  assertExhaustiveShopCashbackTip,
  filterShopCashbackTipsForCategory,
  type ShopCashbackTipsConfig,
} from "@mobile/components/shop/shopCashbackTipsTypes";
import { useCopy } from "@mobile/i18n/useCopy";
import { type ThemeColors } from "@mobile/theme/colorPalettes";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";
import { typography } from "@mobile/theme/tokens";

type ShopCashbackTipsPanelProps = {
  readonly shop: {
    readonly category: string;
    readonly cashbackTips: ShopCashbackTipsConfig;
  };
};

export function ShopCashbackTipsPanel({ shop }: ShopCashbackTipsPanelProps) {
  const styles = useThemedStyles(createStyles);
  const tc = useCopy();
  const visibleTips = filterShopCashbackTipsForCategory(shop.cashbackTips.tips, shop.category);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.emoji}>💡</Text>
        <Text style={styles.title}>{tc("Cashback Tips")}</Text>
      </View>
      <View style={styles.tipList}>
        {visibleTips.map((tip) => {
          switch (tip.kind) {
            case "highlight":
              return <CashbackTipHighlightCard key={tip.id} tip={tip} />;
            case "text":
              return <CashbackTipTextCard key={tip.id} tip={tip} />;
            default:
              return assertExhaustiveShopCashbackTip(tip);
          }
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: {
      alignItems: "flex-start",
      gap: 16,
      minWidth: 0,
      width: "100%",
    },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 8,
      width: "100%",
    },
    emoji: {
      fontSize: 20,
      height: 24,
      lineHeight: 24,
      textAlign: "center",
      width: 24,
    },
    title: {
      color: colors.ink,
      fontFamily: typography.family,
      fontSize: 20,
      fontWeight: "600",
      lineHeight: 30,
    },
    tipList: {
      gap: 12,
      width: "100%",
    },
  });
}
