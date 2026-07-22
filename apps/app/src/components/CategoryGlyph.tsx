import { getCategoryIcon } from "@mobile/theme/categoryIcons";
import { typography } from "@mobile/theme/tokens";

type CategoryGlyphProps = {
  category: string;
  iconKey?: string | null;
  /**
   * Custom uploaded category images are intentionally NOT rendered for now — the
   * drive-migrated originals were inconsistent (wrong/mismatched art, and each was a
   * multi-MB raw image behind a ~20px chip). Every category now renders the built-in
   * icon_key / label glyph so the whole set reads as a clean, aligned icon system.
   * The prop is kept so callers don't have to change; re-render `imageUrl` here to
   * restore uploaded images.
   */
  imageUrl?: string | null;
  color: string;
  size: number;
};

/**
 * Customer category chrome glyph — always the built-in icon (icon_key, else label map,
 * else the Store fallback). See `imageUrl` above for why uploaded images are disabled.
 */
export function CategoryGlyph({
  category,
  iconKey,
  color,
  size,
}: CategoryGlyphProps) {
  const Icon = getCategoryIcon(category, iconKey);
  return <Icon color={color} size={size} strokeWidth={typography.iconStrokeWidth} />;
}
