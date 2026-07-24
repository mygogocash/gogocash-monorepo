// #586 REQ-DM-4 — map an Involve category string to the app's CATEGORY_ICON_KEYS
// namespace. Unknown / empty → 'default'. `/shopeextra/all` rows carry no
// category (the caller passes null → 'default' is NOT applied; see mapCategoryKey).
const CATEGORY_KEY_MAP: Readonly<Record<string, string>> = {
  Electronics: 'electronics',
  Fashion: 'fashion',
  Finance: 'finance',
  'Health & Beauty': 'beauty',
  Lifestyle: 'home',
  Marketplace: 'shopping',
  Other: 'default',
  Services: 'services',
  Travel: 'travel',
};

const DEFAULT_CATEGORY_KEY = 'default';

/**
 * Resolve a category string to an icon key. Returns `null` for a null/absent
 * category (shops have none — the badge falls back to shopType); a present but
 * unmapped category resolves to `'default'`.
 */
export function mapCategoryKey(
  category: string | null | undefined,
): string | null {
  if (category == null) return null;
  const trimmed = category.trim();
  if (!trimmed) return null;
  return CATEGORY_KEY_MAP[trimmed] ?? DEFAULT_CATEGORY_KEY;
}
