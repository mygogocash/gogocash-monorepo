/**
 * Firebase static export: no API routes on the host. Patch `fetch` before NextAuth runs.
 * - `/api/auth/*` — always shimmed on static builds (no server-side NextAuth handler exists).
 *   When `NEXT_PUBLIC_API_URL` is set, the credentials `callback` hits the REAL admin login
 *   endpoint and stores the returned token in localStorage; subsequent `session` calls return
 *   that token. When unset, returns a synthetic mock session.
 * - `/api/mock/*` — only shimmed when `NEXT_PUBLIC_API_URL` is NOT set (real API mode
 *   bypasses mock entirely).
 */
import { handleMockApiRequest } from "@/lib/mockApiCore";
import { DEFAULT_MOCK_ACCESS_TOKEN } from "@/lib/authTokens";
import {
  isStaticExportBuild,
  isStaticHostingClient,
} from "@/lib/isStaticHostingClient";
import {
  DEFAULT_POST_LOGIN_PATH,
  safeAppPathFromCallback,
} from "@/lib/safeCallbackUrl";

interface RealApiSession {
  accessToken: string;
  email: string;
  id: string;
  username: string;
}

const REAL_SESSION_STORAGE_KEY = "gogocash:admin:realSession";

function readRealSession(): RealApiSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REAL_SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RealApiSession;
  } catch {
    return null;
  }
}

function writeRealSession(session: RealApiSession | null): void {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      window.localStorage.setItem(
        REAL_SESSION_STORAGE_KEY,
        JSON.stringify(session),
      );
    } else {
      window.localStorage.removeItem(REAL_SESSION_STORAGE_KEY);
    }
  } catch {
    /* storage unavailable */
  }
}

function sessionPayload(real: RealApiSession | null): string {
  const expires = new Date(Date.now() + 30 * 86400000).toISOString();
  if (real) {
    return JSON.stringify({
      user: { name: real.username, email: real.email, id: real.id },
      expires,
      accessToken: real.accessToken,
    });
  }
  return JSON.stringify({
    user: { name: "admin", email: "admin@gogocash.co", id: "a1" },
    expires,
    accessToken: DEFAULT_MOCK_ACCESS_TOKEN,
  });
}

async function handleRealCredentialsLogin(
  bodyText: string | undefined,
): Promise<Response> {
  const origin = window.location.origin;
  let email = "";
  let password = "";
  let callbackUrl = `${origin}${DEFAULT_POST_LOGIN_PATH}`;
  if (bodyText) {
    try {
      const params = new URLSearchParams(bodyText);
      email = params.get("email") || "";
      password = params.get("password") || "";
      const c = params.get("callbackUrl");
      const path = safeAppPathFromCallback(c);
      if (path) callbackUrl = `${origin}${path}`;
    } catch {
      /* ignore */
    }
  }

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  try {
    const res = await fetch(`${apiBase}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.token) {
      const message = data?.message || `Login failed (${res.status})`;
      return new Response(
        JSON.stringify({
          url: `${origin}/signin/?error=${encodeURIComponent("CredentialsSignin")}`,
          error: message,
          ok: false,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }
    writeRealSession({
      accessToken: data.token,
      email: data.email || email,
      id: data._id || data.id || "admin",
      username: data.username || "admin",
    });
    return new Response(JSON.stringify({ url: callbackUrl, ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        url: `${origin}/signin/?error=CredentialsSignin`,
        error: err instanceof Error ? err.message : "Network error",
        ok: false,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

async function staticAuthResponse(
  pathname: string,
  method: string,
  bodyText: string | undefined,
): Promise<Response> {
  const hasRealApi = !!process.env.NEXT_PUBLIC_API_URL;
  let rest = "";
  if (pathname.startsWith("/api/auth/")) {
    rest = pathname.slice("/api/auth/".length).split("?")[0];
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const m = method.toUpperCase();

  if (rest === "session") {
    const real = hasRealApi ? readRealSession() : null;
    return new Response(sessionPayload(real), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (rest === "csrf") {
    return new Response(JSON.stringify({ csrfToken: "static-csrf-token" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (rest === "providers") {
    return new Response(
      JSON.stringify({
        credentials: {
          id: "credentials",
          name: "Credentials",
          type: "credentials",
          signinUrl: `${origin}/api/auth/signin/credentials`,
          callbackUrl: `${origin}/api/auth/callback/credentials`,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  if (rest.startsWith("callback/") && m === "POST") {
    if (hasRealApi) {
      return handleRealCredentialsLogin(bodyText);
    }
    let callbackUrl = `${origin}${DEFAULT_POST_LOGIN_PATH}`;
    if (bodyText) {
      try {
        const params = new URLSearchParams(bodyText);
        const c = params.get("callbackUrl");
        const path = safeAppPathFromCallback(c);
        if (path) callbackUrl = `${origin}${path}`;
      } catch {
        /* ignore */
      }
    }
    return new Response(JSON.stringify({ url: callbackUrl, ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (rest === "signout") {
    writeRealSession(null);
    const url = origin ? `${origin}/` : "/";
    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (rest === "error") {
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export function installFirebaseStaticShims(): void {
  if (typeof window === "undefined" || !isStaticExportBuild()) return;
  const w = window as Window & { __gogocashFetchShimInstalled?: boolean };
  if (w.__gogocashFetchShimInstalled) return;
  w.__gogocashFetchShimInstalled = true;

  const orig = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const urlString =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : String(input);
    const u = new URL(urlString, window.location.origin);

    if (u.origin !== window.location.origin) {
      return orig(input as RequestInfo, init);
    }

    const pathname = u.pathname;
    const method = (init?.method || "GET").toUpperCase();

    let bodyText: string | undefined;
    if (init?.body != null && typeof init.body === "string") {
      bodyText = init.body;
    }

    if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
      return staticAuthResponse(pathname, method, bodyText);
    }

    // Only intercept /api/mock/* when we're NOT pointed at a real API.
    if (isStaticHostingClient()) {
      const mockMarker = "/api/mock";
      const mockIdx = pathname.indexOf(mockMarker);
      if (mockIdx !== -1) {
        const after = pathname.slice(mockIdx + mockMarker.length);
        const rest = after.replace(/^\/+/, "");
        const pathSegments = rest ? rest.split("/").filter(Boolean) : [];
        let body: unknown = undefined;
        if (bodyText) {
          try {
            body = JSON.parse(bodyText);
          } catch {
            body = undefined;
          }
        }
        const result = await handleMockApiRequest({
          method,
          path: pathSegments,
          searchParams: u.searchParams,
          body,
        });
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return orig(input as RequestInfo, init);
  };
}

installFirebaseStaticShims();
