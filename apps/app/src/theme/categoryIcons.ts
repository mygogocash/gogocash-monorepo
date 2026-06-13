// Single source of truth for category → glyph mapping (web + native).
// Mirrors the web ShopExploreMenuTapIcon per-category icons using the shared
// phosphor icon adapter, so directory asides and category screens render a
// distinct icon per category instead of a generic filter glyph.
//
// NOTE: CustomerCategoryDetailScreen currently keeps an equivalent local map;
// it should be migrated to import from here so there is one definition.
import {
  BookOpen,
  CircleEllipsis,
  Cloud,
  CreditCard,
  Gift,
  Home,
  type IconComponent,
  List,
  Monitor,
  Plane,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  Utensils,
} from "@mobile/theme/icons";

/** Category label → icon. Keys match the staging category taxonomy. */
export const categoryIcons: Record<string, IconComponent> = {
  All: List,
  "Digital Services": Cloud,
  Education: BookOpen,
  Electronics: Monitor,
  Fashion: Shirt,
  Finance: CreditCard,
  "Food & Grocery": Utensils,
  "Gifting & Crafts": Gift,
  "Health & Beauty": Sparkles,
  "Home & Living": Home,
  Marketplace: Store,
  Travel: Plane,
  "Top-up / Recharge": ShoppingBag,
  Others: CircleEllipsis,
};

/** Resolve a category's icon, falling back to a storefront glyph. */
export function getCategoryIcon(category: string): IconComponent {
  return categoryIcons[category] ?? Store;
}
