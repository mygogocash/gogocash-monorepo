// Category → glyph mapping (web + native).
// Built-in allow-list lives in @gogocash/contracts; this module maps keys and
// labels to Phosphor glyphs for customer chrome.
import {
  CATEGORY_ICON_KEYS,
  isCategoryIconKey,
  type CategoryIconKey,
} from "@gogocash/contracts";
import {
  Baby,
  BookOpen,
  Car,
  CircleEllipsis,
  Cloud,
  CreditCard,
  Gift,
  Headphones,
  Heartbeat,
  Home,
  type IconComponent,
  List,
  Monitor,
  PawPrint,
  Plane,
  Shirt,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Trophy,
  Utensils,
} from "@mobile/theme/icons";

export { CATEGORY_ICON_KEYS, type CategoryIconKey } from "@gogocash/contracts";

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
  pets: PawPrint,
  baby: Baby,
  auto: Car,
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
  return isCategoryIconKey(iconKey) ? iconKey : null;
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
