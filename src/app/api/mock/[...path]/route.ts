import { NextRequest, NextResponse } from "next/server";
import {
  mockAdminUsers,
  mockUsers,
  mockOffers,
  mockWithdraws,
  mockConversions,
  mockFee,
  mockBanner,
  mockCategories,
  mockCoupons,
  mockMyCashback,
  mockWithdrawDetail,
  mockMCBDetail,
} from "../data";

// In-memory store for conversions created via Add conversion (admin)
const OFFER_NAMES: Record<number, string> = {
  1001: "Shopee TH - CPS",
  1002: "Lazada TH - CPS",
  1003: "Agoda - CPS",
  1004: "GrabFood TH",
};
type CreatedConversionItem = {
  conversion_id: number;
  offer_id: number;
  offer_name: string;
  aff_sub1: string;
  adv_sub1: string;
  adv_sub2: string;
  adv_sub3: string;
  adv_sub4: string | null;
  adv_sub5: string;
  sale_amount: string;
  payout: string;
  currency: string;
  conversion_status: string;
  remark?: string;
  datetime_conversion: string;
  createdAt: string;
  updatedAt: string;
  user?: { _id: string; username?: string; email?: string };
};

const MOCK_CREATED_CONVERSIONS_BASE = [
  { offer_id: 1001, offer_name: "Shopee TH - CPS", aff_sub1: "u1", adv_sub2: "order_mock_001", sale_amount: "1500.00", payout: "75.00", currency: "THB", conversion_status: "approved" as const, remark: "Manual add - campaign" },
  { offer_id: 1002, offer_name: "Lazada TH - CPS", aff_sub1: "u1", adv_sub2: "order_mock_002", sale_amount: "3200.50", payout: "128.02", currency: "THB", conversion_status: "pending" as const, remark: "" },
  { offer_id: 1003, offer_name: "Agoda - CPS", aff_sub1: "u2", adv_sub2: "order_mock_003", sale_amount: "450.00", payout: "27.00", currency: "USD", conversion_status: "approved" as const, remark: "Hotel booking" },
  { offer_id: 1004, offer_name: "GrabFood TH", aff_sub1: "u2", adv_sub2: "order_mock_004", sale_amount: "280.00", payout: "8.40", currency: "THB", conversion_status: "rejected" as const, remark: "" },
  { offer_id: 1001, offer_name: "Shopee TH - CPS", aff_sub1: "68bf99fed9667685c1637607", adv_sub2: "order_mock_005", sale_amount: "890.00", payout: "44.50", currency: "THB", conversion_status: "approved" as const, remark: "Created via admin" },
  { offer_id: 1002, offer_name: "Lazada TH - CPS", aff_sub1: "u3", adv_sub2: "order_mock_006", sale_amount: "2100.00", payout: "84.00", currency: "THB", conversion_status: "pending" as const, remark: "Flash sale" },
];

function buildMockCreatedConversions(): CreatedConversionItem[] {
  const now = new Date();
  const toIso = (d: Date) => d.toISOString();
  return MOCK_CREATED_CONVERSIONS_BASE.map((base, i) => {
    const created = new Date(now);
    created.setDate(created.getDate() - (i + 1));
    const createdIso = toIso(created);
    return {
      conversion_id: 600100 + i,
      offer_id: base.offer_id,
      offer_name: base.offer_name,
      aff_sub1: base.aff_sub1,
      adv_sub1: "order",
      adv_sub2: base.adv_sub2,
      adv_sub3: "",
      adv_sub4: null,
      adv_sub5: "",
      sale_amount: base.sale_amount,
      payout: base.payout,
      currency: base.currency,
      conversion_status: base.conversion_status,
      ...(base.remark ? { remark: base.remark } : {}),
      datetime_conversion: createdIso,
      createdAt: createdIso,
      updatedAt: toIso(now),
      user: { _id: base.aff_sub1 },
    };
  });
}

const createdConversionsList: CreatedConversionItem[] = buildMockCreatedConversions();

// In-memory store for category policy (terms & conditions) per categoryId
const policyStore = new Map<string, string>();

function paginate<T>(items: T[], page = 1, limit = 10) {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    },
  };
}

