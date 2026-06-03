import Header from "@/components/header";
import Footer from "@/components/footer";
import MerchantOffersStrip from "@/components/landing/merchant-offers-strip";
import type { PartnerBrand } from "@/lib/involve-asia";
import {
  type HowItWorksStep,
} from "@/components/landing/how-it-works-interactive";
import WhyChooseSection from "@/components/landing/why-choose-section";
import QuestsSection from "@/components/landing/quests-section";
import DifferentiationSection from "@/components/landing/differentiation-section";
import AppDownloadSection from "@/components/landing/app-download-section";
import CommunitySection from "@/components/landing/community-section";
import ContentTeaser from "@/components/landing/content-teaser";
import { faqItemsForLocale } from "@/lib/locale-faq";
import {
  SITE_FACTS,
  partnersStripEarnDescription,
} from "@/lib/site-facts";
import { EnglishHomeHeroSection } from "@/components/landing/english-home-sections";
import {
  FaqSection,
  FinalCtaSection,
  HowItWorksSection,
} from "@/components/landing/common-sections";
import { WEB_APP_HREF } from "@/components/social-data";
import FaqJsonLd from "@/components/faq-json-ld";
import { HOW_IT_WORKS_ILLUSTRATION_PATHS } from "@/lib/how-it-works-illustrations";

const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    summary: "Pick your earn rate",
    title: "Open the brand from GoGoCash",
    desc: `Explore ${SITE_FACTS.partnerCountLabel} e-commerce and travel partners across ${SITE_FACTS.regionLabel}. Compare cashback, then open the merchant from GoGoCash so your visit is tracked.`,
    bullets: [
      "Lazada, Shopee, Agoda, AliExpress, Trip.com, and more",
      "See rates before you spend",
    ],
    illustrationSrc: HOW_IT_WORKS_ILLUSTRATION_PATHS[0],
    illustrationAlt:
      "Browse brands and compare cashback rates in the GoGoCash app",
    ctaLabel: "Browse partners",
    ctaHref: WEB_APP_HREF,
  },
  {
    summary: "Checkout as usual",
    title: "Shop and pay like you already do",
    desc: "Add items to cart and check out on the merchant site or app as usual. No coupons to paste — no extra steps at payment.",
    bullets: [
      "Use your normal account and payment methods",
      "GoGoCash follows the purchase in the background",
    ],
    illustrationSrc: HOW_IT_WORKS_ILLUSTRATION_PATHS[1],
    illustrationAlt:
      "Shop on the merchant site while GoGoCash tracks your purchase",
  },
  {
    summary: "Wallet grows",
    title: "Cashback lands after the brand confirms",
    desc: "When the merchant confirms your order, cashback credits your GoGoCash wallet — real money, not points. Track balance in the app and withdraw when you hit the minimum.",
    bullets: [
      "Most orders confirm within a few days",
      "Withdraw to bank or e-wallet when you're ready",
    ],
    illustrationSrc: HOW_IT_WORKS_ILLUSTRATION_PATHS[2],
    illustrationAlt:
      "Cashback credited in the GoGoCash wallet after merchant confirmation",
  },
];

type HomePageProps = {
  initialPartners: PartnerBrand[];
};

export default function HomePage({ initialPartners }: HomePageProps) {
  return (
    <>
      <Header />
      <main role="main">
        <EnglishHomeHeroSection />

        <MerchantOffersStrip
          partners={initialPartners}
          description={partnersStripEarnDescription()}
          loadMoreLabel="See more Brands"
        />

        <WhyChooseSection />

        <QuestsSection />

        <HowItWorksSection
          title="Cashback in three simple steps"
          intro="Open brands from GoGoCash, shop like normal, and earn when the merchant confirms — straightforward rewards for everyday spends."
          progressCue="Three steps to your first cashback"
          steps={HOW_IT_WORKS_STEPS}
        />

        <DifferentiationSection />

        <AppDownloadSection />

        <ContentTeaser />

        <CommunitySection />

        <FaqSection
          badge="FAQ"
          title="Frequently Asked Questions"
          items={faqItemsForLocale("en")}
        />
        <FaqJsonLd items={faqItemsForLocale("en")} />

        <FinalCtaSection
          title="Ready to earn on every purchase?"
          subtitle={`Join ${SITE_FACTS.shopperCommunityLabel} shoppers turning everyday spends into withdrawable cashback`}
          ctaLabel="Start earning"
        />
      </main>
      <Footer />
    </>
  );
}
