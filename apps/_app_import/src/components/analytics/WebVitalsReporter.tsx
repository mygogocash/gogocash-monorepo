"use client";

import { useReportWebVitals } from "next/web-vitals";
import * as Sentry from "@sentry/nextjs";
import { env } from "@/env";
import { devLogDebug } from "@/lib/clientDevLog";

/**
 * Phase 0 — Core Web Vitals: dev console + Sentry metrics when DSN is set.
 */
const webVitalsDebug =
  process.env.NODE_ENV === "development" &&
  (process.env.NEXT_PUBLIC_WEB_VITALS_DEBUG === "true" ||
    process.env.NEXT_PUBLIC_WEB_VITALS_DEBUG === "1");

export default function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (webVitalsDebug) {
      devLogDebug("[web-vitals]", metric.name, metric.value, metric.rating);
    }

    if (!env.NEXT_PUBLIC_SENTRY_DSN) return;

    const name = metric.name.toLowerCase();
    Sentry.metrics.distribution(`web_vitals.${name}`, metric.value, {
      ...(metric.name === "CLS" ? {} : { unit: "millisecond" as const }),
      attributes: {
        rating: String(metric.rating ?? ""),
        id: metric.id,
      },
    });

    Sentry.addBreadcrumb({
      category: "web-vitals",
      message: metric.name,
      level: "info",
      data: { value: metric.value, rating: metric.rating, id: metric.id },
    });
  });

  return null;
}
