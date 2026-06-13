import Image from "next/image";
import Link from "next/link";
import AnimateOnScroll from "@/components/animate-on-scroll";
import LaunchAppLink from "@/components/launch-app-link";
import SectionBadge from "@/components/section-badge";
import CommunitySocialLinks from "@/components/community-social-links";
import { LINE_MINI_APP_HREF, WEB_APP_HREF } from "@/components/social-data";
import type { LocaleHomeCopy } from "@/lib/locale-home-copy";
import {
  ArrowUpRight,
  Coins,
  MessageCircle,
  Merchant,
  Sparkles,
  Trophy,
} from "@/components/icons";
import {
  twCtaMutedOutlineMotion,
  twCtaOutlineMotion,
  twCtaPrimaryMotion,
  twDurButton,
  twEaseStandard,
  twFocusRingPrimary,
  twNavTextMotion,
  twPressSm,
  twTransitionButton,
} from "@/lib/motion-styles";
import {
  uiCardTitle,
  uiCtaOutlineBrand,
  uiCtaPrimarySurfaceRoundedXl,
  uiLinkCta,
  uiSectionTitle,
  uiSectionTitleCompact,
} from "@/lib/ui-classes";
import { LandingHeroShell } from "@/components/landing/landing-hero-shell";
import { FeatureHighlightsGrid } from "@/components/landing/feature-highlights-grid";
import { WhyChooseMarketingSection } from "@/components/landing/why-choose-marketing-section";

const WHY_ICONS = [Coins, Merchant, Trophy, MessageCircle] as const;
const WHY_BG = ["bg-mint", "bg-cream", "bg-cream", "bg-mint"] as const;

export function LocaleHomeHeroSection({
  copy,
}: {
  copy: LocaleHomeCopy;
}) {
  return (
    <LandingHeroShell
      top={
        <nav
          aria-label={copy.breadcrumbNavAria}
          className="mb-8 flex shrink-0 flex-wrap justify-center gap-4 text-sm md:justify-start"
        >
          <Link
            href="/"
            lang="en"
            className={`font-medium text-primary hover:text-primary-dark ${twNavTextMotion}`}
          >
            {copy.langNavEnglish}
          </Link>
          <span className="text-gray-300" aria-hidden>
            |
          </span>
          <span className="font-medium text-gray-700">{copy.langNavLocal}</span>
        </nav>
      }
    >
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center text-center">
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl lg:leading-[1.08]">
            {copy.hero.h1}
          </h1>
          <p className="mt-4 text-lg font-medium text-gray-800 md:text-xl">
            {copy.hero.sub}
          </p>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-gray-600 md:text-lg">
            {copy.hero.body}
          </p>
        </div>

        <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
          <LaunchAppLink
            surface="hero"
            className={`group min-h-12 w-full items-center justify-center gap-2 px-8 py-3.5 text-base sm:w-auto sm:min-w-[200px] ${uiCtaPrimarySurfaceRoundedXl} ${twCtaPrimaryMotion}`}
          >
            {copy.hero.ctaLaunch}
            <ArrowUpRight className="h-5 w-5 shrink-0 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </LaunchAppLink>
          <a
            href="https://line.me/R/ti/p/@gogocash"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={copy.hero.lineAria}
            className={`group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-3.5 text-base font-normal text-gray-900 shadow-sm hover:border-gray-400 hover:bg-gray-50 sm:w-auto sm:min-w-[200px] ${twCtaMutedOutlineMotion}`}
          >
            {copy.hero.ctaLine}
            <ArrowUpRight className="h-5 w-5 shrink-0 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </a>
        </div>
      </div>
    </LandingHeroShell>
  );
}

export function LocaleWhySection({
  copy,
}: {
  copy: LocaleHomeCopy;
}) {
  return (
    <WhyChooseMarketingSection
      badgeIcon={<Sparkles className="h-4 w-4" />}
      badgeLabel={copy.why.badge}
      title={copy.why.title}
      subtitle={copy.why.subtitle}
      cards={copy.why.cards}
      iconComponents={WHY_ICONS}
      cardBackgrounds={WHY_BG}
    />
  );
}

export function LocaleFeatureGridSection({
  copy,
}: {
  copy: LocaleHomeCopy;
}) {
  return (
    <FeatureHighlightsGrid
      badge={
        <SectionBadge
          icon={<Sparkles className="h-4 w-4" />}
          label={copy.features.badge}
        />
      }
      sectionTitle={copy.features.title}
      cards={copy.features.cards}
      icons={[Coins, MessageCircle, Trophy]}
      ctaCard={{
        title: copy.features.ctaCard.title,
        bodyLine: copy.features.ctaCard.bodyLine,
        ctaLabel: copy.features.ctaCard.cta,
      }}
    />
  );
}

