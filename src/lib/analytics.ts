"use client";

import { DataOffer, TypeCommissions } from "@/interfaces/offer";
import { env } from "@/env";
import { devLogInfo } from "@/lib/clientDevLog";
import { getPostHogClient, isPostHogEnabled } from "@/lib/posthog";

declare global {
  interface Window {
    dataLayer: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

const ANALYTICS_ENABLED = env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";
const ANALYTICS_DEBUG = env.NEXT_PUBLIC_ANALYTICS_DEBUG === "true";
const SITE_NAME = "GoGoCash";

export type AppLocale = "en" | "th";
export type LoginState = "authenticated" | "guest";

export type TrackableMerchant = Pick<
  Partial<DataOffer>,
  | "_id"
  | "offer_id"
  | "merchant_id"
  | "offer_name"
  | "offer_name_display"
  | "categories"
  | "currency"
  | "commission_store"
  | "commissions"
  | "extra_point"
  | "tracking_type"
  | "preview_url"
>;

export interface MerchantSelectionContext {
  listId: string;
  listName: string;
  position?: number;
  source?: string;
}

type AnalyticsParams = Record<string, unknown>;

const getLanguageLabel = (locale: AppLocale) => (locale === "th" ? "thai" : "english");

const getCurrentPathname = () => {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
};

const getCurrentSearch = () => {
  if (typeof window === "undefined") return "";
  return window.location.search || "";
};

const buildLocation = (pathname: string, search: string) => {
  if (typeof window === "undefined") return pathname;
  return `${window.location.origin}${pathname}${search}`;
};

const getHostname = (value?: string) => {
  if (!value) return undefined;

  try {
    return new URL(
      value,
      typeof window !== "undefined" ? window.location.origin : "https://app.gogocash.co"
    ).hostname;
  } catch {
    return undefined;
  }
};

export const getLocaleFromPathname = (pathname: string): AppLocale => {
  const [firstSegment] = pathname.split("/").filter(Boolean);
  return firstSegment === "th" ? "th" : "en";
};

export const getPageTypeFromPathname = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const routeSegments = segments[0] === "en" || segments[0] === "th" ? segments.slice(1) : segments;

  if (routeSegments.length === 0) return "home";
  if (routeSegments[0] === "shop" && routeSegments[1]) return "merchant_detail";
  if (routeSegments[0] === "shop") return "merchant_directory";
  if (routeSegments[0] === "category" && routeSegments[1]) return "merchant_category_detail";
  if (routeSegments[0] === "category") return "merchant_category_index";
  if (routeSegments[0] === "quest") return "merchant_quest";
  if (routeSegments[0] === "login") return "login";
  if (routeSegments[0] === "register") return "register";
  if (routeSegments[0] === "auth" && routeSegments[1] === "callback") return "auth_callback";
  if (routeSegments[0] === "profile") return "profile";
  if (routeSegments[0] === "favorite") return "favorite";
  if (routeSegments[0] === "wallet") return "wallet";
  if (routeSegments[0] === "withdraw") return "withdraw";
  if (routeSegments[0] === "referral") return "referral";
  if (routeSegments[0] === "subscription") return "subscription";
  if (routeSegments[0] === "membership") return "membership";

  return routeSegments[0];
};

export const getCashbackValue = (merchant?: TrackableMerchant) => {
  if (!merchant) return undefined;
  if (typeof merchant.commission_store === "number") {
    return Number(merchant.commission_store.toFixed(1));
  }

  const firstPositiveCommission = (merchant.commissions || [])
    .map((commission: TypeCommissions) => Object.values(commission)[0])
    .find((value) => Number.parseFloat(String(value)) > 0);

  if (!firstPositiveCommission) return undefined;

  const cashbackValue = Number.parseFloat(String(firstPositiveCommission));
  return Number.isFinite(cashbackValue) ? Number(cashbackValue.toFixed(1)) : undefined;
};

const mapMerchantToItem = (
  merchant: TrackableMerchant,
  {
    listId,
    listName,
    index,
    locale,
  }: {
    listId?: string;
    listName?: string;
    index?: number;
    locale: AppLocale;
  }
) => {
  const itemName = merchant.offer_name_display?.trim() || merchant.offer_name || "Unknown merchant";
  const cashbackValue = getCashbackValue(merchant);

  return {
    item_id: String(merchant.offer_id || merchant._id || merchant.merchant_id || itemName),
    item_name: itemName,
    item_brand: itemName,
    item_category: merchant.categories || "uncategorized",
    item_category2: merchant.tracking_type || undefined,
    item_list_id: listId,
    item_list_name: listName,
    index,
    affiliation: SITE_NAME,
    currency: merchant.currency || undefined,
    merchant_id: merchant.merchant_id ? String(merchant.merchant_id) : undefined,
    offer_id: merchant.offer_id ? String(merchant.offer_id) : undefined,
    cashback_rate: cashbackValue,
    cashback_rate_label: cashbackValue !== undefined ? `${cashbackValue.toFixed(1)}%` : undefined,
    extra_point: merchant.extra_point ?? undefined,
    locale,
    language: getLanguageLabel(locale),
  };
};

const compactObject = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => compactObject(item)).filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entryValue]) => [key, compactObject(entryValue)] as const)
      .filter(([, entryValue]) => entryValue !== undefined);

    return entries.length > 0 ? Object.fromEntries(entries) : undefined;
  }

  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return value;
};

