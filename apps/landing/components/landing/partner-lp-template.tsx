import Link from "next/link";
import Header from "@/components/header";
import Footer from "@/components/footer";
import LaunchAppLink from "@/components/launch-app-link";
import { ArrowUpRight } from "@/components/icons";
import { twCtaMutedOutlineMotion, twCtaPrimaryMotion } from "@/lib/motion-styles";
import { uiCtaPrimarySurfaceRoundedXl } from "@/lib/ui-classes";

export type PartnerLpTemplateProps = {
  partnerName: string;
  headline: string;
  description: string;
  bullets: readonly string[];
};

export default function PartnerLpTemplate({
  partnerName,
  headline,
  description,
  bullets,
}: PartnerLpTemplateProps) {
  return (
    <>
      <Header />
      <main
        role="main"
        className="min-h-[60vh] min-w-0 bg-gradient-to-b from-mint/40 via-white to-cream/30"
      >
        <div className="mx-auto min-w-0 max-w-site px-4 pb-24 pt-28 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Partner landing
          </p>
          <h1 className="mt-3 max-w-3xl text-balance text-3xl font-bold tracking-tight text-gray-900 md:text-4xl lg:text-5xl">
            {headline}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600">
            {description}
          </p>
          <ul className="mt-8 max-w-2xl space-y-3 text-sm text-gray-700">
            {bullets.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LaunchAppLink
              surface="partner_lp"
              className={`group inline-flex min-h-12 items-center justify-center gap-2 px-8 py-3.5 text-base ${uiCtaPrimarySurfaceRoundedXl} ${twCtaPrimaryMotion}`}
            >
              Open GoGoCash for {partnerName}
              <ArrowUpRight className="h-5 w-5 shrink-0 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </LaunchAppLink>
            <Link
              href="/#brands"
              className={`inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-8 py-3.5 text-base font-normal text-gray-900 shadow-sm hover:bg-gray-50 ${twCtaMutedOutlineMotion}`}
            >
              Browse all partners
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
