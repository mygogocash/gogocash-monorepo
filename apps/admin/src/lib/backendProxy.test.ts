import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_PROXY_BODY_BYTES,
  assertProxyBodyWithinLimit,
  buildUpstreamUrl,
  filterOutgoingRequestHeaders,
  proxyToBackend,
  resolveAdminApiBaseURL,
  resolveAdminRuntimeApiUrl,
  resolveUpstreamBaseUrl,
  sessionExpiredResponse,
} from "./backendProxy";

describe("resolveUpstreamBaseUrl", () => {
  const keys = [
    "API_URL",
    "NEXT_PUBLIC_API_URL",
    "RAILWAY_ENVIRONMENT",
    "RAILWAY_SERVICE_NAME",
    "RAILWAY_PROJECT_ID",
  ] as const;
  const original = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );

  afterEach(() => {
    for (const key of keys) {
      const value = original[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("given API_URL > then prefers the server-only upstream", () => {
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.RAILWAY_SERVICE_NAME;
    delete process.env.RAILWAY_PROJECT_ID;
    process.env.API_URL = "http://api.internal.example:8080/";
    process.env.NEXT_PUBLIC_API_URL = "https://api.public.example";
    expect(resolveUpstreamBaseUrl()).toBe("http://api.internal.example:8080");
  });

  it("given only NEXT_PUBLIC_API_URL locally > then uses it as upstream", () => {
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.RAILWAY_SERVICE_NAME;
    delete process.env.RAILWAY_PROJECT_ID;
    delete process.env.API_URL;
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080/";
    expect(resolveUpstreamBaseUrl()).toBe("http://localhost:8080");
  });

  it("given a blank private URL locally > then falls back to the configured public URL", () => {
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.RAILWAY_SERVICE_NAME;
    delete process.env.RAILWAY_PROJECT_ID;
    process.env.API_URL = "   ";
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080/";
    expect(resolveUpstreamBaseUrl()).toBe("http://localhost:8080");
  });

  it("given Railway without API_URL > then returns null (no public fallback)", () => {
    process.env.RAILWAY_ENVIRONMENT = "production";
    delete process.env.API_URL;
    process.env.NEXT_PUBLIC_API_URL = "https://api-beta.gogocash.co";
    expect(resolveUpstreamBaseUrl()).toBeNull();
  });

  it("given API_URL on *.up.railway.app > then returns null", () => {
    delete process.env.RAILWAY_ENVIRONMENT;
    process.env.API_URL = "https://gogocash-api-production.up.railway.app";
    process.env.NEXT_PUBLIC_API_URL = "https://api-beta.gogocash.co";
    expect(resolveUpstreamBaseUrl()).toBeNull();
  });

  it("given no upstream env > then returns null", () => {
    delete process.env.RAILWAY_ENVIRONMENT;
    delete process.env.RAILWAY_SERVICE_NAME;
    delete process.env.RAILWAY_PROJECT_ID;
    delete process.env.API_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    expect(resolveUpstreamBaseUrl()).toBeNull();
  });
});

describe("buildUpstreamUrl", () => {
  it("given path segments and search > then joins under the upstream base", () => {
    expect(
      buildUpstreamUrl(
        "http://localhost:8080",
        ["admin", "withdraw-all"],
        "?page=1",
      ),
    ).toBe("http://localhost:8080/admin/withdraw-all?page=1");
  });
});

describe("resolveAdminApiBaseURL", () => {
  it("given browser + real API > then returns same-origin BFF base", () => {
    expect(
      resolveAdminApiBaseURL({
        realApiUrl: "http://localhost:8080",
        isBrowser: true,
      }),
    ).toBe("/api/backend");
  });

  it("given server + real API > then returns absolute Nest base for authorize", () => {
    expect(
      resolveAdminApiBaseURL({
        realApiUrl: "http://localhost:8080/",
        isBrowser: false,
      }),
    ).toBe("http://localhost:8080");
  });

  it("given mock mode in browser > then returns /api/mock", () => {
    expect(
      resolveAdminApiBaseURL({
        realApiUrl: undefined,
        isBrowser: true,
      }),
    ).toBe("/api/mock");
  });
});

describe("resolveAdminRuntimeApiUrl", () => {
  it("given server runtime API_URL > then it wins over a preview-baked public URL", () => {
    expect(
      resolveAdminRuntimeApiUrl({
        isBrowser: false,
        publicApiUrl: "https://preview-api.example",
        serverApiUrl: "http://staging-api.railway.internal:8080",
      }),
    ).toBe("http://staging-api.railway.internal:8080");
  });

  it("given a browser > then it ignores the private server URL", () => {
    expect(
      resolveAdminRuntimeApiUrl({
        isBrowser: true,
        publicApiUrl: "https://api-staging.example",
        serverApiUrl: "http://staging-api.railway.internal:8080",
      }),
    ).toBe("https://api-staging.example");
  });

  it("given no server API_URL > then server rendering falls back to the public URL", () => {
    expect(
      resolveAdminRuntimeApiUrl({
        isBrowser: false,
        publicApiUrl: "https://api-staging.example",
        serverApiUrl: undefined,
      }),
    ).toBe("https://api-staging.example");
  });

  it("given a whitespace-only public URL > then treats it as unconfigured", () => {
    expect(
      resolveAdminRuntimeApiUrl({
        isBrowser: true,
        publicApiUrl: "   ",
        serverApiUrl: undefined,
      }),
    ).toBeUndefined();
  });
});

describe("filterOutgoingRequestHeaders", () => {
  it("given client Authorization > then strips it and hop-by-hop headers", () => {
    const incoming = new Headers({
      Authorization: "Bearer stolen-client-token",
      "Content-Type": "multipart/form-data; boundary=abc",
      Accept: "application/json",
      Connection: "keep-alive",
      Host: "admin.example",
      Cookie: "next-auth.session-token=secret",
    });

    const outgoing = filterOutgoingRequestHeaders(incoming);

    expect(outgoing.get("Authorization")).toBeNull();
    expect(outgoing.get("Cookie")).toBeNull();
    expect(outgoing.get("Connection")).toBeNull();
    expect(outgoing.get("Host")).toBeNull();
    expect(outgoing.get("Content-Type")).toBe(
      "multipart/form-data; boundary=abc",
    );
    expect(outgoing.get("Accept")).toBe("application/json");
  });

  it("given Cloudflare edge headers on the inbound request > then strips them from the upstream request", () => {
    // When the admin domain is Cloudflare-proxied, the inbound request carries
    // cf-* headers. Forwarding them to a Cloudflare-proxied upstream makes
    // Cloudflare reject the request as header spoofing (error 1000, a
    // message-less 403) — CF-Connecting-IP alone is enough to trigger it.
    const incoming = new Headers({
      Accept: "application/json",
      "CF-Connecting-IP": "184.22.25.10",
      "CF-Ray": "a1da780ec86af8dc-SIN",
      "CF-Visitor": '{"scheme":"https"}',
      "CF-IPCountry": "TH",
      "CDN-Loop": "cloudflare; loops=1",
      "True-Client-IP": "184.22.25.10",
    });

    const outgoing = filterOutgoingRequestHeaders(incoming);

    expect(outgoing.get("CF-Connecting-IP")).toBeNull();
    expect(outgoing.get("CF-Ray")).toBeNull();
    expect(outgoing.get("CF-Visitor")).toBeNull();
    expect(outgoing.get("CF-IPCountry")).toBeNull();
    expect(outgoing.get("CDN-Loop")).toBeNull();
    expect(outgoing.get("True-Client-IP")).toBeNull();
    expect(outgoing.get("Accept")).toBe("application/json");
  });
});

describe("assertProxyBodyWithinLimit", () => {
  it("given Content-Length over the cap > then returns 413", () => {
    const headers = new Headers({
      "content-length": String(MAX_PROXY_BODY_BYTES + 1),
    });
    const rejected = assertProxyBodyWithinLimit(headers, null);
    expect(rejected?.status).toBe(413);
  });

  it("given buffered body over the cap > then returns 413", () => {
    const body = new ArrayBuffer(MAX_PROXY_BODY_BYTES + 1);
    const rejected = assertProxyBodyWithinLimit(new Headers(), body);
    expect(rejected?.status).toBe(413);
  });

  it("given an oversized upload > then the message is plain, actionable, and names the size limit", async () => {
    const headers = new Headers({
      "content-length": String(MAX_PROXY_BODY_BYTES + 1),
    });
    const rejected = assertProxyBodyWithinLimit(headers, null);
    expect(await rejected?.json()).toEqual({
      message:
        "The file you're uploading is too large. Please use a smaller file (under 32 MB).",
    });
  });

  it("given body within the cap > then returns null", () => {
    const body = new ArrayBuffer(16);
    expect(assertProxyBodyWithinLimit(new Headers(), body)).toBeNull();
  });
});

describe("sessionExpiredResponse", () => {
  // The BFF answers missing/expired NextAuth sessions itself (no upstream
  // call); the axios client keys its sign-in redirect off this 401.
  it("given a missing session > then returns 401 with the session-expired message", async () => {
    const response = sessionExpiredResponse();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      message: "Session expired. Please sign in again.",
    });
  });
});

describe("proxyToBackend", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("given no access token > then returns the session-expired 401 and does not call upstream", async () => {
    const fetchImpl = vi.fn();

    const response = await proxyToBackend({
      method: "GET",
      pathSegments: ["offer", "admin"],
      search: "?limit=10",
      requestHeaders: new Headers({ Authorization: "Bearer forged" }),
      body: null,
      accessToken: null,
      upstreamBase: "http://localhost:8080",
      fetchImpl,
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      message: "Session expired. Please sign in again.",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("given a JWT access token > then attaches Bearer from the server token only", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await proxyToBackend({
      method: "GET",
      pathSegments: ["offer", "admin"],
      search: "?limit=10",
      requestHeaders: new Headers({
        Authorization: "Bearer forged-from-browser",
        Accept: "application/json",
      }),
      body: null,
      accessToken: "server-jwt",
      upstreamBase: "http://localhost:8080",
      fetchImpl,
    });

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [
      string,
      RequestInit & { headers: Headers },
    ];
    expect(url).toBe("http://localhost:8080/offer/admin?limit=10");
    expect(init.method).toBe("GET");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer server-jwt");
    expect(headers.get("Accept")).toBe("application/json");
  });

  it("given a protected media GET > then preserves the encoded ref and attaches the server JWT", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("image-bytes", {
        status: 200,
        headers: { "Content-Type": "image/png" },
      }),
    );
    const encodedRef = encodeURIComponent(
      "https://storage.googleapis.com/gogocash/withdraw-slips/slip.png",
    );

    const response = await proxyToBackend({
      method: "GET",
      pathSegments: ["admin", "stored-media", "stream"],
      search: `?ref=${encodedRef}`,
      requestHeaders: new Headers(),
      body: null,
      accessToken: "server-jwt",
      upstreamBase: "http://gogocash-api.railway.internal:8080",
      fetchImpl,
    });

    expect(response.status).toBe(200);
    const [url, init] = fetchImpl.mock.calls[0] as [
      string,
      RequestInit & { headers: Headers },
    ];
    expect(url).toBe(
      `http://gogocash-api.railway.internal:8080/admin/stored-media/stream?ref=${encodedRef}`,
    );
    expect(new Headers(init.headers).get("Authorization")).toBe(
      "Bearer server-jwt",
    );
  });

  it("given multipart POST body > then forwards body and content-type", async () => {
    const body = new TextEncoder().encode("form-bytes").buffer;
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 201 }),
      );

    await proxyToBackend({
      method: "POST",
      pathSegments: ["offer"],
      search: "",
      requestHeaders: new Headers({
        "Content-Type": "multipart/form-data; boundary=xyz",
      }),
      body,
      accessToken: "server-jwt",
      upstreamBase: "http://localhost:8080",
      fetchImpl,
    });

    const [, init] = fetchImpl.mock.calls[0] as [
      string,
      RequestInit & { headers: Headers; body?: ArrayBuffer },
    ];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(body);
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe(
      "multipart/form-data; boundary=xyz",
    );
    expect(headers.get("Authorization")).toBe("Bearer server-jwt");
  });
});
