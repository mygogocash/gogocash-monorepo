import { Platform } from "react-native";

import { resolveLineLoginOrigin } from "@mobile/auth/canonicalWebOrigin";
import type { BackendLoginResponse } from "@mobile/auth/firebaseLogin";
import { mapLoginResponseToMobileSession } from "@mobile/auth/firebaseLogin";
import { sanitizeCallbackPath } from "@mobile/auth/routeGuard";
import type { MobileSession } from "@mobile/auth/session";

export type LineProfilePayload = {
  userId: string;
  displayName?: string;
  pictureUrl?: string;
};

type LiffInitConfig = {
  liffId: string;
  withLoginOnExternalBrowser?: boolean;
};

type LiffSdk = {
  init: (config: LiffInitConfig) => Promise<void>;
  isLoggedIn: () => boolean;
  login: (config?: { redirectUri?: string }) => void;
  getAccessToken: () => string | null;
  getProfile: () => Promise<LineProfilePayload>;
};

declare global {
  interface Window {
    liff?: LiffSdk;
  }
}

const LIFF_SDK_SCRIPT = "https://static.line-scdn.net/liff/edge/2/sdk.js";
export const LINE_AUTH_CALLBACK_PATH = "/auth/line-callback";
/** After LINE handoff, land on Profile so the logged-in account is visible. */
export const LINE_AUTH_DEFAULT_POST_LOGIN_PATH = "/profile";
/** sessionStorage key for the Safari←LINE OAuth/LIFF return URL. */
export const LINE_AUTH_RETURN_HREF_KEY = "gogocash.line.auth.returnHref.v1";

const LINE_AUTH_RETURN_QUERY_KEYS = [
  "code",
  "state",
  "liffClientId",
  "liffRedirectUri",
  "liff.state",
  "error",
  "error_description",
] as const;

export type LineAuthExchangeErrorKind =
  | "account-disabled"
  | "account-link-failed"
  | "provider-unavailable"
  | "session-expired"
  | "unknown";

const lineAuthExchangeErrorMessages: Record<LineAuthExchangeErrorKind, string> =
  {
    "account-disabled": "This GoGoCash account is disabled. Contact support.",
    "account-link-failed":
      "We couldn't link your LINE account. Please try again or contact support.",
    "provider-unavailable":
      "LINE sign-in is temporarily unavailable. Please try again.",
    "session-expired": "Your LINE sign-in expired. Start LINE sign-in again.",
    unknown: "We couldn't finish LINE sign-in. Please try again.",
  };

export class LineLoginNotConfiguredError extends Error {
  constructor(message = "LINE login is not configured") {
    super(message);
    this.name = "LineLoginNotConfiguredError";
  }
}

export class LineLoginRedirectStartedError extends Error {
  readonly code = "auth/popup-closed-by-user";

  constructor() {
    super("Redirecting to LINE login");
    this.name = "LineLoginRedirectStartedError";
  }
}

export class LineLoginSessionMissingError extends Error {
  constructor() {
    super("LINE login session missing after callback");
    this.name = "LineLoginSessionMissingError";
  }
}

export class LineAuthExchangeError extends Error {
  constructor(
    public readonly kind: LineAuthExchangeErrorKind,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(lineAuthExchangeErrorMessages[kind]);
    this.name = "LineAuthExchangeError";
  }
}

export function getLineAuthUserMessage(error: unknown): string | null {
  return error instanceof LineAuthExchangeError ? error.message : null;
}

export function getLiffId(): string {
  return process.env.EXPO_PUBLIC_LIFF_ID?.trim() || "";
}

export function isLineLoginConfigured(): boolean {
  return getLiffId().length > 0;
}

/**
 * Builds the browser handoff URL without forwarding LIFF/OAuth parameters from
 * the login page. Only a known relative in-app destination survives.
 */
export function buildLineLoginCallbackUrl(currentHref: string): string {
  const currentUrl = new URL(currentHref);
  if (currentUrl.protocol !== "http:" && currentUrl.protocol !== "https:") {
    throw new Error("LINE login requires an HTTP origin.");
  }

  const postLoginPath = sanitizeCallbackPath(
    currentUrl.searchParams.get("callbackUrl"),
    LINE_AUTH_DEFAULT_POST_LOGIN_PATH,
  );
  // Prefer the configured customer-web origin (LIFF Endpoint URL) over the
  // current window origin so alias hosts like staging.gogocash.co still return
  // to app-staging where the GoGoCash session is stored.
  const callbackUrl = new URL(
    LINE_AUTH_CALLBACK_PATH,
    resolveLineLoginOrigin(currentHref),
  );
  callbackUrl.searchParams.set("callbackUrl", postLoginPath);

  return callbackUrl.toString();
}

