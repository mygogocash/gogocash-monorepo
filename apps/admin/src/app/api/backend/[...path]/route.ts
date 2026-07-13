import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  proxyToBackend,
  resolveUpstreamBaseUrl,
} from "@/lib/backendProxy";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ path: string[] }> };

async function handle(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const upstreamBase = resolveUpstreamBaseUrl();
  if (!upstreamBase) {
    return Response.json(
      { message: "Backend API URL is not configured" },
      { status: 503 },
    );
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const accessToken =
    token && typeof (token as { accessToken?: unknown }).accessToken === "string"
      ? (token as { accessToken: string }).accessToken
      : null;

  const { path } = await context.params;
  const pathSegments = Array.isArray(path) ? path : [];
  const search = request.nextUrl.search || "";

  const method = request.method.toUpperCase();
  const body =
    method === "GET" || method === "HEAD" ? null : await request.arrayBuffer();

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
