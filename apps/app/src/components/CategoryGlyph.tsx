import { Image } from "expo-image";
import { View } from "react-native";

import { getCategoryIcon } from "@mobile/theme/categoryIcons";
import { typography } from "@mobile/theme/tokens";

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
    return (
      <View style={{ height: size, width: size, overflow: "hidden", borderRadius: size / 2 }}>
        <Image
          accessibilityIgnoresInvertColors
          contentFit="cover"
          source={{ uri: trimmed }}
          style={{ height: size, width: size }}
        />
      </View>
    );
  }

  const Icon = getCategoryIcon(category, iconKey);
  return <Icon color={color} size={size} strokeWidth={typography.iconStrokeWidth} />;
}
