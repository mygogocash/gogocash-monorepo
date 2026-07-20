import type { AccountDataSource } from "@mobile/auth/routeGuard";
import {
  mapOffersToCatalogBrands,
  type CatalogBrand,
} from "@mobile/api/catalogMapper";
import { isOfferListResponse } from "@mobile/api/catalogTypes";
import { resolveFixtureBrandCountries } from "@mobile/i18n/fixtureRegionCountries";
import { filterCatalogItemsByRegion, offerMatchesRegion } from "@mobile/i18n/regionCatalogFilter";
import type { RegionCode } from "@mobile/i18n/regionTypes";
import { DEFAULT_REGION } from "@mobile/i18n/regionTypes";
import type { BrandDirectoryStore } from "@mobile/screens/discovery/discoveryTypes";
import {
  getBrandDirectoryResults,
  getCategoryExploreResults,
  getShopDirectoryResults,
  type WebBrandDirectorySort,
  type WebCategoryExploreSort,
  type WebShopDirectorySort,
  type WebShopType,
} from "@mobile/design/webDesignParity";

const GRAB_COUPON_LABEL = "Grab Coupon";

function getCashbackValue(cashback: string) {
  return Number.parseFloat(cashback.replace("%", "")) || 0;
}

export function mapCatalogBrandsToDirectoryStores(
  brands: readonly CatalogBrand[],
): BrandDirectoryStore[] {
  return brands.map((brand, index) => ({
    addedAt: "",
    brand: brand.name,
    cashback: brand.cashback,
    category: brand.category,
    href: brand.href,
    id: brand.id,
    label: GRAB_COUPON_LABEL,
    logoUri: brand.logo ?? "",
    popularity: index + 1,
    position: index + 1,
    showGrabCoupon: brand.showGrabCoupon,
    shopType: "normal" as const,
    tint: brand.tint,
  }));
}

export function filterDirectoryStores<T extends BrandDirectoryStore>({
  category = "All",
  query = "",
  sortBy = "highest_cashback",
  stores,
}: {
  category?: string;
  query?: string;
  sortBy?: WebBrandDirectorySort | WebShopDirectorySort | string;
  stores: readonly T[];
}): T[] {
  const normalizedCategory = category.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  const activeCategory = normalizedCategory && normalizedCategory !== "all";

  return [...stores]
    .filter((store) => {
      const matchesCategory =
        !activeCategory || store.category.toLowerCase() === normalizedCategory;
      const matchesQuery =
        !normalizedQuery ||
        [store.brand, store.cashback, store.category, store.label].some((value) =>
          value.toLowerCase().includes(normalizedQuery)
        );

      return matchesCategory && matchesQuery;
    })
    .sort((a, b) => {
      if (sortBy === "popular") {
        return a.popularity - b.popularity || a.position - b.position;
      }

      if (sortBy === "newest") {
        return b.addedAt.localeCompare(a.addedAt) || a.position - b.position;
      }

      const cashbackDifference =
        sortBy === "lowest_cashback"
          ? getCashbackValue(a.cashback) - getCashbackValue(b.cashback)
          : getCashbackValue(b.cashback) - getCashbackValue(a.cashback);

      return cashbackDifference || a.position - b.position;
    });
}

export function filterShopDirectoryStores({
  category = "All",
  query = "",
  shopType = "all",
  sortBy = "highest_cashback",
  stores,
}: {
  category?: string;
  query?: string;
  shopType?: WebShopType | string;
  sortBy?: WebShopDirectorySort | string;
  stores: readonly BrandDirectoryStore[];
}): BrandDirectoryStore[] {
  const normalizedShopType = shopType.trim().toLowerCase();
  const filtered = filterDirectoryStores({ category, query, sortBy, stores });

  if (!normalizedShopType || normalizedShopType === "all") {
    return filtered;
  }

  return filtered.filter((store) => {
    const storeShopType = "shopType" in store ? String(store.shopType).toLowerCase() : "normal";
    return storeShopType === normalizedShopType;
  });
}

export function filterDirectoryStoresByRegion<T extends { brand: string }>(
  stores: readonly T[],
  regionCode: RegionCode,
): T[] {
  return stores.filter((store) =>
    offerMatchesRegion(resolveFixtureBrandCountries(store.brand), regionCode),
  );
}

export function resolveLiveDirectoryStores(
  source: AccountDataSource,
  data: unknown,
  fallback: readonly BrandDirectoryStore[],
  regionCode: RegionCode = DEFAULT_REGION,
): readonly BrandDirectoryStore[] {
  if (source === "backend" && isOfferListResponse(data)) {
    const brands = filterCatalogItemsByRegion(mapOffersToCatalogBrands(data), regionCode);
    return mapCatalogBrandsToDirectoryStores(brands);
  }

  return filterDirectoryStoresByRegion(fallback, regionCode);
}

export function getFixtureBrandDirectoryResults(args: {
  category?: string;
  query?: string;
  regionCode?: RegionCode;
  sortBy?: WebBrandDirectorySort | string;
}) {
  const regionCode = args.regionCode ?? DEFAULT_REGION;
  return filterDirectoryStoresByRegion(getBrandDirectoryResults(args), regionCode);
}

export function getFixtureShopDirectoryResults(args: {
  category?: string;
  query?: string;
  regionCode?: RegionCode;
  shopType?: WebShopType | string;
  sortBy?: WebShopDirectorySort | string;
}) {
  const regionCode = args.regionCode ?? DEFAULT_REGION;
  return filterDirectoryStoresByRegion(getShopDirectoryResults(args), regionCode);
}

