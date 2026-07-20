/**
 * Canonical built-in category icon allow-list (Policy Management).
 *
 * Shared by admin (gallery + mock), the customer app (Phosphor map), and the
 * API (DTO `@IsIn` / schema enum). The API keeps a runtime copy in
 * `apps/api/src/offer/schemas/category.schema.ts` because its SWC-built
 * runtime cannot load this source package — parity is enforced by
 * `apps/api/src/offer/category-icon-keys.contract-parity.spec.ts`.
 */
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

/** Human labels for the admin visual icon gallery. */
export const CATEGORY_ICON_LABELS = {
  shopping: "Shopping",
  travel: "Travel",
  food: "Food",
  finance: "Finance",
  entertainment: "Entertainment",
  electronics: "Electronics",
  fashion: "Fashion",
  beauty: "Beauty",
  health: "Health",
  home: "Home",
  education: "Education",
  gift: "Gifting",
  sports: "Sports",
  pets: "Pets",
  baby: "Baby",
  auto: "Auto",
  services: "Services",
  default: "Default",
} as const satisfies Record<CategoryIconKey, string>;

export const CATEGORY_ICON_OPTIONS: ReadonlyArray<{
  key: CategoryIconKey;
  label: string;
}> = CATEGORY_ICON_KEYS.map((key) => ({
  key,
  label: CATEGORY_ICON_LABELS[key],
}));

export function isCategoryIconKey(value: unknown): value is CategoryIconKey {
  return (
    typeof value === "string" &&
    (CATEGORY_ICON_KEYS as readonly string[]).includes(value)
  );
}
