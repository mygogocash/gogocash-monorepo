import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  MAX_PROXY_BODY_BYTES,
  assertProxyBodyWithinLimit,
  buildUpstreamUrl,
  filterOutgoingRequestHeaders,
  proxyToBackend,
  resolveAdminApiBaseURL,
  resolveUpstreamBaseUrl,
  sessionExpiredResponse,
} from "./backendProxy";

describe("resolveUpstreamBaseUrl", () => {
  const originalApiUrl = process.env.API_URL;
  const originalPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (originalApiUrl === undefined) delete process.env.API_URL;
    else process.env.API_URL = originalApiUrl;
    if (originalPublicApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalPublicApiUrl;
    }
  });

  it("given API_URL > then prefers the server-only upstream", () => {
    process.env.API_URL = "https://api.internal.example/";
    process.env.NEXT_PUBLIC_API_URL = "https://api.public.example";
    expect(resolveUpstreamBaseUrl()).toBe("https://api.internal.example");
  });

  it("given only NEXT_PUBLIC_API_URL > then uses it as upstream", () => {
    delete process.env.API_URL;
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080/";
    expect(resolveUpstreamBaseUrl()).toBe("http://localhost:8080");
  });

  it("given no upstream env > then returns null", () => {
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
});

describe("assertProxyBodyWithinLimit", () => {
  it("given Content-Length over the cap > then returns 413", () => {
    const headers = new Headers({ "content-length": String(MAX_PROXY_BODY_BYTES + 1) });
    const rejected = assertProxyBodyWithinLimit(headers, null);
    expect(rejected?.status).toBe(413);
  });

  it("given buffered body over the cap > then returns 413", () => {
    const body = new ArrayBuffer(MAX_PROXY_BODY_BYTES + 1);
    const rejected = assertProxyBodyWithinLimit(new Headers(), body);
    expect(rejected?.status).toBe(413);
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

  it("given multipart POST body > then forwards body and content-type", async () => {
    const body = new TextEncoder().encode("form-bytes").buffer;
    const fetchImpl = vi.fn().mockResolvedValue(
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
