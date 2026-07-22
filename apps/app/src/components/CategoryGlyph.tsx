import { Image } from "expo-image";
import { View } from "react-native";

import { optimizedImageUrl } from "@mobile/api/optimizedImageUrl";
import { getCategoryIcon } from "@mobile/theme/categoryIcons";
import { typography } from "@mobile/theme/tokens";

/**
 * Category glyphs render tiny (16–22px). Request 3× so they stay crisp at the
 * highest common device pixel ratio while Cloudflare Image Resizing serves a
 * few-KB AVIF instead of the full-size R2 original.
 */
const GLYPH_PIXEL_DENSITY = 3;

type CategoryGlyphProps = {
  category: string;
  iconKey?: string | null;
  /** Optional remote category.image URL — wins over built-in glyph. */
  imageUrl?: string | null;
  color: string;
  size: number;
};

/**
 * Customer category chrome glyph.
 * Prefer a custom uploaded image when present; otherwise built-in icon_key / label map.
 */
export function CategoryGlyph({
  category,
  iconKey,
  imageUrl,
  color,
  size,
}: CategoryGlyphProps) {
  const trimmed = imageUrl?.trim();
  if (trimmed) {
    const uri =
      optimizedImageUrl(trimmed, {
        width: Math.round(size * GLYPH_PIXEL_DENSITY),
      }) ?? trimmed;
    return (
      <View style={{ height: size, width: size, overflow: "hidden", borderRadius: size / 2 }}>
        <Image
          accessibilityIgnoresInvertColors
          contentFit="cover"
          source={{ uri }}
          style={{ height: size, width: size }}
        />
      </View>
    );
  }

  const Icon = getCategoryIcon(category, iconKey);
  return <Icon color={color} size={size} strokeWidth={typography.iconStrokeWidth} />;
}
