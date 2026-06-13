import type { ReactNode } from "react";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function LegalDocumentShell({
  title,
  effectiveDate,
  dateLabel = "Effective Date",
  children,
}: {
  title: string;
  effectiveDate: string;
  /** Shown before the date (e.g. "Last updated" for guides). */
  dateLabel?: string;
  children: ReactNode;
}) {
  return (
    <>
      <Header />
      <main role="main" className="min-h-[60vh] min-w-0 bg-white">
        <div className="mx-auto min-w-0 max-w-site px-4 pb-24 pt-28 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8">
            <Link
              href="/"
              className="text-sm font-medium text-primary transition-colors duration-200 ease-out hover:text-primary-dark"
            >
              ← Back to home
            </Link>
          </nav>
          <article className="mx-auto min-w-0 max-w-3xl break-words">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-500">
              {dateLabel}: {effectiveDate}
            </p>
            <div className="mt-10">{children}</div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
