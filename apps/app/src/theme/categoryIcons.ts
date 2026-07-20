// Single source of truth for category → glyph mapping (web + native).
// Mirrors the web ShopExploreMenuTapIcon per-category icons using the shared
// phosphor icon adapter, so directory asides and category screens render a
// distinct icon per category instead of a generic filter glyph.
//
// Phase C: also accept admin/API `icon_key` (Policy Management built-in set) so
// when callers pass a key, customer chrome matches the admin-chosen icon.
import {
  BookOpen,
  CircleEllipsis,
  Cloud,
  CreditCard,
  Gift,
  Headphones,
  Heart,
  Heartbeat,
  Home,
  type IconComponent,
  List,
  Monitor,
  Plane,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Trophy,
  Utensils,
} from "@mobile/theme/icons";

/** Keep in sync with admin CategoryIcon.tsx + API category.schema.ts. */
export const CATEGORY_ICON_KEYS = [
  "shopping",
  "travel",
  "food",
  "finance",
  "entertainment",
  "electronics",
  "fashion",
  "beauty",
  "health",
  "home",
  "education",
  "gift",
  "sports",
  "pets",
  "baby",
  "auto",
  "services",
  "default",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

/** Admin/API icon_key → Phosphor glyph. */
export const categoryIconsByKey: Record<CategoryIconKey, IconComponent> = {
  shopping: ShoppingBag,
  travel: Plane,
  food: Utensils,
  finance: CreditCard,
  entertainment: Headphones,
  electronics: Monitor,
  fashion: Shirt,
  beauty: Sparkles,
  health: Heartbeat,
  home: Home,
  education: BookOpen,
  gift: Gift,
  sports: Trophy,
  pets: Heart,
  baby: Gift,
  auto: ShoppingCart,
  services: Cloud,
  default: Tag,
};

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

export function resolveCategoryIconKey(
  iconKey: unknown,
): CategoryIconKey | null {
  return typeof iconKey === "string" &&
    (CATEGORY_ICON_KEYS as readonly string[]).includes(iconKey)
    ? (iconKey as CategoryIconKey)
    : null;
}

/**
 * Resolve a category icon.
 * Prefer admin/API `icon_key` when present; otherwise fall back to label map.
 */
export function getCategoryIcon(
  category: string,
  iconKey?: string | null,
): IconComponent {
  const key = resolveCategoryIconKey(iconKey);
  if (key) {
    return categoryIconsByKey[key];
  }
  return categoryIcons[category] ?? Store;
}
