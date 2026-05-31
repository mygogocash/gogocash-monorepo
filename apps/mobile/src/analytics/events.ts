// Mobile analytics event vocabulary — mirrors the web app
// (gogocash_app-staging/src/lib/analytics.ts) PostHog/GA4 events EXACTLY: same
// event names and the same snake_case property keys, so cross-platform
// dashboards/funnels stay comparable. The ONE intentional divergence is
// platform: "mobile" in the identify payload (web sends "web").
//
// Only events whose payloads do NOT depend on the parked merchant/offer data
// model (DataOffer/commissions, consumed by the web's mapMerchantToItem) are
// ported here. view_item / select_item / view_item_list stay parked until the
// live-data layer lands, so we never fabricate item shapes.
//
// Helpers are pure and client-agnostic (take a MobileAnalyticsClient) so they are
// unit-testable without a real PostHog instance, and they NEVER throw — analytics
// must not break a user flow (mirrors the web dispatcher's try/catch).

export const ANALYTICS_EVENTS = {
  pageView: "page_view",
  categorySelect: "merchant_category_select",
  selectPromotion: "select_promotion",
  questStarted: "quest_started",
  cashbackWithdrawSuccess: "cashback_withdraw_success",
  completeRegistration: "complete_registration",
} as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

const SITE_NAME = "GoGoCash";

export type LoginState = "authenticated" | "guest";
export type AppLocale = "en" | "th";

export interface MobileAnalyticsClient {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  identify?: (distinctId: string, properties?: Record<string, unknown>) => void;
  reset?: () => void;
}

type AnalyticsProps = Record<string, unknown>;

/** Drop undefined/null/"" keys so payloads match the web compactObject() output. */
function compact(props: AnalyticsProps): AnalyticsProps {
  return Object.fromEntries(
    Object.entries(props).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
}

/** Capture an event, swallowing client errors so analytics never breaks a flow. */
function capture(
  client: MobileAnalyticsClient | null | undefined,
  event: AnalyticsEventName,
  props: AnalyticsProps,
): void {
  if (!client) {
    return;
  }

  try {
    client.capture(event, compact(props));
  } catch {
    // Intentionally swallowed: a telemetry failure must never surface to the user.
  }
}

export function trackPageView(
  client: MobileAnalyticsClient | null | undefined,
  args: { pageType: string; pagePath: string; loginState?: LoginState },
): void {
  capture(client, ANALYTICS_EVENTS.pageView, {
    page_type: args.pageType,
    page_path: args.pagePath,
    login_state: args.loginState,
    site_name: SITE_NAME,
  });
}

export function trackCategorySelect(
  client: MobileAnalyticsClient | null | undefined,
  args: { categoryName: string; source: string },
): void {
  capture(client, ANALYTICS_EVENTS.categorySelect, {
    merchant_category: args.categoryName,
    source_section: args.source,
  });
}

export function trackPromotionSelect(
  client: MobileAnalyticsClient | null | undefined,
  args: { promotionId: string; promotionName: string; creativeSlot: string; destination?: string },
): void {
  capture(client, ANALYTICS_EVENTS.selectPromotion, {
    promotion_id: args.promotionId,
    promotion_name: args.promotionName,
    creative_slot: args.creativeSlot,
    destination: args.destination,
  });
}

export function trackQuestStarted(
  client: MobileAnalyticsClient | null | undefined,
  args: { source?: string },
): void {
  capture(client, ANALYTICS_EVENTS.questStarted, {
    source_section: args.source,
  });
}

export function trackCashbackWithdrawSuccess(
  client: MobileAnalyticsClient | null | undefined,
  args: { amount: number; currency: string; method: string; source?: string },
): void {
  capture(client, ANALYTICS_EVENTS.cashbackWithdrawSuccess, {
    value: args.amount,
    currency: args.currency,
    withdraw_method: args.method,
    source_section: args.source,
    cashback_type: "mycashback",
    login_state: "authenticated",
  });
}

export function trackCompleteRegistration(
  client: MobileAnalyticsClient | null | undefined,
  args: { authProvider?: string; source?: string } = {},
): void {
  capture(client, ANALYTICS_EVENTS.completeRegistration, {
    auth_provider: args.authProvider,
    source_section: args.source,
    login_state: "authenticated",
  });
}

/**
 * Identify the signed-in user — mirrors web PostHogAuthSync's identify payload
 * (region/locale/login_state/auth_flow) but sends platform: "mobile".
 */
export function identifyUser(
  client: MobileAnalyticsClient | null | undefined,
  userId: string,
  args: { region?: string; locale: AppLocale; authFlow?: string },
): void {
  if (!client?.identify) {
    return;
  }

  try {
    client.identify(
      userId,
      compact({
        region: args.region,
        locale: args.locale,
        login_state: "authenticated",
        platform: "mobile",
        auth_flow: args.authFlow,
      }),
    );
  } catch {
    // Swallowed — telemetry must not break auth flow.
  }
}

/** Clear PostHog identity on logout (mirrors web reset()). */
export function resetIdentity(client: MobileAnalyticsClient | null | undefined): void {
  if (!client?.reset) {
    return;
  }

  try {
    client.reset();
  } catch {
    // Swallowed.
  }
}
