import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import LaunchAppLink from "@/components/launch-app-link";
import { ArrowUpRight } from "@/components/icons";
import { LINE_OFFICIAL_ACCOUNT_HREF } from "@/components/social-data";
import { SITE_FACTS, siteSeoOneLiner } from "@/lib/site-facts";
import { twCtaPrimaryMotion } from "@/lib/motion-styles";
import { uiCtaPrimarySurface } from "@/lib/ui-classes";

export const metadata: Metadata = {
  title: "About GoGoCash | Cashback Across Southeast Asia",
  description: siteSeoOneLiner(),
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
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
          <article className="mx-auto min-w-0 max-w-3xl break-words">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              About GoGoCash
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Last updated: March 22, 2026
            </p>
            <div className="prose prose-gray mt-10 max-w-none space-y-6 text-base leading-relaxed text-gray-600">
              <p>
                GoGoCash is a shopping-to-earn platform built for{" "}
                <strong className="text-gray-800">{SITE_FACTS.regionLabel}</strong>
                . We partner with {SITE_FACTS.partnerCountLabel} merchants
                including marketplaces, travel, and electronics so you can earn{" "}
                <strong className="text-gray-800">real cashback</strong> on
                purchases you were already planning.
              </p>
              <p>
                Our mission is simple: make rewards{" "}
                <strong className="text-gray-800">transparent</strong>. You see
                rates before you shop, track orders in one place, and withdraw
                when you hit the minimum shown in your wallet.
              </p>
              <p>
                GoGoCash is available via{" "}
                <strong className="text-gray-800">Telegram</strong>,{" "}
                <strong className="text-gray-800">LINE</strong> mini apps, and
                the web — same partners, optimized for small screens.
              </p>
              <p>
                Curious how we earn revenue? Read{" "}
                <Link
                  href="/how-gogocash-makes-money"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  How GoGoCash makes money
                </Link>{" "}
                and our{" "}
                <Link
                  href="/privacy-policy"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </p>
              <h2 className="mt-10 text-xl font-bold text-gray-900">
                Help and contact
              </h2>
              <p>
                For product questions or tracking issues, contact us via{" "}
                <a
                  href={LINE_OFFICIAL_ACCOUNT_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  LINE Official Account
                </a>{" "}
                or open the app. We do not provide personalized financial or
                investment advice on this site.
              </p>
            </div>
            <LaunchAppLink
              className={`mt-10 inline-flex min-h-11 items-center gap-2 px-6 py-3 text-sm ${uiCtaPrimarySurface} ${twCtaPrimaryMotion}`}
            >
              Launch app
              <ArrowUpRight className="h-4 w-4" />
            </LaunchAppLink>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
