import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { mockAdminUsers, mockUsers, mockOffers } from "../data";
import { handleMockApiRequest } from "@/lib/mockApiCore";

const isFirebaseStaticExport = process.env.BUILD_FOR_FIREBASE === "1";

/** Next 16 requires `dynamic` to be a static literal. "force-dynamic" prevents
 *  DYNAMIC_SERVER_USAGE errors on Node/Cloud Run deploys. If Firebase static
 *  export is re-enabled, change this to "auto" and rebuild. */
export const dynamic = "force-dynamic";

/**
 * Enumerate mock API paths for static export. Deduplicated because GET/POST/PUT may share paths.
 */
export function generateStaticParams() {
  if (!isFirebaseStaticExport) {
    return [];
  }

  const segments: string[][] = [];

  const add = (...p: string[]) => {
    segments.push(p);
  };

  add("admin", "login");
  add("admin");
  for (const u of mockAdminUsers) add("admin", u._id);
  add("dashboard", "stats");
  add("dashboard", "summary");
  add("user");
  for (const u of mockUsers) add("user", u._id);
  add("offer", "admin");
  add("offer", "get-category", "list");
  for (const o of mockOffers) {
    add("offer", "get-coupon-id", o._id);
    add("offer", o._id);
  }
  add("admin", "withdraw-all");
  add("admin", "created-conversions");
  add("admin", "conversion-all");
  add("admin", "get-fee-rate");
  add("admin", "banner-home");
  add("admin", "banner-home-small");
  add("admin", "banner-all-brand-page");
  add("admin", "banner-specific-page", "all-brands");
  add("admin", "banner-specific-page", "all-shops");
  add("admin", "banner-specific-page", "product-discovery");
  add("admin", "get-mycashback-user", "u1");
  add("admin", "list-mycashback-users");
  add("auth", "profile");
  add("involve");
  add("offer", "get-coupon");
  add("admin", "register");
  add("withdraw", "list-check-admin");
  add("withdraw", "list-check-admin", "u1");
  add("withdraw", "update-withdraw-user");
  add("withdraw", "send-user-contact-otp");
  add("withdraw", "verify-user-contact-otp");
  add("withdraw", "check-my-cashback-admin");
  add("admin", "getConversionInWithdraw");
  add("offer");
  add("admin", "add-conversion");
  add("admin", "invite");
  add("admin", "update-fee-rate");
  add("admin", "update-conversion", "600001");

  const seen = new Set<string>();
  const out: { path: string[] }[] = [];
  for (const path of segments) {
    const key = path.join("/");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ path });
  }
  return out;
}

function toNextResponse(r: { status: number; body: unknown }) {
  return NextResponse.json(r.body, { status: r.status });
}

/** Resolve the caller's RBAC role from the NextAuth JWT for API enforcement. */
async function roleFromRequest(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  // Return the raw role id (built-in or custom) so the store-based check can
  // resolve it; do NOT coerce to a built-in tier (that would treat custom
  // roles as viewer and mis-enforce permissions).
  const role = (token as { role?: string } | null)?.role;
  return typeof role === "string" && role ? role : "viewer";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const r = await handleMockApiRequest({
    method: "GET",
    path,
    searchParams: new URL(request.url).searchParams,
    body: undefined,
    role: await roleFromRequest(request),
  });
  return toNextResponse(r);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  let body: unknown;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const bodyObj: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (value.size === 0) continue;
        bodyObj[key] =
          `uploads/${path.join("/")}/${key}/${Date.now()}-${safeName(value.name)}`;
      } else {
        bodyObj[key] = String(value);
      }
    }
    body = bodyObj;
  } else {
    body = await request.json().catch(() => undefined);
  }

  const r = await handleMockApiRequest({
    method: "POST",
    path,
    searchParams: new URL(request.url).searchParams,
    body,
    role: await roleFromRequest(request),
  });
  return toNextResponse(r);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const body = await request.json().catch(() => ({}));
  const r = await handleMockApiRequest({
    method: "PUT",
    path,
    searchParams: new URL(request.url).searchParams,
    body,
    role: await roleFromRequest(request),
  });
  return toNextResponse(r);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  let body: unknown = {};

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const resourceId = path[path.length - 1] ?? "x";
    const bodyObj: Record<string, string | undefined> = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        if (value.size === 0) continue;
        if (path[0] === "admin" && path[1] === "update-category") {
          if (key === "image") {
            bodyObj[key] =
              `category/${resourceId}/${Date.now()}-${safeName(value.name)}`;
          } else if (key === "banner") {
            bodyObj[key] =
              `category-banner/${resourceId}/${Date.now()}-${safeName(value.name)}`;
          } else {
            bodyObj[key] =
              `uploads/category/${resourceId}/${key}/${Date.now()}-${safeName(value.name)}`;
          }
        } else if (path[0] === "admin" && path[1] === "update-offer") {
          bodyObj[key] =
            `uploads/offer/${resourceId}/${key}/${Date.now()}-${safeName(value.name)}`;
        } else {
          bodyObj[key] =
            `uploads/${path.join("/")}/${key}/${Date.now()}-${safeName(value.name)}`;
        }
      } else {
        bodyObj[key] = String(value);
      }
    }
    body = bodyObj;
  } else {
    body = await request.json().catch(() => ({}));
  }

  const r = await handleMockApiRequest({
    method: "PATCH",
    path,
    searchParams: new URL(request.url).searchParams,
    body,
    role: await roleFromRequest(request),
  });
  return toNextResponse(r);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const r = await handleMockApiRequest({
    method: "DELETE",
    path,
    searchParams: new URL(request.url).searchParams,
    body: undefined,
    role: await roleFromRequest(request),
  });
  return toNextResponse(r);
}
