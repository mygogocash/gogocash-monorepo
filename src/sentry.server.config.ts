import * as Sentry from "@sentry/nextjs";
import { env } from "@/env";

const dsn = env.SENTRY_DSN ?? env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  sendDefaultPii: true,
  tracesSampleRate: dsn ? (process.env.NODE_ENV === "development" ? 1 : 0.1) : 0,
  includeLocalVariables: true,
  enableLogs: Boolean(dsn),
});
