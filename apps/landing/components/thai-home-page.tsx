import LocaleHomePage from "@/components/locale-home-page";
import type { PartnerBrand } from "@/lib/involve-asia";
import { faqItemsForLocale } from "@/lib/locale-faq";
import { localeHomeCopy } from "@/lib/locale-home-registry";

type ThaiHomePageProps = {
  initialPartners: PartnerBrand[];
};

export default function ThaiHomePage({ initialPartners }: ThaiHomePageProps) {
  return (
    <LocaleHomePage
      initialPartners={initialPartners}
      copy={localeHomeCopy("th")}
      faqItems={faqItemsForLocale("th")}
      documentLang="th"
      partnerLogoAltTemplate="{name} พันธมิตรแคชแบ็ก GoGoCash"
    />
  );
}
