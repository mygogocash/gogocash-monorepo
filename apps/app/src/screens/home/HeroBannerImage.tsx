import { Platform, type ImageStyle, type StyleProp } from "react-native";
import { Image } from "expo-image";

import { type HomeHeroBanner } from "@mobile/account/homeBannerResource";
import {
  HOME_HERO_BANNER_CONTENT_FIT,
} from "@mobile/lib/heroBannerImage";
import { resolveHeroBannerImageSource } from "./homeHelpers";

export function HeroBannerImage({
  banner,
  style,
}: {
  banner: HomeHeroBanner;
  style: StyleProp<ImageStyle>;
}) {
  const source = resolveHeroBannerImageSource(banner);

  return (
    <Image
      accessibilityLabel={`${banner.id} promotion banner`}
      allowDownscaling={false}
      cachePolicy="memory-disk"
      contentFit={HOME_HERO_BANNER_CONTENT_FIT}
      loading={Platform.OS === "web" ? "eager" : undefined}
      placeholderContentFit={HOME_HERO_BANNER_CONTENT_FIT}
      priority="high"
      recyclingKey={banner.imageUri ?? banner.asset ?? banner.id}
      source={source}
      style={style}
    />
  );
}
