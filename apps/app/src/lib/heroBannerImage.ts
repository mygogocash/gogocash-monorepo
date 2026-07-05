import { PixelRatio } from "react-native";

import { mobileShellLayout } from "@mobile/design/webDesignParity";

/** Design target for admin uploads and bundled fixture art (16:9). */
export const HOME_HERO_BANNER_DESIGN_WIDTH = 1920;
export const HOME_HERO_BANNER_DESIGN_HEIGHT = 1080;

/**
 * expo-image content mode for hero promos: downscale HD art to the frame but never
 * upscale low-res CDN uploads (scale-down = min(none, contain)).
 */
export const HOME_HERO_BANNER_CONTENT_FIT = "scale-down" as const;

export function getHeroBannerLayoutPixelBudget(cssWidth: number): {
  width: number;
  height: number;
} {
  const width = Math.max(1, Math.ceil(cssWidth * PixelRatio.get()));
  const height = Math.max(
    1,
    Math.ceil(width / mobileShellLayout.homeBannerAspectRatio),
  );
  return { width, height };
}

export function resolveHeroBannerRemoteImageSource(imageUri: string) {
  return {
    uri: imageUri,
    width: HOME_HERO_BANNER_DESIGN_WIDTH,
    height: HOME_HERO_BANNER_DESIGN_HEIGHT,
  };
}
