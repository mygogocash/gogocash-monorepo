import type { Metadata } from "next";
import Link from "next/link";
import { twCtaPrimaryMotion } from "@/lib/motion-styles";
import { uiCtaPrimarySurfaceRoundedXl } from "@/lib/ui-classes";
import Header from "@/components/header";
import Footer from "@/components/footer";
import LaunchAppLink from "@/components/launch-app-link";
import { ArrowUpRight } from "@/components/icons";
import { HREFLANG_LANDING_ALTERNATES } from "@/lib/seo-constants";

export const metadata: Metadata = {
  title: "GoGoCash — Cashback di Asia Tenggara",
  description:
    "Belanja di Shopee, Lazada, Agoda & 70+ merchant. Dapat cashback nyata — gratis. GoGoCash untuk Indonesia & SEA.",
  alternates: { canonical: "/id", languages: HREFLANG_LANDING_ALTERNATES },
  openGraph: {
    locale: "id_ID",
    title: "GoGoCash — Cashback nyata di Asia Tenggara",
    description:
      "Mulai dari tautan GoGoCash, belanja seperti biasa, dan klaim cashback setelah pesanan dikonfirmasi mitra.",
  },
};

export default function IndonesianLandingPage() {
  return (
    <>
      <Header />
      <main role="main" lang="id" className="min-h-[60vh] min-w-0 bg-white">
        <div className="mx-auto min-w-0 max-w-site px-4 pb-24 pt-28 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap gap-4 text-sm">
            <Link
              href="/"
              lang="en"
              className="font-medium text-primary hover:text-primary-dark"
            >
              English site
            </Link>
            <span className="text-gray-300" aria-hidden>
              |
            </span>
            <span className="font-medium text-gray-700">Bahasa Indonesia</span>
          </nav>
          <article className="mx-auto min-w-0 max-w-3xl break-words text-center md:text-left">
            <h1 className="text-balance text-3xl font-bold tracking-tight text-gray-900 md:text-4xl lg:text-5xl">
              Hemat setiap belanja dengan GoGoCash
            </h1>
            <p className="mt-4 text-lg font-medium text-gray-800">
              Cashback nyata di ratusan promo mitra SEA
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-gray-600 md:mx-0">
              Mulai perjalanan belanja dari GoGoCash (mini app atau web),
              checkout di merchant seperti biasa, dan cashback akan dicatat
              setelah pesanan dikonfirmasi. Tarik ke rekening atau e-wallet
              ketika saldo memenuhi minimum.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
              <LaunchAppLink
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 px-8 py-3.5 text-base sm:w-auto ${uiCtaPrimarySurfaceRoundedXl} ${twCtaPrimaryMotion}`}
              >
                Buka aplikasi
                <ArrowUpRight className="h-5 w-5 shrink-0" />
              </LaunchAppLink>
              <Link
                href="/learn/how-cashback-works"
                lang="en"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-8 py-3.5 text-base font-normal text-gray-900 shadow-sm transition hover:bg-gray-50 sm:w-auto"
              >
                How tracking works (EN)
              </Link>
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
