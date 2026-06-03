import LaunchAppLink from "@/components/launch-app-link";
import SectionBadge from "@/components/section-badge";
import { SITE_FACTS, heroEarnSupportingParagraph } from "@/lib/site-facts";
import {
  ArrowUpRight,
  Coins,
  MessageCircle,
  Sparkles,
  Trophy,
} from "@/components/icons";
import { LINE_OFFICIAL_ACCOUNT_HREF } from "@/components/social-data";
import {
  twCtaOutlineMotion,
  twCtaPrimaryMotion,
} from "@/lib/motion-styles";
import { uiCtaOutlineBrand, uiCtaPrimarySurface } from "@/lib/ui-classes";
import { LandingHeroShell } from "@/components/landing/landing-hero-shell";
import { FeatureHighlightsGrid } from "@/components/landing/feature-highlights-grid";

const EN_FEATURE_CARDS = [
  {
    title: "Cashback hits your wallet",
    body:
      "After the brand confirms your order, cashback shows up in your GoGoCash balance — no confusing points math. Track it in the app anytime.",
  },
  {
    title: "24/7 Customer Support",
    body:
      "Tracking or payout questions? We're here day or night via chat or email.",
  },
  {
    title: "Personalized Quests",
    body:
      "Challenges matched to how you shop — unlock bonus cashback and limited-time boosts.",
  },
] as const;

export function EnglishHomeHeroSection() {
  return (
    <LandingHeroShell>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center text-center">
        <div className="flex w-full max-w-xl flex-col items-center xl:max-w-3xl">
          <div className="mx-auto w-full max-w-3xl">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-gray-900 md:text-5xl lg:text-6xl lg:leading-[1.08]">
              Earn Cashback on Every Spend
            </h1>
            <p className="mt-4 text-lg font-medium text-gray-800 md:text-xl">
              With GoGoCash — on brands you already shop
            </p>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-gray-600 md:text-lg">
              {heroEarnSupportingParagraph()}
            </p>
          </div>

          <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
            <LaunchAppLink
              surface="hero"
              className={`group min-h-11 w-full items-center justify-center gap-2 px-4 py-3 text-sm sm:w-auto sm:min-w-[200px] sm:px-6 md:px-8 md:py-3.5 ${uiCtaPrimarySurface} ${twCtaPrimaryMotion}`}
            >
              Start earning
              <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </LaunchAppLink>
            <a
              href={LINE_OFFICIAL_ACCOUNT_HREF}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact us on LINE"
              className={`group inline-flex min-h-11 w-full items-center justify-center gap-2 px-6 py-3 text-sm sm:w-auto sm:min-w-[200px] ${uiCtaOutlineBrand} ${twCtaOutlineMotion}`}
            >
              Contact us
              <ArrowUpRight className="h-4 w-4 shrink-0 transition-transform duration-button ease-standard group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </a>
          </div>
        </div>
      </div>
    </LandingHeroShell>
  );
}

export function EnglishFeatureHighlightsSection() {
  return (
    <FeatureHighlightsGrid
      badge={
        <SectionBadge
          icon={<Sparkles className="h-4 w-4" />}
          label="Why it adds up"
        />
      }
      sectionTitle="Built to turn everyday spends into wallet balance"
      cards={EN_FEATURE_CARDS}
      icons={[Coins, MessageCircle, Trophy]}
      ctaCard={{
        title: "Ready to start earning?",
        bodyLine: `Join ${SITE_FACTS.shopperCommunityLabel} shoppers stacking real cashback`,
        ctaLabel: "Start earning free",
      }}
    />
  );
}