const buildCommonParams = ({
  pathname = getCurrentPathname(),
  search = getCurrentSearch(),
  loginState,
}: {
  pathname?: string;
  search?: string;
  loginState?: LoginState;
}) => {
  const locale = getLocaleFromPathname(pathname);

  return {
    locale,
    language: getLanguageLabel(locale),
    page_type: getPageTypeFromPathname(pathname),
    page_path: pathname,
    page_location: buildLocation(pathname, search),
    site_name: SITE_NAME,
    login_state: loginState,
  };
};

const dispatchAnalyticsEvent = (
  eventName: string,
  params: AnalyticsParams,
  options?: { resetEcommerce?: boolean }
) => {
  if (!ANALYTICS_ENABLED || typeof window === "undefined") return;

  const normalizedParams = compactObject(params) as AnalyticsParams | undefined;
  const eventPayload = {
    event: eventName,
    ...(normalizedParams || {}),
  };

  window.dataLayer = window.dataLayer || [];

  if (options?.resetEcommerce) {
    window.dataLayer.push({ ecommerce: null });
  }

  window.dataLayer.push(eventPayload);
  window.gtag?.("event", eventName, normalizedParams || {});

  if (isPostHogEnabled()) {
    try {
      getPostHogClient()?.capture?.(eventName, normalizedParams || {});
    } catch {
      // Ignore PostHog client errors so GTM/GA4 remain unaffected.
    }
  }

  if (ANALYTICS_DEBUG) {
    devLogInfo("[analytics]", eventName, normalizedParams || {});
  }
};

export const trackPageView = ({
  pathname,
  search = "",
  loginState,
}: {
  pathname: string;
  search?: string;
  loginState?: LoginState;
}) => {
  dispatchAnalyticsEvent("page_view", {
    ...buildCommonParams({ pathname, search, loginState }),
    page_title: typeof document !== "undefined" ? document.title || undefined : undefined,
    page_referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
    query_string: search.replace(/^\?/, "") || undefined,
  });
};

export const trackMerchantListView = ({
  items,
  listId,
  listName,
  pathname,
  search,
  category,
  source,
  loginState,
}: {
  items: TrackableMerchant[];
  listId: string;
  listName: string;
  pathname?: string;
  search?: string;
  category?: string;
  source?: string;
  loginState?: LoginState;
}) => {
  const resolvedPathname = pathname || getCurrentPathname();
  const resolvedSearch = search || getCurrentSearch();
  const locale = getLocaleFromPathname(resolvedPathname);

  dispatchAnalyticsEvent(
    "view_item_list",
    {
      ...buildCommonParams({
        pathname: resolvedPathname,
        search: resolvedSearch,
        loginState,
      }),
      item_list_id: listId,
      item_list_name: listName,
      merchant_category: category,
      source_section: source,
      results_count: items.length,
      items: items.map((merchant, index) =>
        mapMerchantToItem(merchant, {
          listId,
          listName,
          index: index + 1,
          locale,
        })
      ),
    },
    { resetEcommerce: true }
  );
};

export const trackMerchantSelect = ({
  merchant,
  listId,
  listName,
  position,
  source,
}: {
  merchant: TrackableMerchant;
} & MerchantSelectionContext) => {
  const pathname = getCurrentPathname();
  const search = getCurrentSearch();
  const locale = getLocaleFromPathname(pathname);

  dispatchAnalyticsEvent(
    "select_item",
    {
      ...buildCommonParams({ pathname, search }),
      item_list_id: listId,
      item_list_name: listName,
      source_section: source,
      selected_position: position,
      items: [
        mapMerchantToItem(merchant, {
          listId,
          listName,
          index: position,
          locale,
        }),
      ],
    },
    { resetEcommerce: true }
  );
};

export const trackMerchantDetailView = ({
  merchant,
  sourceList,
}: {
  merchant: TrackableMerchant;
  sourceList?: string;
}) => {
  const pathname = getCurrentPathname();
  const search = getCurrentSearch();
  const locale = getLocaleFromPathname(pathname);

  dispatchAnalyticsEvent(
    "view_item",
    {
      ...buildCommonParams({ pathname, search }),
      source_list: sourceList,
      items: [
        mapMerchantToItem(merchant, {
          listName: sourceList,
          locale,
        }),
      ],
    },
    { resetEcommerce: true }
  );
};