/**
 * True when the URL still carries LIFF/OAuth return markers that `liff.init()`
 * needs. Expo Router can strip unknown search params before the callback
 * effect runs, so we snapshot these early on the callback route.
 */
export function hasLineAuthReturnParams(href: string): boolean {
  try {
    const url = new URL(href);
    if (
      LINE_AUTH_RETURN_QUERY_KEYS.some((key) => url.searchParams.has(key))
    ) {
      return true;
    }
    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    if (!hash) {
      return false;
    }
    const hashParams = new URLSearchParams(hash);
    return LINE_AUTH_RETURN_QUERY_KEYS.some((key) => hashParams.has(key));
  } catch {
    return false;
  }
}

/**
 * Persist the provider return URL as soon as the callback bundle loads —
 * before async LIFF SDK load / React effects can race Expo Router's URL cleanup.
 */
export function captureLineAuthReturnHref(
  href = typeof window !== "undefined" ? window.location.href : "",
): string | null {
  if (!href || !hasLineAuthReturnParams(href)) {
    return null;
  }

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage?.setItem(LINE_AUTH_RETURN_HREF_KEY, href);
    } catch {
      // Private mode / blocked storage — restore will no-op; init may still work
      // if the live URL still has the params.
    }
  }

  return href;
}

/**
 * If the SPA already cleaned OAuth/LIFF params from the address bar, put them
 * back so `liff.init()` can finish the external-browser login.
 */
export function restoreLineAuthReturnHrefIfNeeded(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (hasLineAuthReturnParams(window.location.href)) {
    return false;
  }

  let stored: string | null = null;
  try {
    stored = window.sessionStorage?.getItem(LINE_AUTH_RETURN_HREF_KEY) ?? null;
  } catch {
    return false;
  }

  if (!stored || !hasLineAuthReturnParams(stored)) {
    return false;
  }

  try {
    const storedUrl = new URL(stored);
    const currentOrigin =
      window.location.origin || new URL(window.location.href).origin;
    if (storedUrl.origin !== currentOrigin) {
      return false;
    }
    window.history.replaceState(null, "", stored);
    return true;
  } catch {
    return false;
  }
}

function clearLineAuthReturnHref(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage?.removeItem(LINE_AUTH_RETURN_HREF_KEY);
  } catch {
    // ignore
  }
}

async function loadLiffSdk(): Promise<LiffSdk> {
  if (typeof window === "undefined") {
    throw new Error("LINE login currently supports Expo web only.");
  }

  if (window.liff) {
    return window.liff;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${LIFF_SDK_SCRIPT}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("LINE SDK failed to load")),
        {
          once: true,
        },
      );
      if (window.liff) {
        resolve();
      }
      return;
    }

    const script = document.createElement("script");
    script.src = LIFF_SDK_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("LINE SDK failed to load"));
    document.head.appendChild(script);
  });

  if (!window.liff) {
    throw new Error("LINE SDK unavailable after load");
  }
  return window.liff;
}

/**
 * Opens LIFF login (web). When already logged in inside LINE Mini App / LIFF,
 * returns the access token + profile without a redirect.
 */
export async function requestLineLogin(liffId = getLiffId()): Promise<{
  accessToken: string;
  profile: LineProfilePayload;
}> {
  if (Platform.OS !== "web") {
    return Promise.reject(
      new Error("LINE login currently supports Expo web only."),
    );
  }
  if (!liffId) {
    throw new LineLoginNotConfiguredError();
  }

  const liff = await loadLiffSdk();
  // Keep withLoginOnExternalBrowser off: automatic login uses the LIFF Endpoint
  // URL and skips our `/auth/line-callback` handoff + sanitized callbackUrl.
  await liff.init({ liffId });

  if (!liff.isLoggedIn()) {
    liff.login({
      redirectUri: buildLineLoginCallbackUrl(window.location.href),
    });
    // Redirect in progress — reject so the caller does not keep a busy spinner forever.
    throw new LineLoginRedirectStartedError();
  }

  return readLineCredentials(liff);
}

/**
 * Completes the external-browser return path. Unlike requestLineLogin(), this
 * never calls liff.login(): a missing LIFF session is terminal so the callback
 * route cannot bounce between GoGoCash and LINE forever.
 */
