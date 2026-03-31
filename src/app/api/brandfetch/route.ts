import { env } from "@/env";
import { runBrandfetchGet } from "@/lib/brandfetch/handler";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  const result = await runBrandfetchGet(domain, env.BRANDFETCH_API_KEY, fetch);

  const cacheOk = result.status === 200 && result.body.ok;

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      "Content-Type": "application/json",
      ...(cacheOk
        ? { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" }
        : {}),
    },
  });
}