function paginateFlat<T>(items: T[], page = 1, limit = 10) {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    page,
    limit,
    total: items.length,
    totalPages: Math.ceil(items.length / limit),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const joined = path.join("/");
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const search = url.searchParams.get("search") || "";

  // POST /admin/login
  if (joined === "admin/login") {
    return NextResponse.json({
      _id: "a1",
      username: "admin",
      email: "admin@gogocash.co",
      password: "hashed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
      token: "mock-jwt-token-for-development",
    });
  }

  // GET /admin (admin users list)
  if (joined === "admin") {
    let filtered = mockAdminUsers;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.username.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s)
      );
    }
    return NextResponse.json(paginate(filtered, page, limit));
  }

  // GET /admin/:id
  if (joined.startsWith("admin/") && !joined.includes("/")) {
    const id = path[1];
    const user = mockAdminUsers.find((u) => u._id === id);
    return user
      ? NextResponse.json(user)
      : NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // GET /dashboard/stats (user counts for dashboard)
  if (joined === "dashboard/stats") {
    return NextResponse.json({
      gogocashUsers: mockUsers.length,
      mycashbackUsers: mockMyCashback.length,
    });
  }

  // GET /dashboard/summary (management insights: conversion + withdraw aggregates)
  if (joined === "dashboard/summary") {
    const withdrawByStatus = { pending: { count: 0, total: 0 }, approved: { count: 0, total: 0 }, rejected: { count: 0, total: 0 } };
    for (const w of mockWithdraws) {
      const status = (w.status?.toLowerCase() || "pending") as keyof typeof withdrawByStatus;
      if (withdrawByStatus[status]) {
        withdrawByStatus[status].count += 1;
        withdrawByStatus[status].total += Number(w.amount_total) || 0;
      }
    }
    let conversionTotalPayout = 0;
    for (const c of mockConversions) {
      conversionTotalPayout += Number(c.payout) || 0;
    }
    return NextResponse.json({
      conversionCount: mockConversions.length,
      conversionTotalPayout: Math.round(conversionTotalPayout * 100) / 100,
      withdrawByStatus,
    });
  }

  // GET /user (regular users list)
  if (joined === "user") {
    let filtered = mockUsers;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.username.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s)
      );
    }
    return NextResponse.json(paginate(filtered, page, limit));
  }

  // GET /user/:id
  if (path[0] === "user" && path.length === 2) {
    const id = path[1];
    const user = mockUsers.find((u) => u._id === id);
    return user
      ? NextResponse.json(user)
      : NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // GET /offer/admin (offers list)
  if (joined === "offer/admin") {
    let filtered = mockOffers;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.offer_name.toLowerCase().includes(s) ||
          o.offer_name_display.toLowerCase().includes(s)
      );
    }
    return NextResponse.json(paginateFlat(filtered, page, limit));
  }

  // GET /offer/get-category/list
  if (joined === "offer/get-category/list") {
    let filtered = mockCategories;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(s));
    }
    return NextResponse.json(filtered);
  }

  // GET /policy?categoryId=xxx — terms & conditions for a category
  // GET /policy/list — all policies as { [categoryId]: content }
  if (path[0] === "policy") {
    if (path[1] === "list") {
      const all = Object.fromEntries(policyStore);
      return NextResponse.json(all);
    }
    const categoryId = url.searchParams.get("categoryId");
    if (!categoryId) {
      return NextResponse.json(
        { message: "categoryId is required" },
        { status: 400 }
      );
    }
    const content = policyStore.get(categoryId) ?? "";
    return NextResponse.json({ content });
  }

  // GET /offer/get-coupon-id/:id
  if (path[0] === "offer" && path[1] === "get-coupon-id") {
    const offerId = path[2];
    const coupons = mockCoupons.filter((c) => c.offer_id._id === offerId);
    return NextResponse.json(coupons);
  }

  // GET /offer/:id (single offer)
  if (path[0] === "offer" && path.length === 2) {
    const id = path[1];
    const offer = mockOffers.find((o) => o._id === id);
    return offer
      ? NextResponse.json(offer)
      : NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  // GET /admin/withdraw-all
  if (joined === "admin/withdraw-all") {
    let filtered = mockWithdraws;
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          String(w._id).toLowerCase().includes(s) ||
          (w.account_name && w.account_name.toLowerCase().includes(s)) ||
          (w.bank_name && w.bank_name.toLowerCase().includes(s)) ||
          (typeof w.user_id === "object" &&
            w.user_id &&
            ((w.user_id as { username?: string }).username?.toLowerCase().includes(s) ||
              (w.user_id as { email?: string }).email?.toLowerCase().includes(s)))
      );
    }
    return NextResponse.json(paginate(filtered, page, limit));
  }

  // GET /admin/created-conversions (conversions added via Add conversion form)
  if (joined === "admin/created-conversions") {
    const result = paginate(createdConversionsList, page, limit);
    return NextResponse.json({
      status: "success",
      message: "Created conversions retrieved",
      data: result.data,
      pagination: result.pagination,
    });
  }

  // GET /admin/conversion-all
  if (joined === "admin/conversion-all") {
    const status = url.searchParams.get("status") || "";
    let filtered = mockConversions;
    if (status) {
      filtered = filtered.filter((c) => c.conversion_status === status);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.offer_name.toLowerCase().includes(s) ||
          String(c.conversion_id).includes(s)
      );
    }
    return NextResponse.json({
      status: "success",
      message: "Conversions retrieved",
      ...paginate(filtered, page, limit),
    });
  }

  // GET /admin/get-fee-rate
  if (joined === "admin/get-fee-rate") {
    return NextResponse.json(mockFee);
  }

  // GET /admin/banner-home
  if (joined === "admin/banner-home") {
    return NextResponse.json(mockBanner);
  }

  // GET /admin/get-mycashback-user/:id
  if (path[0] === "admin" && path[1] === "get-mycashback-user") {
    return NextResponse.json(mockMyCashback);
  }

  // GET /auth/profile
  if (joined === "auth/profile") {
    return NextResponse.json({
      _id: "a1",
      username: "admin",
      email: "admin@gogocash.co",
      password: "hashed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
      token: "mock-jwt-token-for-development",
    });
  }

  // GET /involve (update offer list from involve asia)
  if (joined === "involve") {
    return NextResponse.json(mockOffers);
  }

  // GET /offer/get-coupon
  if (joined === "offer/get-coupon") {
    return NextResponse.json(paginateFlat(mockCoupons, page, limit));
  }

  // Fallback
  return NextResponse.json(
    { message: `Mock endpoint not found: GET /${joined}` },
    { status: 404 }
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const joined = path.join("/");

  // POST /admin/login — mock password: 1234
  if (joined === "admin/login") {
    const body = (await request.json()) as { email?: string; password?: string };
    const password = body?.password ?? "";
    if (password !== "1234") {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }
    const email = (body?.email ?? "").trim().toLowerCase();
    const admin = mockAdminUsers.find((u) => u.email.toLowerCase() === email) ?? mockAdminUsers[0];
    return NextResponse.json({
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      password: "hashed",
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      __v: 0,
      token: "mock-jwt-token-for-development",
    });
  }

  // POST /admin/register
  if (joined === "admin/register") {
    const body = await request.json();
    return NextResponse.json({
      id: "a_new",
      name: body.name,
      email: body.email,
      message: "User registered successfully",
    });
  }

  // POST /withdraw/list-check-admin/:id
  if (path[0] === "withdraw" && path[1] === "list-check-admin") {
    return NextResponse.json(mockWithdrawDetail);
  }

  // POST /withdraw/check-my-cashback-admin/:id
  if (path[0] === "withdraw" && path[1] === "check-my-cashback-admin") {
    return NextResponse.json(mockMCBDetail);
  }

  // POST /admin/getConversionInWithdraw
  if (joined === "admin/getConversionInWithdraw") {
    return NextResponse.json({
      status: "success",
      message: "ok",
      data: { page: 1, limit: 10, count: 0, nextPage: null, data: [] },
    });
  }

  // POST /offer (create offer)
  if (joined === "offer") {
    const body = await request.json();
    return NextResponse.json({ _id: "o_new", ...body });
  }

  // POST /admin (create admin user)
  if (joined === "admin") {
    const body = await request.json();
    return NextResponse.json({ _id: "a_new", ...body });
  }

  // POST /admin/add-conversion
  if (joined === "admin/add-conversion") {
    const body = (await request.json()) as {
      offer_id?: number;
      aff_sub1?: string;
      sale_amount?: string;
      payout?: string;
      currency?: string;
      conversion_status?: string;
      adv_sub2?: string;
      remark?: string;
    };
    const offerId = body?.offer_id ?? 1001;
    const userId = (body?.aff_sub1 ?? "").trim();
    const saleAmount = body?.sale_amount ?? "0.00";
    const payout = body?.payout ?? "0.00";
    const currency = body?.currency ?? "THB";
    const status = body?.conversion_status ?? "pending";
    const orderId = body?.adv_sub2 ?? `order_${Date.now()}`;
    const remark = (body?.remark ?? "").trim() || undefined;
    if (!userId) {
      return NextResponse.json(
        { message: "User ID (aff_sub1) is required" },
        { status: 400 }
      );
    }
    const conversionId = 600000 + Math.floor(Math.random() * 99999);
    const nowIso = new Date().toISOString();
    createdConversionsList.push({
      conversion_id: conversionId,
      offer_id: offerId,
      offer_name: OFFER_NAMES[offerId] ?? "Unknown",
      aff_sub1: userId,
      adv_sub1: "order",
      adv_sub2: orderId,
      adv_sub3: "",
      adv_sub4: null,
      adv_sub5: "",
      sale_amount: saleAmount,
      payout,
      currency,
      conversion_status: status,
      ...(remark && { remark }),
      datetime_conversion: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      user: { _id: userId },
    });
    return NextResponse.json({
      message: "Conversion added successfully",
      conversion_id: conversionId,
      offer_id: offerId,
      aff_sub1: userId,
      sale_amount: saleAmount,
      payout,
      currency,
      conversion_status: status,
      adv_sub2: orderId,
      ...(remark !== undefined && { remark }),
    });
  }

  // POST /admin/invite (send admin invitation – add as pending to list)
  if (joined === "admin/invite") {
    const body = (await request.json()) as { email?: string };
    const email = (body?.email || "").trim();
    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }
    const existing = mockAdminUsers.some(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      );
    }
    const inviteId = `inv_${Date.now()}`;
    const username = email.split("@")[0] || "Pending";
    mockAdminUsers.push({
      _id: inviteId,
      username,
      password: "",
      email,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
    });
    return NextResponse.json({
      message: `Invitation sent to ${email}`,
    });
  }

  // POST /user (create user)
  if (joined === "user") {
    const body = await request.json();
    return NextResponse.json({ _id: "u_new", ...body });
  }

  // Fallback
  return NextResponse.json(
    { message: `Mock endpoint not found: POST /${joined}` },
    { status: 404 }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const joined = path.join("/");
  const body = await request.json();

  // PUT /offer/:id
  if (path[0] === "offer" && path.length === 2) {
    const offer = mockOffers.find((o) => o._id === path[1]);
    return NextResponse.json({ ...offer, ...body });
  }

  // PUT /admin/:id
  if (path[0] === "admin" && path.length === 2) {
    const user = mockAdminUsers.find((u) => u._id === path[1]);
    return NextResponse.json({ ...user, ...body });
  }

  // PUT /user/:id
  if (path[0] === "user" && path.length === 2) {
    const user = mockUsers.find((u) => u._id === path[1]);
    return NextResponse.json({ ...user, ...body });
  }

  // PUT /policy — save terms & conditions for a category
  if (joined === "policy") {
    const categoryId = body?.categoryId;
    const content = typeof body?.content === "string" ? body.content : "";
    if (!categoryId) {
      return NextResponse.json(
        { message: "categoryId is required" },
        { status: 400 }
      );
    }
    policyStore.set(categoryId, content);
    return NextResponse.json({
      success: true,
      message: "Policy saved",
      categoryId,
    });
  }

  return NextResponse.json(
    { message: `Mock endpoint not found: PUT /${joined}` },
    { status: 404 }
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const joined = path.join("/");
  const body = await request.json().catch(() => ({}));

  // PATCH /admin/update-conversion/:conversionId (update status and info for created conversions)
  if (path[0] === "admin" && path[1] === "update-conversion" && path[2]) {
    const conversionId = parseInt(path[2], 10);
    if (Number.isNaN(conversionId)) {
      return NextResponse.json(
        { message: "Invalid conversion ID" },
        { status: 400 }
      );
    }
    const updateBody = body as {
      conversion_status?: string;
      sale_amount?: string | number;
      payout?: string | number;
      remark?: string;
      adv_sub2?: string;
    };
    const item = createdConversionsList.find((c) => c.conversion_id === conversionId);
    if (!item) {
      return NextResponse.json(
        { message: "Conversion not found or not editable" },
        { status: 404 }
      );
    }
    if (updateBody.conversion_status !== undefined) item.conversion_status = updateBody.conversion_status;
    if (updateBody.sale_amount !== undefined) item.sale_amount = String(updateBody.sale_amount);
    if (updateBody.payout !== undefined) item.payout = String(updateBody.payout);
    if (updateBody.remark !== undefined) item.remark = updateBody.remark;
    if (updateBody.adv_sub2 !== undefined) item.adv_sub2 = updateBody.adv_sub2;
    item.updatedAt = new Date().toISOString();
    return NextResponse.json({
      message: "Conversion updated successfully",
      conversion_id: conversionId,
    });
  }

  // PATCH /admin/update-fee-rate/:id
  if (path[0] === "admin" && path[1] === "update-fee-rate") {
    return NextResponse.json({ ...mockFee[0], ...body });
  }

  return NextResponse.json(
    { message: `Mock endpoint not found: PATCH /${joined}` },
    { status: 404 }
  );
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const joined = path.join("/");

  // DELETE /admin/:id – remove from mock list so GET reflects deletion
  if (path[0] === "admin" && path.length === 2) {
    const id = path[1];
    const index = mockAdminUsers.findIndex((u) => u._id === id);
    if (index !== -1) {
      mockAdminUsers.splice(index, 1);
    }
    return NextResponse.json({ message: `Deleted admin ${id}` });
  }

  // DELETE /offer/:id, /user/:id
  if (path.length === 2) {
    return NextResponse.json({ message: `Deleted ${path[0]} ${path[1]}` });
  }

  return NextResponse.json(
    { message: `Mock endpoint not found: DELETE /${joined}` },
    { status: 404 }
  );
}