export function LocaleDownloadSection({
  copy,
}: {
  copy: LocaleHomeCopy;
}) {
  return (
    <section
      id="download-app"
      className="scroll-mt-28 bg-cream py-16 md:py-24"
    >
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <AnimateOnScroll>
            <div>
              <SectionBadge label={copy.download.badge} />
              <h2 className={`mt-6 ${uiSectionTitle}`}>
                {copy.download.title}
              </h2>
              <p className="mt-4 text-base text-gray-500">
                {copy.download.desc}
              </p>
              <ul className="mt-6 space-y-3 text-sm text-gray-600">
                {copy.download.bullets.map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <a
                  href="https://t.me/GoGoCashAppBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#229ED9] px-6 py-3 text-sm font-normal text-white hover:opacity-95 ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
                >
                  {copy.download.telegram}
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </a>
                <a
                  href={LINE_MINI_APP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#06C755] px-6 py-3 text-sm font-normal text-white hover:opacity-95 ${twTransitionButton} ${twPressSm} ${twFocusRingPrimary}`}
                >
                  {copy.download.line}
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </a>
                <a
                  href={WEB_APP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group inline-flex min-h-11 items-center justify-center gap-2 px-6 py-3 text-sm ${uiCtaOutlineBrand} ${twCtaOutlineMotion}`}
                >
                  {copy.download.web}
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
                </a>
              </div>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll delay={150}>
            <div className="mx-auto flex max-w-sm flex-col items-center rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm lg:mx-0 lg:max-w-none">
              <p className="text-sm font-medium text-gray-500">
                {copy.download.scanLabel}
              </p>
              <a
                href={LINE_MINI_APP_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 block rounded-2xl border border-gray-200 bg-white p-2 shadow-inner hover:border-[#06C755]/40 ${twDurButton} ${twEaseStandard} transition-[border-color,box-shadow] motion-reduce:duration-micro`}
                aria-label={copy.download.qrAria}
              >
                <Image
                  src="/images/qr-gogocash-line-miniapp.webp"
                  alt={copy.download.qrAlt}
                  width={224}
                  height={224}
                  className="h-56 w-56 rounded-xl object-contain md:h-64 md:w-64"
                />
              </a>
              <p className="mt-4 text-xs text-gray-500">
                {copy.download.qrCaptionBefore}{" "}
                <a
                  href={LINE_MINI_APP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#06C755] underline-offset-2 hover:underline"
                >
                  {copy.download.qrCaptionLink}
                </a>
                {copy.download.qrCaptionAfter}
              </p>
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}

export function LocaleLearnSection({
  copy,
  learnArticleLang,
}: {
  copy: LocaleHomeCopy;
  learnArticleLang: string;
}) {
  return (
    <section
      id="learn"
      className="scroll-mt-28 border-t border-gray-100 bg-white py-16 md:py-20"
    >
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll>
          <div className="flex flex-col items-center text-center">
            <SectionBadge label={copy.learn.badge} />
            <h2 className={`mt-6 ${uiSectionTitleCompact}`}>
              {copy.learn.title}
            </h2>
          </div>
        </AnimateOnScroll>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {copy.learn.teasers.map((item, index) => (
            <AnimateOnScroll key={item.href} delay={index * 100}>
              <a
                href={item.href}
                lang={learnArticleLang}
                className={`group flex h-full flex-col rounded-2xl border border-gray-100 bg-cream/50 p-6 hover:border-primary/20 hover:shadow-md ${twTransitionButton} ${twPressSm}`}
              >
                <h3 className={uiCardTitle}>
                  {item.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-gray-500">
                  {item.desc}
                </p>
                <span className={`mt-4 inline-flex items-center gap-1 text-sm ${uiLinkCta}`}>
                  {copy.learn.readMore}
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-button ease-standard motion-reduce:transition-none group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </a>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LocaleCommunitySection({
  copy,
}: {
  copy: LocaleHomeCopy;
}) {
  return (
    <section id="community" className="scroll-mt-28 py-16 md:py-24">
      <div className="mx-auto min-w-0 max-w-site px-4 sm:px-6 lg:px-8">
        <AnimateOnScroll>
          <div className="flex flex-col items-center text-center">
            <SectionBadge label={copy.community.badge} />
            <h2 className={`mt-6 ${uiSectionTitle}`}>
              {copy.community.title}
            </h2>
            <p className="mt-4 max-w-xl text-base text-gray-500">
              {copy.community.desc}
            </p>
          </div>
        </AnimateOnScroll>

        <CommunitySocialLinks />
      </div>
    </section>
  );
}
