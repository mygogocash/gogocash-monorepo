import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { getLearnArticles } from "@/lib/learn-data";
import { uiLinkCta } from "@/lib/ui-classes";

export const metadata: Metadata = {
  title: "Learn | GoGoCash Cashback Guides",
  description:
    "Plain-language guides on how cashback works, withdrawals, tracking, Saving Plus, and shopping smart in Southeast Asia.",
  alternates: { canonical: "/learn" },
};

export default async function LearnHubPage() {
  const articles = await getLearnArticles();

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
            Learn
          </h1>
          <p className="mt-3 max-w-2xl text-base text-gray-600">
            Short guides that pair well with the GoGoCash app — start here, then
            open live offers on your phone.
          </p>
          <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/learn/${a.slug}`}
                  className="flex h-full min-w-0 flex-col rounded-2xl border border-gray-100 bg-cream/40 p-6 transition hover:border-primary/25 hover:shadow-sm"
                >
                  <span className="text-lg font-semibold text-gray-900">
                    {a.title}
                  </span>
                  <span className="mt-2 flex-1 text-sm text-gray-600">
                    {a.hubDesc}
                  </span>
                  <span className={`mt-4 text-sm ${uiLinkCta}`}>
                    Read →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