export const trackMerchantSearch = ({
  searchTerm,
  resultsCount,
  listId,
  listName,
  category,
}: {
  searchTerm: string;
  resultsCount: number;
  listId: string;
  listName: string;
  category?: string;
}) => {
  const pathname = getCurrentPathname();
  const search = getCurrentSearch();

  dispatchAnalyticsEvent("search", {
    ...buildCommonParams({ pathname, search }),
    search_term: searchTerm,
    results_count: resultsCount,
    item_list_id: listId,
    item_list_name: listName,
    merchant_category: category,
  });
};

export const trackCategorySelect = ({
  categoryName,
  source,
}: {
  categoryName: string;
  source: string;
}) => {
  const pathname = getCurrentPathname();
  const search = getCurrentSearch();

  dispatchAnalyticsEvent("merchant_category_select", {
    ...buildCommonParams({ pathname, search }),
    merchant_category: categoryName,
    source_section: source,
  });
};

export const trackFavoriteToggle = ({
  merchant,
  action,
  location,
}: {
  merchant: TrackableMerchant;
  action: "add" | "remove";
  location: string;
}) => {
  const pathname = getCurrentPathname();
  const search = getCurrentSearch();
  const locale = getLocaleFromPathname(pathname);
  const eventName = action === "add" ? "add_to_wishlist" : "remove_from_wishlist";

  dispatchAnalyticsEvent(
    eventName,
    {
      ...buildCommonParams({ pathname, search }),
      wishlist_location: location,
      items: [
        mapMerchantToItem(merchant, {
          locale,
        }),
      ],
    },
    { resetEcommerce: true }
  );
};

export const trackMerchantRedirect = ({
  merchant,
  status,
}: {
  merchant: TrackableMerchant;
  status: "attempt" | "success" | "error" | "login_required";
}) => {
  const pathname = getCurrentPathname();
  const search = getCurrentSearch();
  const locale = getLocaleFromPathname(pathname);

  dispatchAnalyticsEvent(`merchant_redirect_${status}`, {
    ...buildCommonParams({ pathname, search }),
    destination_host: getHostname(merchant.preview_url),
    items: [
      mapMerchantToItem(merchant, {
        locale,
      }),
    ],
  });
};

export const trackCouponInteraction = ({
  merchant,
  action,
  couponCode,
}: {
  merchant: TrackableMerchant;
  action: "copy" | "terms_click";
  couponCode?: string;
}) => {
  const pathname = getCurrentPathname();
  const search = getCurrentSearch();
  const locale = getLocaleFromPathname(pathname);

  dispatchAnalyticsEvent(`merchant_coupon_${action}`, {
    ...buildCommonParams({ pathname, search }),
    coupon_code: couponCode,
    items: [
      mapMerchantToItem(merchant, {
        locale,
      }),
    ],
  });
};

export const trackPromotionSelect = ({
  promotionId,
  promotionName,
  creativeSlot,
  destination,
}: {
  promotionId: string;
  promotionName: string;
  creativeSlot: string;
  destination?: string;
}) => {
  const pathname = getCurrentPathname();
  const search = getCurrentSearch();

  dispatchAnalyticsEvent("select_promotion", {
    ...buildCommonParams({ pathname, search }),
    promotion_id: promotionId,
    promotion_name: promotionName,
    creative_slot: creativeSlot,
    destination,
  });
};

export const trackCompleteRegistration = ({
  authProvider,
  source,
}: {
  authProvider?: string;
  source?: string;
} = {}) => {
  const pathname = getCurrentPathname();
  const search = getCurrentSearch();

  dispatchAnalyticsEvent("complete_registration", {
    ...buildCommonParams({
      pathname,
      search,
      loginState: "authenticated",
    }),
    auth_provider: authProvider,
    source_section: source,
  });
};

export const trackQuestStarted = ({
  merchant,
  source,
}: {
  merchant?: TrackableMerchant;
  source?: string;
} = {}) => {
  const pathname = getCurrentPathname();
  const search = getCurrentSearch();
  const locale = getLocaleFromPathname(pathname);

  dispatchAnalyticsEvent("quest_started", {
    ...buildCommonParams({ pathname, search }),
    source_section: source,
    items: merchant
      ? [
          mapMerchantToItem(merchant, {
            locale,
          }),
        ]
      : undefined,
  });
};

export const trackCashbackWithdrawSuccess = ({
  amount,
  currency,
  method,
  source,
}: {
  amount: number;
  currency: string;
  method: string;
  source?: string;
}) => {
  const pathname = getCurrentPathname();
  const search = getCurrentSearch();

  dispatchAnalyticsEvent("cashback_withdraw_success", {
    ...buildCommonParams({
      pathname,
      search,
      loginState: "authenticated",
    }),
    value: amount,
    currency,
    withdraw_method: method,
    source_section: source,
    cashback_type: "mycashback",
  });
};
