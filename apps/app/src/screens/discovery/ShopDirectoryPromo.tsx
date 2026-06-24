import { useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";

import shopPromoGogoQuestImage from "../../../assets/shop-promo-gogoquest.png";
import { webShopDirectory } from "@mobile/design/webDesignParity";
import { useCopy } from "@mobile/i18n/useCopy";
import { useThemedStyles } from "@mobile/theme/useThemedStyles";

import { createDiscoveryScreenStyles } from "./customerDiscoveryStyles";
import { shopDirectoryImageAssets } from "./directoryAssets";
import { type DirectoryPromo } from "./discoveryTypes";

export function ShopDirectoryPromo({
  contentWidth,
  isDesktop,
  promo = webShopDirectory.promo,
}: {
  contentWidth: number;
  isDesktop: boolean;
  promo?: DirectoryPromo;
}) {
  const styles = useThemedStyles(createDiscoveryScreenStyles);
  const tc = useCopy();
  const [activeIndex, setActiveIndex] = useState(0);
  const slideGap = 24;
  const slideWidth = isDesktop ? Math.min(800, contentWidth) : Math.min(800, contentWidth * 0.85);
  const slideHeight = slideWidth / promo.aspectRatio;
  const promoImage = shopDirectoryImageAssets[promo.imageAsset] ?? shopPromoGogoQuestImage;

  return (
    <View style={styles.shopDirectoryPromo}>
      <View style={styles.shopDirectoryPromoTitleFrame}>
        <Text
          style={[
            styles.shopDirectoryPromoTitle,
            isDesktop ? styles.shopDirectoryPromoTitleDesktop : null,
          ]}
        >
          {tc(promo.title)}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ gap: slideGap, paddingRight: slideGap }}
        horizontal
        onScroll={(event) => {
          const nextIndex = Math.round(
            event.nativeEvent.contentOffset.x / Math.max(1, slideWidth + slideGap)
          );
          setActiveIndex(Math.max(0, Math.min(promo.slideCount - 1, nextIndex)));
        }}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
      >
        {Array.from({ length: promo.slideCount }).map((_, index) => (
          <View
            key={`shop-promo-${index}`}
            style={[
              styles.shopDirectoryPromoSlide,
              {
                height: slideHeight,
                width: slideWidth,
              },
            ]}
          >
            <Image
              alt={tc(promo.title)}
              accessibilityLabel={tc(promo.title)}
              resizeMode="cover"
              source={promoImage}
              style={styles.shopDirectoryPromoImage}
            />
            <View style={styles.shopDirectoryPromoVignette} />
          </View>
        ))}
      </ScrollView>
      <View style={styles.shopDirectoryPromoDots}>
        {Array.from({ length: promo.slideCount }).map((_, index) => (
          <View
            key={`shop-promo-dot-${index}`}
            style={[
              styles.shopDirectoryPromoDot,
              activeIndex === index ? styles.shopDirectoryPromoDotActive : null,
            ]}
          />
        ))}
      </View>
    </View>
  );
}
