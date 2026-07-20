/**
 * Server-side BFF helpers for `/api/backend/[...path]`.
 * Browser clients call the same-origin proxy; this layer attaches the Nest JWT
 * from the NextAuth JWT cookie and never trusts a client Authorization header.
 */

import { normalizeAdminApiUrl } from "@/lib/adminApiMode";
import {
  resolveAdminUpstream,
  type AdminUpstreamResolution,
} from "@/lib/adminUpstreamSafety";

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

/**
 * Edge-owned headers (Cloudflare stamps these on the inbound leg when the
 * admin domain is proxied). A Cloudflare-proxied upstream rejects external
 * requests that already carry CF-Connecting-IP as header spoofing — error
 * 1000, a message-less 403 (verified 2026-07-19 against api-beta).
 */
const EDGE_OWNED_HEADERS = new Set(["cdn-loop", "true-client-ip"]);

function isEdgeOwnedHeader(lowerName: string): boolean {
  return lowerName.startsWith("cf-") || EDGE_OWNED_HEADERS.has(lowerName);
}

/**
 * Resolve Nest upstream for `/api/backend/*`.
 * On Railway, requires a private-safe `API_URL` (no public-edge fallback).
 */
export function resolveUpstreamBaseUrl(): string | null {
  const resolved = resolveAdminUpstream();
  return resolved.ok ? resolved.url : null;
}

/** Full resolution (ok / missing / unsafe) for BFF route error responses. */
export function resolveUpstreamBaseUrlDetailed(): AdminUpstreamResolution {
  return resolveAdminUpstream();
}

/** Structured 503 when the BFF upstream is missing or unsafe (#407). */
export function upstreamMisconfiguredResponse(
  resolution: Extract<AdminUpstreamResolution, { ok: false }>,
): Response {
  // Keep the real cause in server logs for ops — the client only ever gets a
  // generic message that never names env vars or internal hostnames.
  console.error(`[api/backend] ${resolution.code}: ${resolution.reason}`);
  return Response.json(
    {
      message:
        "This service is temporarily unavailable. Please try again later, or contact an administrator if it continues.",
      code: resolution.code,
    },
    { status: 503 },
  );
}

/**
 * Resolve the real API without letting a build-inlined public URL override the
 * server's environment-local Railway/private upstream. Browser traffic still
 * uses the public value only as the real-API/BFF mode signal.
 */
export function resolveAdminRuntimeApiUrl(options: {
  isBrowser: boolean;
  publicApiUrl: string | undefined;
  serverApiUrl: string | undefined;
}): string | undefined {
  const publicApiUrl = normalizeAdminApiUrl(options.publicApiUrl);
  const serverApiUrl = normalizeAdminApiUrl(options.serverApiUrl);
  return !options.isBrowser && serverApiUrl ? serverApiUrl : publicApiUrl;
}

export function buildUpstreamUrl(
  upstreamBase: string,
  pathSegments: string[],
  search: string,
): string {
  const path = pathSegments.map(encodeURIComponent).join("/");
  const query = search.startsWith("?") ? search : search ? `?${search}` : "";
  return `${upstreamBase}/${path}${query}`;
}

/** Strip hop-by-hop, edge-owned (cf-*), cookie, and client Authorization headers. */
export function filterOutgoingRequestHeaders(incoming: Headers): Headers {
  const outgoing = new Headers();
  incoming.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (isEdgeOwnedHeader(lower)) return;
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
        {
          message:
            "The file you're uploading is too large. Please use a smaller file (under 32 MB).",
        },
        { status: 413 },
      );
    }
    // #487 — if Next truncated the buffered body below Content-Length, refuse
    // to forward a partial multipart (avoids Nest "Unexpected end of form").
    if (
      body &&
      Number.isFinite(declared) &&
      declared > 0 &&
      body.byteLength < declared
    ) {
      return Response.json(
        {
          message:
            "Upload was cut off before it finished. Use a file under 32 MB, or compress the image, then try again.",
        },
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

/**
 * 401 for a missing/expired NextAuth session (or one without a Nest JWT).
 * Answered by the BFF itself — the request must never be forwarded upstream
 * unauthenticated. The axios client keys its sign-in redirect off this 401.
 */
export function sessionExpiredResponse(): Response {
  return Response.json(
    { message: "Session expired. Please sign in again." },
    { status: 401 },
  );
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
    return sessionExpiredResponse();
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
  const realApi = normalizeAdminApiUrl(options.realApiUrl);
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
