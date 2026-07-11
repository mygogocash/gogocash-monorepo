import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useCopy } from "@mobile/i18n/useCopy";
import { useToast } from "@mobile/hooks/useToast";
import { copyToClipboard } from "@mobile/lib/clipboard";
import { webProfileHeroCard } from "@mobile/design/webDesignParity";
import { Copy as CopyIcon, Eye as EyeIcon, EyeSlash as EyeSlashIcon } from "@mobile/theme/icons";
import { typography } from "@mobile/theme/tokens";

type MaskedUserIdRowProps = {
  iconColor: string;
  maskedId: string;
  textStyle: TextStyle;
  userId: string;
  /** Optional kicker rendered before the value (e.g. "User ID"). */
  label?: string;
  labelStyle?: TextStyle;
  rowStyle?: StyleProp<ViewStyle>;
};

export function MaskedUserIdRow({
  iconColor,
  label,
  labelStyle,
  maskedId,
  rowStyle,
  textStyle,
  userId,
}: MaskedUserIdRowProps) {
  const tc = useCopy();
  const toast = useToast();
  const [revealed, setRevealed] = useState(false);
  const styles = createStyles();

  const displayValue = revealed ? userId : maskedId;

  const copyUserId = async () => {
    const copied = await copyToClipboard(userId);
    toast.show(tc(copied ? webProfileHeroCard.userIdCopiedToast : webProfileHeroCard.copyFailedToast));
  };

  return (
    <View style={[styles.row, rowStyle]}>
      {label ? (
        <Text numberOfLines={1} style={labelStyle}>
          {label}
        </Text>
      ) : null}
      <Text numberOfLines={1} style={[textStyle, styles.idText]}>
        {displayValue}
      </Text>
      <Pressable
        accessibilityLabel={tc(
          revealed ? webProfileHeroCard.userIdHideAria : webProfileHeroCard.userIdRevealAria,
        )}
        accessibilityRole="button"
        accessibilityState={{ expanded: revealed }}
        onPress={() => setRevealed((open) => !open)}
        style={styles.iconButton}
      >
        {revealed ? (
          <EyeSlashIcon color={iconColor} size={16} strokeWidth={typography.iconStrokeWidth} />
        ) : (
          <EyeIcon color={iconColor} size={16} strokeWidth={typography.iconStrokeWidth} />
        )}
      </Pressable>
      <Pressable
        accessibilityLabel={tc(webProfileHeroCard.userIdCopyAria)}
        accessibilityRole="button"
        onPress={() => void copyUserId()}
        style={styles.iconButton}
      >
        <CopyIcon color={iconColor} size={16} strokeWidth={typography.iconStrokeWidth} />
      </Pressable>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
      maxWidth: "100%",
      minWidth: 0,
    },
    idText: {
      flexShrink: 1,
      minWidth: 0,
    },
    iconButton: {
      alignItems: "center",
      borderRadius: 6,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
  });
}
