"use client";

import { formatMessageFromEnThCatalog } from "@/lib/i18n/formatMessageFromEnThCatalog";
import type { MonthOverMonthInsight } from "@/lib/quest/gogoquestInsights";
import { formatNumber } from "@/lib/utils";

type NonNullInsight = Exclude<MonthOverMonthInsight, null>;

type Props = {
  locale: string;
  insight: NonNullInsight;
  activeMonthsInWindow: number;
  formatMonthYear: (monthKey: string, locale: string) => string;
};

/**
 * Month-over-month insight copy is formatted from bundled `en.json` / `th.json` via ICU — not
 * `next-intl`'s `t()`, so Turbopack/HMR cannot drop these flat keys from the provider `messages`.
 */
export function GogoquestHistoryInsightSection({
  locale,
  insight,
  activeMonthsInWindow,
  formatMonthYear: fmtMonth,
}: Props) {
  const body = (() => {
    switch (insight.kind) {
      case "first_month":
        return formatMessageFromEnThCatalog("gogoquestHistoryInsightFirstMonth", locale, {
          month: fmtMonth(insight.month, locale),
          points: formatNumber(insight.points, 0),
        });
      case "flat":
        return formatMessageFromEnThCatalog("gogoquestHistoryInsightFlat", locale, {
          recentMonth: fmtMonth(insight.recentMonth, locale),
          olderMonth: fmtMonth(insight.olderMonth, locale),
          points: formatNumber(insight.points, 0),
        });
      case "up":
        return formatMessageFromEnThCatalog("gogoquestHistoryInsightUp", locale, {
          percent: insight.percent,
          recentMonth: fmtMonth(insight.recentMonth, locale),
          olderMonth: fmtMonth(insight.olderMonth, locale),
        });
      case "down":
        return formatMessageFromEnThCatalog("gogoquestHistoryInsightDown", locale, {
          percent: insight.percent,
          recentMonth: fmtMonth(insight.recentMonth, locale),
          olderMonth: fmtMonth(insight.olderMonth, locale),
        });
      default:
        return null;
    }
  })();

  return (
    <section
      className="rounded-2xl border border-[#d8f8ef] bg-[#f6fdfb] px-5 py-4 md:px-6 md:py-5"
      aria-labelledby="gogoquest-insight-heading"
    >
      <h2 id="gogoquest-insight-heading" className="text-[15px] font-semibold text-[#103522]">
        {formatMessageFromEnThCatalog("gogoquestHistoryInsightTitle", locale, {})}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-[#4a5c54]">{body}</p>
      {activeMonthsInWindow > 0 ? (
        <p className="mt-3 text-[14px] text-[#87948b]">
          {formatMessageFromEnThCatalog("gogoquestHistoryActivityStrip", locale, {
            active: activeMonthsInWindow,
            total: 3,
          })}
        </p>
      ) : null}
    </section>
  );
}
