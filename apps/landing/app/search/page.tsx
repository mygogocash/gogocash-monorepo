import { Suspense } from "react";
import type { Metadata } from "next";
import SearchClient from "./search-client";

export const metadata: Metadata = {
  title: "Search | GoGoCash",
  description:
    "Find GoGoCash merchants, guides, and cashback resources. Open the app for live rates.",
  alternates: { canonical: "/search" },
  robots: { index: true, follow: true },
};

function SearchFallback() {
  return (
    <div className="min-h-[40vh] bg-white px-6 pt-28 text-center text-gray-600">
      Loading search…
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchFallback />}>
      <SearchClient />
    </Suspense>
  );
}
