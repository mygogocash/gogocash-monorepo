import { NextRequest, NextResponse } from "next/server";
import { mockCoupons } from "@/app/api/mock/data";

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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");
  const search = (url.searchParams.get("search") || "").toLowerCase();

  let list = mockCoupons;
  if (search) {
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(search) ||
        c.code.toLowerCase().includes(search) ||
        (c.offer_id?.offer_name ?? "").toLowerCase().includes(search)
    );
  }

  const result = paginateFlat(list, page, limit);
  return NextResponse.json(result);
}