export type CategoryListItem = {
  _id?: string;
  name?: string;
  /** Admin/API built-in key from Policy Management (`CATEGORY_ICON_KEYS`). */
  icon_key?: string;
  /** Optional custom uploaded icon (category.image). */
  image?: string;
};

export type CategoryListPayload = {
  data?: CategoryListItem[];
};

/**
 * `GET /offer/get-category/list` returns a bare array of category docs.
 * Some callers historically wrap as `{ data: [...] }` — accept both.
 */
export function normalizeCategoryListItems(
  payload: CategoryListPayload | CategoryListItem[] | null | undefined,
): CategoryListItem[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload?.data) ? payload.data : [];
}

export function mapBackendCategoryList(
  payload: CategoryListPayload | CategoryListItem[] | null | undefined,
): string[] {
  const names = normalizeCategoryListItems(payload)
    .map((item) => item.name?.trim())
    .filter((name): name is string => Boolean(name));

  return ["All", ...names];
}

/** name → icon_key for categories that have an admin-chosen key. */
export function mapBackendCategoryIconKeys(
  payload: CategoryListPayload | CategoryListItem[] | null | undefined,
): Readonly<Record<string, string>> {
  const map: Record<string, string> = {};

  for (const item of normalizeCategoryListItems(payload)) {
    const name = item.name?.trim();
    const iconKey = item.icon_key?.trim();
    if (name && iconKey) {
      map[name] = iconKey;
    }
  }

  return map;
}

/** name → custom image URL for categories that have an uploaded icon. */
export function mapBackendCategoryIconImages(
  payload: CategoryListPayload | CategoryListItem[] | null | undefined,
): Readonly<Record<string, string>> {
  const map: Record<string, string> = {};

  for (const item of normalizeCategoryListItems(payload)) {
    const name = item.name?.trim();
    const image = item.image?.trim();
    if (name && image) {
      map[name] = image;
    }
  }

  return map;
}

export function resolveCategoryList(
  source: AccountDataSource,
  data: unknown,
  fallback: readonly string[],
): readonly string[] {
  if (source === "backend" && data != null && typeof data === "object") {
    if (Array.isArray(data) || "data" in data) {
      return mapBackendCategoryList(data as CategoryListPayload | CategoryListItem[]);
    }
  }

  return fallback;
}

export function resolveCategoryIconKeys(
  source: AccountDataSource,
  data: unknown,
  fallback: Readonly<Record<string, string>> = {},
): Readonly<Record<string, string>> {
  if (source === "backend" && data != null && typeof data === "object") {
    if (Array.isArray(data) || "data" in data) {
      return mapBackendCategoryIconKeys(data as CategoryListPayload | CategoryListItem[]);
    }
  }

  return fallback;
}

export function resolveCategoryIconImages(
  source: AccountDataSource,
  data: unknown,
  fallback: Readonly<Record<string, string>> = {},
): Readonly<Record<string, string>> {
  if (source === "backend" && data != null && typeof data === "object") {
    if (Array.isArray(data) || "data" in data) {
      return mapBackendCategoryIconImages(
        data as CategoryListPayload | CategoryListItem[],
      );
    }
  }

  return fallback;
}

export type CategoryDirectoryCard = {
  href: string;
  imageAsset: string;
  title: string;
};

export function mapBackendCategoryDirectoryCards(
  categories: readonly string[],
): CategoryDirectoryCard[] {
  return categories
    .filter((title) => title !== "All")
    .map((title) => ({
      href: `/category/${encodeURIComponent(title)}`,
      imageAsset: "popular-dinner",
      title,
    }));
}

export function resolveCategoryDirectoryCards(
  source: AccountDataSource,
  data: unknown,
  fallback: readonly CategoryDirectoryCard[],
): readonly CategoryDirectoryCard[] {
  if (source === "backend" && data != null && typeof data === "object") {
    if (Array.isArray(data) || "data" in data) {
      return mapBackendCategoryDirectoryCards(
        mapBackendCategoryList(data as CategoryListPayload | CategoryListItem[]),
      );
    }
  }

  return fallback;
}

export type CategoryExploreStore = {
  addedAt?: string;
  brand: string;
  cashback: string;
  href?: string;
  logoUri: string;
  tint: string;
};

export function mapDirectoryStoresToCategoryExplore(
  stores: readonly BrandDirectoryStore[],
): CategoryExploreStore[] {
  return stores.map((store) => ({
    addedAt: store.addedAt,
    brand: store.brand,
    cashback: store.cashback,
    href: store.href,
    logoUri: store.logoUri,
    tint: store.tint,
  }));
}

export function resolveCategoryExploreStores({
  category,
  data,
  query = "",
  regionCode = DEFAULT_REGION,
  sortBy = "highest_cashback",
  source,
}: {
  category: string;
  data: unknown;
  query?: string;
  regionCode?: RegionCode;
  sortBy?: WebBrandDirectorySort | string;
  source: AccountDataSource;
}): CategoryExploreStore[] {
  if (source === "backend" && isOfferListResponse(data)) {
    const stores = mapCatalogBrandsToDirectoryStores(
      filterCatalogItemsByRegion(mapOffersToCatalogBrands(data), regionCode),
    );
    return mapDirectoryStoresToCategoryExplore(
      filterDirectoryStores({
        category,
        query,
        sortBy,
        stores,
      }),
    );
  }

  const exploreSort: WebCategoryExploreSort =
    sortBy === "popular" || sortBy === "newest" || sortBy === "lowest_cashback"
      ? sortBy
      : "highest_cashback";

  return getCategoryExploreResults({ category, query, sortBy: exploreSort }).filter((store) =>
    offerMatchesRegion(resolveFixtureBrandCountries(store.brand), regionCode),
  );
}
