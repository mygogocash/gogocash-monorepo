import * as Sentry from "@sentry/nextjs";
import { env } from "@/env";

const dsn = env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  sendDefaultPii: true,
  tracesSampleRate: dsn ? (process.env.NODE_ENV === "development" ? 1 : 0.1) : 0,
  replaysSessionSampleRate: dsn ? 0.1 : 0,
  replaysOnErrorSampleRate: dsn ? 1 : 0,
  enableLogs: Boolean(dsn),
  integrations: dsn ? [Sentry.browserTracingIntegration(), Sentry.replayIntegration()] : [],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
