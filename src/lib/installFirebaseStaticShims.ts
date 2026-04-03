/**
 * Firebase static export: no API routes on the host. Patch `fetch` before NextAuth runs.
 * - `/api/auth/*` — session, csrf, providers, callback, signout (NextAuth client)
 * - `/api/mock/*` — same behavior as `mockApiCore` (used by `fetch()`)
 */
import { handleMockApiRequest } from "@/lib/mockApiCore";
import { DEFAULT_MOCK_ACCESS_TOKEN } from "@/lib/authTokens";
import { isStaticHostingClient } from "@/lib/isStaticHostingClient";
import { DEFAULT_POST_LOGIN_PATH, safeAppPathFromCallback } from "@/lib/safeCallbackUrl";

function syntheticNextAuthSession(): string {
  const expires = new Date(Date.now() + 30 * 86400000).toISOString();
  return JSON.stringify({
    user: {
      name: "admin",
      email: "admin@gogocash.co",
      id: "a1",
    },
    expires,
    accessToken: DEFAULT_MOCK_ACCESS_TOKEN,
  });
}

/**
 * Handle NextAuth client `fetch` calls on static hosting (no `/api/auth` server).
 */
function staticAuthResponse(
  pathname: string,
  method: string,
  bodyText: string | undefined,
): Response {
  let rest = "";
  if (pathname.startsWith("/api/auth/")) {
    rest = pathname.slice("/api/auth/".length).split("?")[0];
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const m = method.toUpperCase();

  if (rest === "session") {
    // GET (read session) or POST (SessionProvider.update with CSRF + body)
    return new Response(syntheticNextAuthSession(), {
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
    let callbackUrl = `${origin}${DEFAULT_POST_LOGIN_PATH}`;
    if (bodyText) {
      try {
        const params = new URLSearchParams(bodyText);
        const c = params.get("callbackUrl");
        const path = safeAppPathFromCallback(c);
        if (path) {
          callbackUrl = `${origin}${path}`;
        }
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
  if (typeof window === "undefined" || !isStaticHostingClient()) return;
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

    return orig(input as RequestInfo, init);
  };
}

installFirebaseStaticShims();