export async function resumeLineLogin(liffId = getLiffId()): Promise<{
  accessToken: string;
  profile: LineProfilePayload;
}> {
  if (Platform.OS !== "web") {
    return Promise.reject(
      new Error("LINE login currently supports Expo web only."),
    );
  }
  if (!liffId) {
    throw new LineLoginNotConfiguredError();
  }

  // Snapshot again in case the module-load capture ran before the provider
  // return params were present (BFCache / delayed redirect).
  captureLineAuthReturnHref();
  restoreLineAuthReturnHrefIfNeeded();

  const liff = await loadLiffSdk();
  // Do NOT set withLoginOnExternalBrowser here — a missing session must fail
  // closed instead of starting another login redirect loop.
  await liff.init({ liffId });

  if (!liff.isLoggedIn()) {
    throw new LineLoginSessionMissingError();
  }

  clearLineAuthReturnHref();
  return readLineCredentials(liff);
}

/**
 * After a GoGoCash session is persisted, force a same-origin document load so
 * Safari re-reads localStorage synchronously (header + auth guard). Soft
 * expo-router replaces can leave the shell painted as signed-out.
 */
export function navigateAfterLineAuthSuccess(
  path: string,
  replaceFn: (href: string) => void,
): void {
  const safePath = sanitizeCallbackPath(
    path,
    LINE_AUTH_DEFAULT_POST_LOGIN_PATH,
  );

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const target = new URL(safePath, window.location.origin);
    window.location.replace(`${target.pathname}${target.search}${target.hash}`);
    return;
  }

  replaceFn(safePath);
}

async function readLineCredentials(liff: LiffSdk): Promise<{
  accessToken: string;
  profile: LineProfilePayload;
}> {
  const accessToken = liff.getAccessToken();
  if (!accessToken) {
    throw new LineLoginSessionMissingError();
  }

  const profile = await liff.getProfile();
  if (!profile?.userId) {
    throw new Error("LINE profile missing userId");
  }

  return { accessToken, profile };
}

export async function exchangeLineAuth({
  accessToken,
  apiUrl,
  country,
  fetchImpl = fetch,
  profile,
}: {
  accessToken: string;
  apiUrl: string;
  country?: string;
  fetchImpl?: typeof fetch;
  profile: LineProfilePayload;
}): Promise<MobileSession> {
  const baseUrl = apiUrl.replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/auth/line-login`, {
      body: JSON.stringify({
        id_line: profile.userId,
        ...(profile.displayName ? { username: profile.displayName } : {}),
        ...(profile.pictureUrl ? { picture_url: profile.pictureUrl } : {}),
        ...(country ? { country } : {}),
      }),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch {
    throw new LineAuthExchangeError("provider-unavailable", 0);
  }

  const body = (await response
    .json()
    .catch(() => ({}))) as BackendLoginResponse & {
    code?: unknown;
  };
  if (!response.ok) {
    throw createLineAuthExchangeError(response.status, body.code);
  }

  try {
    return mapLoginResponseToMobileSession(body);
  } catch {
    throw new LineAuthExchangeError("account-link-failed", response.status);
  }
}

function createLineAuthExchangeError(
  status: number,
  responseCode: unknown,
): LineAuthExchangeError {
  const code = typeof responseCode === "string" ? responseCode : undefined;

  if (
    code === "LINE_TOKEN_MISSING" ||
    code === "LINE_TOKEN_INVALID" ||
    code === "LINE_IDENTITY_MISMATCH" ||
    code === "LINE_CHANNEL_MISMATCH"
  ) {
    return new LineAuthExchangeError("session-expired", status, code);
  }
  if (code === "ACCOUNT_DISABLED" || code === "LINE_ACCOUNT_DISABLED") {
    return new LineAuthExchangeError("account-disabled", status, code);
  }
  if (
    code === "LINE_PROVIDER_UNAVAILABLE" ||
    code === "LINE_CHANNEL_NOT_CONFIGURED"
  ) {
    return new LineAuthExchangeError("provider-unavailable", status, code);
  }
  if (code === "LINE_ACCOUNT_LINK_FAILED" || code === "LINE_ACCOUNT_CONFLICT") {
    return new LineAuthExchangeError("account-link-failed", status, code);
  }

  if (status === 400 || status === 401) {
    return new LineAuthExchangeError("session-expired", status);
  }
  if (status === 403) {
    return new LineAuthExchangeError("account-disabled", status);
  }
  if (status === 409 || status === 422 || status === 500) {
    return new LineAuthExchangeError("account-link-failed", status);
  }
  if (status === 502 || status === 503 || status === 504) {
    return new LineAuthExchangeError("provider-unavailable", status);
  }

  return new LineAuthExchangeError("unknown", status);
}
