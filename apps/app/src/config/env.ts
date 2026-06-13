import { envDefaults } from "@mobile/config/mobileAppConfig";
import type { AccountDataSource } from "@mobile/auth/routeGuard";

export type MobileEnv = {
  apiUrl: string;
  appEnv: string;
  accountDataSource: AccountDataSource;
  frontendUrl: string;
  posthogHost: string;
  posthogKey: string;
  sentryDsn: string;
};

export function getMobileEnv(): MobileEnv {
  const expoExtra = getExpoRuntimeExtra();

  return validateMobileEnv({
    accountDataSource: parseAccountDataSource(
      process.env.EXPO_PUBLIC_ACCOUNT_DATA_SOURCE ?? expoExtra.accountDataSource
    ),
    apiUrl: process.env.EXPO_PUBLIC_API_URL?.trim() || expoExtra.apiUrl || envDefaults.apiUrl,
    appEnv: process.env.EXPO_PUBLIC_APP_ENV?.trim() || expoExtra.appEnv || envDefaults.appEnv,
    frontendUrl:
      process.env.EXPO_PUBLIC_FRONTEND_URL?.trim() ||
      expoExtra.frontendUrl ||
      envDefaults.frontendUrl,
    posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || expoExtra.posthogHost || "",
    posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() || expoExtra.posthogKey || "",
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || expoExtra.sentryDsn || "",
  });
}

export function validateMobileEnv(env: MobileEnv): MobileEnv {
  if (env.appEnv !== "production") {
    return env;
  }

  if (!env.apiUrl.startsWith("https://")) {
    throw new Error("Production Expo API URL must use HTTPS.");
  }

  if (!env.frontendUrl.startsWith("https://")) {
    throw new Error("Production Expo frontend URL must use HTTPS.");
  }

  if (env.accountDataSource === "fixtures") {
    throw new Error("Production Expo account data source cannot use fixtures.");
  }

  return env;
}

function parseAccountDataSource(value: string | undefined): AccountDataSource {
  if (value === "backend" || value === "disabled" || value === "fixtures") {
    return value;
  }

  return envDefaults.accountDataSource;
}

function getExpoRuntimeExtra(): Partial<MobileEnv> {
  const extra = getExpoConstantsExtra();

  if (!extra || typeof extra !== "object") {
    return {};
  }

  return {
    accountDataSource:
      typeof extra.accountDataSource === "string"
        ? parseAccountDataSource(extra.accountDataSource)
        : undefined,
    apiUrl: typeof extra.apiUrl === "string" ? extra.apiUrl.trim() : undefined,
    appEnv: typeof extra.appEnv === "string" ? extra.appEnv.trim() : undefined,
    frontendUrl: typeof extra.frontendUrl === "string" ? extra.frontendUrl.trim() : undefined,
    posthogHost: typeof extra.posthogHost === "string" ? extra.posthogHost.trim() : undefined,
    posthogKey: typeof extra.posthogKey === "string" ? extra.posthogKey.trim() : undefined,
    sentryDsn: typeof extra.sentryDsn === "string" ? extra.sentryDsn.trim() : undefined,
  };
}

type ExpoConstantsModule = {
  default?: {
    expoConfig?: {
      extra?: Record<string, unknown>;
    };
  };
  expoConfig?: {
    extra?: Record<string, unknown>;
  };
};

function getExpoConstantsExtra(): Record<string, unknown> | undefined {
  try {
    const constantsModule = require("expo-constants") as ExpoConstantsModule;
    return constantsModule.default?.expoConfig?.extra ?? constantsModule.expoConfig?.extra;
  } catch {
    return undefined;
  }
}
