import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  assertProxyBodyWithinLimit,
  proxyToBackend,
  resolveUpstreamBaseUrl,
  sessionExpiredResponse,
} from "@/lib/backendProxy";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const upstreamBase = resolveUpstreamBaseUrl();
  if (!upstreamBase) {
    // Keep the real cause in the server logs for ops — the client only ever
    // gets a generic message that never names env vars or internal config.
    console.error(
      "[api/backend] Upstream API base URL is not configured — set API_URL (or NEXT_PUBLIC_API_URL).",
    );
    return Response.json(
      {
        message:
          "This service is temporarily unavailable. Please try again later, or contact an administrator if it continues.",
      },
      { status: 503 },
    );
  }

  const tooLargeBeforeRead = assertProxyBodyWithinLimit(request.headers, null);
  if (tooLargeBeforeRead) return tooLargeBeforeRead;

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const accessToken =
    token && typeof (token as { accessToken?: unknown }).accessToken === "string"
      ? (token as { accessToken: string }).accessToken
      : null;
  // No session (or a session without a Nest JWT): answer here — never read the
  // body or touch the upstream on behalf of an unauthenticated browser.
  if (!accessToken || !accessToken.trim()) {
    return sessionExpiredResponse();
  }

  const { path } = await context.params;
  const pathSegments = Array.isArray(path) ? path : [];
  const search = request.nextUrl.search || "";

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? null : await request.arrayBuffer();

  const tooLargeAfterRead = assertProxyBodyWithinLimit(request.headers, body);
  if (tooLargeAfterRead) return tooLargeAfterRead;

  return proxyToBackend({
    method,
    pathSegments,
    search,
    requestHeaders: request.headers,
    body,
    accessToken,
    upstreamBase,
  });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
