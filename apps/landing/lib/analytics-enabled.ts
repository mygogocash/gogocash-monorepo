import { isMarketingAnalyticsEnabled } from "@/lib/app-config";

/**
 * Whether to initialize Firebase Analytics (`getAnalytics`) and log marketing events.
 *
 * - Default: **off** in `next dev` (`NODE_ENV === "development"`), **on** in production builds.
 * - `NEXT_PUBLIC_ANALYTICS_ENABLED=true` — force on (e.g. test GA from dev).
 * - `NEXT_PUBLIC_ANALYTICS_ENABLED=false` — force off (e.g. `next start` on localhost).
 */
export function shouldLoadMarketingAnalyticsScripts(): boolean {
  return isMarketingAnalyticsEnabled();
}
