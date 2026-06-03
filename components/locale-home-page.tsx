import Header from "@/components/header";
import Footer from "@/components/footer";
import DocumentLangSync from "@/components/document-lang-sync";
import { WEB_APP_HREF } from "@/components/social-data";
import { HOW_IT_WORKS_ILLUSTRATION_PATHS } from "@/lib/how-it-works-illustrations";
import { type HowItWorksStep } from "@/components/landing/how-it-works-interactive";
import MerchantOffersStrip from "@/components/landing/merchant-offers-strip";
import FaqJsonLd from "@/components/faq-json-ld";
import type { PartnerBrand } from "@/lib/involve-asia";
import type { LocaleHomeCopy } from "@/lib/locale-home-copy";
import {
  FinalCtaSection,
  FaqSection,
  HowItWorksSection,
} from "@/components/landing/common-sections";
import {
  LocaleCommunitySection,
  LocaleDownloadSection,
  LocaleFeatureGridSection,
  LocaleHomeHeroSection,
  LocaleLearnSection,
  LocaleWhySection,
} from "@/components/landing/locale-home-sections";

export type LocaleFaqItem = { question: string; answer: string };

export type LocaleHomePageProps = {
  initialPartners: PartnerBrand[];
  copy: LocaleHomeCopy;
  faqItems: LocaleFaqItem[];
  documentLang: string;
  partnerLogoAltTemplate: string;
  learnArticleLang?: string;
};

export default function LocaleHomePage({
  initialPartners,
  copy,
  faqItems,
  documentLang,
  partnerLogoAltTemplate,
  learnArticleLang = "en",
}: LocaleHomePageProps) {
  const howItWorksSteps: HowItWorksStep[] = copy.howItWorks.steps.map(
    (step, index) => ({
      ...step,
      illustrationSrc: HOW_IT_WORKS_ILLUSTRATION_PATHS[index],
      illustrationAlt: step.title,
      ...(index === 0
        ? {
            ctaLabel: copy.howItWorks.browseAppCta,
            ctaHref: WEB_APP_HREF,
          }
        : {}),
    }),
  );

  return (
    <>
      <DocumentLangSync lang={documentLang} />
      <Header />
      <main role="main" lang={documentLang}>
        <LocaleHomeHeroSection copy={copy} />

        <MerchantOffersStrip
          partners={initialPartners}
          sectionBadgeLabel={copy.partners.badge}
          heading={copy.partners.title}
          description={copy.partners.description}
          searchLabel={copy.partners.searchLabel}
          searchPlaceholder={copy.partners.searchPlaceholder}
          searchClearLabel={copy.partners.searchClear}
          noResultsMessage={copy.partners.noResults}
          brandsCountAll={copy.partners.brandsCountAll}
          brandsCountFiltered={copy.partners.brandsCountFiltered}
          loadMoreLabel={copy.partners.loadMore}
          partnerLogoAltTemplate={partnerLogoAltTemplate}
        />

        <LocaleWhySection copy={copy} />
        <LocaleFeatureGridSection copy={copy} />
        <HowItWorksSection
          title={copy.howItWorks.title}
          intro={copy.howItWorks.intro}
          progressCue={copy.howItWorks.progressCue}
          steps={howItWorksSteps}
        />
        <LocaleDownloadSection copy={copy} />
        <LocaleLearnSection copy={copy} learnArticleLang={learnArticleLang} />
        <LocaleCommunitySection copy={copy} />
        <FaqSection
          badge={copy.faq.badge}
          title={copy.faq.title}
          items={faqItems}
          subtitle={copy.faq.subtitleEnHint}
          englishLinkLabel={copy.langNavEnglish}
        />
        <FaqJsonLd items={faqItems} />
        <FinalCtaSection
          title={copy.finalCta.title}
          subtitle={copy.finalCta.sub}
          ctaLabel={copy.finalCta.cta}
        />
      </main>
      <Footer />
    </>
  );
}
