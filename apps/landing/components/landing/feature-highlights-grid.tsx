import type { ComponentType, ReactNode } from "react";
import AnimateOnScroll from "@/components/animate-on-scroll";
import LaunchAppLink from "@/components/launch-app-link";
import { ArrowUpRight } from "@/components/icons";
import {
  twFocusRingPrimary,
  twPressSm,
  twTransitionButton,
} from "@/lib/motion-styles";
import { uiCtaInvertedOnGradient, uiSectionTitleLg } from "@/lib/ui-classes";

export type FeatureHighlightCard = { title: string; body: string };

type IconComp = ComponentType<{ className?: string }>;

const FEATURE_CARD_BGS = ["bg-mint", "bg-cream", "bg-cream"] as const;

/**
 * Four-tile feature grid (three light cards + gradient CTA) shared by English
 * and locale home pages; copy comes from props.
 */
export function FeatureHighlightsGrid({
  badge,
  sectionTitle,
  cards,
  icons,
  ctaCard,
}: {
  badge: ReactNode;
  sectionTitle: string;
  cards: readonly [
    FeatureHighlightCard,
    FeatureHighlightCard,
    FeatureHighlightCard,
  ];
  icons: readonly [IconComp, IconComp, IconComp];
  ctaCard: { title: string; bodyLine: string; ctaLabel: string };
}) {
  return (
    <section id="features" className="scroll-mt-28 py-16 md:py-24">
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll>
          <div className="flex flex-col items-center text-center">
            {badge}
            <h2 className={`mt-6 ${uiSectionTitleLg}`}>{sectionTitle}</h2>
          </div>
        </AnimateOnScroll>

        <div className="mt-12 grid gap-4 md:grid-cols-3 lg:gap-6">
          {cards.map((card, index) => {
            const Icon = icons[index];
            return (
              <AnimateOnScroll key={card.title} delay={(index + 1) * 100}>
                <div
                  className={`relative h-full min-h-[280px] overflow-hidden rounded-3xl p-8 lg:p-10 ${FEATURE_CARD_BGS[index]}`}
                >
                  <Icon className="mb-4 h-8 w-8 text-primary" />
                  <h3 className="text-xl font-bold text-gray-800">{card.title}</h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-gray-500">
                    {card.body}
                  </p>
                </div>
              </AnimateOnScroll>
            );
          })}
        </div>

        {/* CTA is a full-width band below the grid — not a feature tile (#6). */}
        <AnimateOnScroll delay={400}>
          <div className="relative mt-4 flex flex-col gap-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-8 md:flex-row md:items-center md:justify-between lg:mt-6 lg:p-10">
            <div className="max-w-xl">
              <h3 className="text-2xl font-bold text-white">{ctaCard.title}</h3>
              <p className="mt-2 text-sm text-white/80">{ctaCard.bodyLine}</p>
            </div>
            <LaunchAppLink
              surface="feature"
              className={`group min-h-11 w-fit shrink-0 items-center gap-2 px-6 py-3 text-sm ${uiCtaInvertedOnGradient} ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
            >
              {ctaCard.ctaLabel}
              <ArrowUpRight className="h-4 w-4 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </LaunchAppLink>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
