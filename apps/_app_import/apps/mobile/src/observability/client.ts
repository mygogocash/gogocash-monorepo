import * as Sentry from "@sentry/react-native";

import { getMobileEnv } from "@mobile/config/env";

let sentryStarted = false;

const sensitiveTelemetryKeys = [
  "access_token",
  "authorization",
  "bankAccount",
  "callbackUrl",
  "email",
  "mobile",
  "phone",
  "token",
  "wallet",
];

export function getObservabilityConfig() {
  const env = getMobileEnv();

  return {
    posthogHost: env.posthogHost,
    posthogKey: env.posthogKey,
    sentryDsn: env.sentryDsn,
    appEnv: env.appEnv,
  };
}

export function initObservability() {
  const env = getObservabilityConfig();

  if (!sentryStarted && env.sentryDsn) {
    Sentry.init({
      beforeSend: redactTelemetryEvent,
      dsn: env.sentryDsn,
      environment: env.appEnv,
    });
    sentryStarted = true;
  }
}

export function resetObservabilityIdentity() {
  Sentry.setUser(null);
}

export function redactTelemetryEvent(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  return redactTelemetryValue(event) as Sentry.ErrorEvent;
}

function redactTelemetryValue(value: unknown, key = ""): unknown {
  if (isSensitiveTelemetryKey(key)) {
    return "[Filtered]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactTelemetryValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactTelemetryValue(entryValue, entryKey),
      ])
    );
  }

  if (typeof value === "string") {
    return redactTelemetryString(value);
  }

  return value;
}

function isSensitiveTelemetryKey(key: string): boolean {
  const normalizedKey = key.toLowerCase();

  return sensitiveTelemetryKeys.some((sensitiveKey) => normalizedKey.includes(sensitiveKey));
}

function redactTelemetryString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [Filtered]")
    .replace(/\b(?:access_token|token)=[^&\s]+/gi, (match) => `${match.split("=")[0]}=[Filtered]`)
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[Filtered]");
}
