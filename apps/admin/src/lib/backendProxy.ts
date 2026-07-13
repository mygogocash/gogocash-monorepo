/**
 * Server-side BFF helpers for `/api/backend/[...path]`.
 * Browser clients call the same-origin proxy; this layer attaches the Nest JWT
 * from the NextAuth JWT cookie and never trusts a client Authorization header.
 */

/** Cap for buffered proxy bodies (banner/brand multipart). Reject before reading. */
export const MAX_PROXY_BODY_BYTES = 32 * 1024 * 1024;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

export function resolveUpstreamBaseUrl(): string | null {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function buildUpstreamUrl(
  upstreamBase: string,
  pathSegments: string[],
  search: string,
): string {
  const path = pathSegments.map(encodeURIComponent).join("/");
  const query = search.startsWith("?")
    ? search
    : search
      ? `?${search}`
      : "";
  return `${upstreamBase}/${path}${query}`;
}

/** Strip hop-by-hop headers, cookies, and any client Authorization. */
export function filterOutgoingRequestHeaders(incoming: Headers): Headers {
  const outgoing = new Headers();
  incoming.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (lower === "authorization") return;
    if (lower === "cookie") return;
    outgoing.set(key, value);
  });
  return outgoing;
}

/**
 * Reject oversized bodies before / after buffering so the BFF cannot be used
 * as an unbounded memory sink for multipart uploads.
 */
export function assertProxyBodyWithinLimit(
  requestHeaders: Headers,
  body: ArrayBuffer | null,
): Response | null {
  const contentLength = requestHeaders.get("content-length");
  if (contentLength) {
    const declared = Number(contentLength);
    if (Number.isFinite(declared) && declared > MAX_PROXY_BODY_BYTES) {
      return Response.json(
        { message: "Request body too large" },
        { status: 413 },
      );
    }
  }
  if (body && body.byteLength > MAX_PROXY_BODY_BYTES) {
    return Response.json(
      { message: "Request body too large" },
      { status: 413 },
    );
  }
  return null;
}

export type ProxyToBackendArgs = {
  method: string;
  pathSegments: string[];
  search: string;
  requestHeaders: Headers;
  body: ArrayBuffer | null;
  accessToken: string | null | undefined;
  upstreamBase: string;
  fetchImpl?: typeof fetch;
};

export async function proxyToBackend(
  args: ProxyToBackendArgs,
): Promise<Response> {
  const accessToken =
    typeof args.accessToken === "string" ? args.accessToken.trim() : "";
  if (!accessToken) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  const headers = filterOutgoingRequestHeaders(args.requestHeaders);
  headers.set("Authorization", `Bearer ${accessToken}`);

  const method = args.method.toUpperCase();
  const upstreamUrl = buildUpstreamUrl(
    args.upstreamBase,
    args.pathSegments,
    args.search,
  );

  const fetchImpl = args.fetchImpl ?? fetch;
  const init: RequestInit = {
    method,
    headers,
    redirect: "manual",
  };
  if (method !== "GET" && method !== "HEAD" && args.body) {
    init.body = args.body;
  }

  const upstream = await fetchImpl(upstreamUrl, init);
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("connection");
  responseHeaders.delete("content-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

/** Browser real-API traffic goes through the BFF; Nest is only hit server-side. */
export function resolveAdminApiBaseURL(options: {
  realApiUrl: string | undefined;
  isBrowser: boolean;
  appOrigin?: string;
}): string {
  const realApi = options.realApiUrl?.replace(/\/+$/, "");
  if (realApi) {
    return options.isBrowser ? "/api/backend" : realApi;
  }
  if (options.isBrowser) {
    return "/api/mock";
  }
  const origin = (options.appOrigin || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${origin}/api/mock`;
}
