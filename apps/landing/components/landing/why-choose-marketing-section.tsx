import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import AnimateOnScroll from "@/components/animate-on-scroll";
import SectionBadge from "@/components/section-badge";
import { ArrowUpRight } from "@/components/icons";
import { twFocusRingPrimary } from "@/lib/motion-styles";
import { uiSectionTitleLg } from "@/lib/ui-classes";

type IconComp = ComponentType<{ className?: string }>;

export type WhyMarketingCard = {
  title: string;
  body: string;
  /** Optional "learn more" link, e.g. Saving Plus → its explainer (#8). */
  link?: { label: string; href: string };
};

/**
 * “Why us” four-card grid shared by English (`WhyChooseSection`) and locale homes.
 */
export function WhyChooseMarketingSection({
  sectionId = "why-gogocash",
  badgeIcon,
  badgeLabel,
  title,
  subtitle,
  cards,
  iconComponents,
  cardBackgrounds,
}: {
  sectionId?: string;
  badgeIcon: ReactNode;
  badgeLabel: string;
  title: string;
  subtitle?: string;
  cards: readonly WhyMarketingCard[];
  iconComponents: readonly IconComp[];
  cardBackgrounds: readonly string[];
}) {
  return (
    <section id={sectionId} className="scroll-mt-28 py-16 md:py-24">
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll>
          <div className="flex flex-col items-center text-center">
            <SectionBadge icon={badgeIcon} label={badgeLabel} />
            <h2 className={`mt-6 ${uiSectionTitleLg}`}>{title}</h2>
            {subtitle ? (
              <p className="mt-4 max-w-2xl text-base text-gray-500">{subtitle}</p>
            ) : null}
          </div>
        </AnimateOnScroll>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:gap-6">
          {cards.map((card, i) => {
            const Icon = iconComponents[i];
            const bg = cardBackgrounds[i] ?? "bg-cream";
            return (
              <AnimateOnScroll key={card.title} delay={i * 100}>
                <div className={`rounded-3xl p-8 lg:p-10 ${bg} min-h-[220px]`}>
                  <Icon className="h-8 w-8 text-primary" />
                  <h3 className="mt-4 text-xl font-bold text-gray-800">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-500">
                    {card.body}
                  </p>
                  {card.link ? (
                    <Link
                      href={card.link.href}
                      className={`group mt-3 inline-flex items-center gap-1 rounded text-sm font-medium text-primary hover:underline ${twFocusRingPrimary}`}
                    >
                      {card.link.label}
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
                    </Link>
                  ) : null}
                </div>
              </AnimateOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
