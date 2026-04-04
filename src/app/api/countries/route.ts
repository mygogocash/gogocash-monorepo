import { parseRestCountriesPayload, sortCountriesByName } from "@/lib/countries/restCountries";
import { NextResponse } from "next/server";

const UPSTREAM = "https://restcountries.com/v3.1/all?fields=name,cca2,flags";

export async function GET() {
  try {
    const response = await fetch(UPSTREAM, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Upstream service unavailable" }, { status: 502 });
    }

    const raw: unknown = await response.json();
    const parsed = parseRestCountriesPayload(raw);
    if (!parsed.ok) {
      return NextResponse.json({ error: "Invalid upstream response" }, { status: 502 });
    }

    const data = sortCountriesByName(parsed.data);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load countries" }, { status: 504 });
  }
}
