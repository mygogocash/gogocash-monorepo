import { Text, View } from "react-native";
import { webProductDiscovery } from "@mobile/design/webDesignParity";
import { MotionPressable } from "@mobile/components/MotionPressable";
import { useCopy } from "@mobile/i18n/useCopy";
import { motion } from "@mobile/theme/motion";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";
import { productDiscoveryDialogTransition } from "./directoryAssets";

export function ProductDiscoveryTermsDialog({
  closing,
  onClose,
  visible,
}: {
  closing: boolean;
  onClose: () => void;
  visible: boolean;
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const tc = useCopy();
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.productDiscoveryTermsLayer}>
      <MotionPressable
        accessibilityLabel={tc("Close terms dialog")}
        accessibilityRole="button"
        onPress={onClose}
        pressScale={1}
        style={[
          styles.productDiscoveryTermsBackdrop,
          productDiscoveryDialogTransition,
          closing ? styles.productDiscoveryTermsBackdropClosing : null,
        ]}
      />
      <View
        style={[
          styles.productDiscoveryTermsCard,
          productDiscoveryDialogTransition,
          closing ? styles.productDiscoveryTermsCardClosing : null,
        ]}
      >
        <Text style={styles.productDiscoveryTermsTitle}>{tc(webProductDiscovery.termsTitle)}</Text>
        <Text style={styles.productDiscoveryTermsBody}>{tc(webProductDiscovery.termsBody)}</Text>
        <MotionPressable
          accessibilityRole="button"
          onPress={onClose}
          pressScale={motion.scale.subtlePress}
          style={styles.productDiscoveryTermsCloseButton}
        >
          <Text style={styles.productDiscoveryTermsCloseText}>{tc("Close")}</Text>
        </MotionPressable>
      </View>
    </View>
  );
}
