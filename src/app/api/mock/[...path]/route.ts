import { NextRequest, NextResponse } from "next/server";
import { mockAdminUsers, mockUsers, mockOffers } from "../data";
import { handleMockApiRequest } from "@/lib/mockApiCore";

const isFirebaseStaticExport = process.env.BUILD_FOR_FIREBASE === "1";

/** Use literal so Next can parse segment config; Firebase static export sets BUILD_FOR_FIREBASE=1. */
export const dynamic = "auto";

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
  add("admin", "get-mycashback-user", "u1");
  add("auth", "profile");
  add("involve");
  add("offer", "get-coupon");
  add("admin", "register");
  add("withdraw", "list-check-admin");
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
  });
  return toNextResponse(r);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const body = await request.json().catch(() => undefined);
  const r = await handleMockApiRequest({
    method: "POST",
    path,
    searchParams: new URL(request.url).searchParams,
    body,
  });
  return toNextResponse(r);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const body = await request.json();
  const r = await handleMockApiRequest({
    method: "PUT",
    path,
    searchParams: new URL(request.url).searchParams,
    body,
  });
  return toNextResponse(r);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const body = await request.json().catch(() => ({}));
  const r = await handleMockApiRequest({
    method: "PATCH",
    path,
    searchParams: new URL(request.url).searchParams,
    body,
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
  });
  return toNextResponse(r);
}
