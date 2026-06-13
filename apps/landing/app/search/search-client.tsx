"use client";

import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { logSiteSearch } from "@/lib/analytics-client";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { twCtaPrimaryMotion } from "@/lib/motion-styles";
import { uiCtaPrimarySurfaceRoundedXl } from "@/lib/ui-classes";

export default function SearchClient() {
  const searchParams = useSearchParams();
  const q = useMemo(
    () => (searchParams.get("q") ?? "").trim(),
    [searchParams],
  );

  const lastLoggedQuery = useRef<string | null>(null);
  useEffect(() => {
    if (!q) return;
    if (lastLoggedQuery.current === q) return;
    lastLoggedQuery.current = q;
    logSiteSearch(q);
  }, [q]);

  return (
    <>
      <Header />
      <main role="main" className="min-h-[60vh] min-w-0 bg-white">
        <div className="mx-auto min-w-0 max-w-site px-4 pb-24 pt-28 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8">
            <Link
              href="/"
              className="text-sm font-medium text-primary transition-colors hover:text-primary-dark"
            >
              ← Back to home
            </Link>
          </nav>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Search GoGoCash
          </h1>
          <p className="mt-3 max-w-2xl text-base text-gray-600">
            Start from the homepage to browse merchants, or open the app to see
            live offers and quests. This page exists so search engines and
            assistants can surface a consistent entry point.
          </p>

          <form
            className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
            action="/search"
            method="get"
            role="search"
            aria-label="Site search"
          >
            <label htmlFor="site-search-q" className="sr-only">
              Search query
            </label>
            <input
              id="site-search-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Try “Shopee cashback” or “Lazada”"
              className="min-h-11 w-full min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-2 text-base text-gray-900 shadow-sm outline-none ring-primary/30 focus:border-primary focus:ring-2"
              autoComplete="off"
            />
            <button
              type="submit"
              className={`min-h-11 px-6 py-2 text-sm ${uiCtaPrimarySurfaceRoundedXl} ${twCtaPrimaryMotion}`}
            >
              Search
            </button>
          </form>

          {q ? (
            <section
              className="mt-10 rounded-2xl border border-gray-100 bg-gray-50/80 p-6"
              aria-live="polite"
            >
              <h2 className="text-lg font-semibold text-gray-900">
                You searched for &ldquo;{q}&rdquo;
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                For merchant-specific cashback rates, open the GoGoCash app or
                browse partners on the{" "}
                <Link href="/#brands" className="font-medium text-primary hover:underline">
                  homepage partner strip
                </Link>
                . Guides live under{" "}
                <Link href="/learn/how-cashback-works" className="font-medium text-primary hover:underline">
                  Learn
                </Link>
                .
              </p>
            </section>
          ) : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
