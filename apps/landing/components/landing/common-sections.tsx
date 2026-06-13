import Link from "next/link";
import AnimateOnScroll from "@/components/animate-on-scroll";
import FAQAccordion from "@/components/faq-accordion";
import SectionBadge from "@/components/section-badge";
import LaunchAppLink from "@/components/launch-app-link";
import { ArrowUpRight } from "@/components/icons";
import HowItWorksInteractive, {
  type HowItWorksStep,
} from "@/components/landing/how-it-works-interactive";
import { twCtaPrimaryMotion } from "@/lib/motion-styles";
import {
  uiCtaPrimarySurface,
  uiSectionTitle,
  uiSectionTitleHowItWorks,
  uiSectionTitleLg,
} from "@/lib/ui-classes";

type FaqItem = {
  question: string;
  answer: string;
};

export function HowItWorksSection({
  title,
  intro,
  progressCue,
  steps,
}: {
  title: string;
  intro: string;
  progressCue: string;
  steps: HowItWorksStep[];
}) {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-28 border-t border-gray-200/80 bg-gray-50 py-16 md:py-24"
    >
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={uiSectionTitleHowItWorks}>
              {title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-600 md:text-lg">
              {intro}
            </p>
            <p className="mt-3 text-sm font-semibold text-primary md:text-base">
              {progressCue}
            </p>
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <HowItWorksInteractive steps={steps} />
        </AnimateOnScroll>
      </div>
    </section>
  );
}

export function FaqSection({
  badge,
  title,
  items,
  subtitle,
  englishLinkLabel,
  englishLinkHref = "/",
}: {
  badge: string;
  title: string;
  items: FaqItem[];
  subtitle?: string;
  englishLinkLabel?: string;
  englishLinkHref?: string;
}) {
  return (
    <section id="faq" className="scroll-mt-28 py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <AnimateOnScroll>
          <div className="flex flex-col items-center text-center">
            <SectionBadge label={badge} />
            <h2 className={`mt-6 ${uiSectionTitleLg}`}>
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-3 max-w-xl text-sm text-gray-600 md:text-base">
                {subtitle}
                {englishLinkLabel ? (
                  <>
                    {" "}
                    <Link
                      href={englishLinkHref}
                      lang="en"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {englishLinkLabel}
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            ) : null}
          </div>
        </AnimateOnScroll>

        <div className="mt-12">
          <FAQAccordion items={items} />
        </div>
      </div>
    </section>
  );
}

export function FinalCtaSection({
  title,
  subtitle,
  ctaLabel,
}: {
  title: string;
  subtitle: string;
  ctaLabel: string;
}) {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll>
          <div className="rounded-3xl bg-gradient-to-br from-mint via-white to-cream p-12 text-center md:p-16">
            <h2 className={uiSectionTitle}>
              {title}
            </h2>
            <p className="mt-4 text-base text-gray-500">{subtitle}</p>
            <LaunchAppLink
              surface="final"
              className={`group mt-8 min-h-11 items-center gap-2 px-8 py-3.5 text-sm ${uiCtaPrimarySurface} ${twCtaPrimaryMotion}`}
            >
              {ctaLabel}
              <ArrowUpRight className="h-4 w-4 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </LaunchAppLink>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
