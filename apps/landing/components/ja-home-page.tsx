import LocaleHomePage from "@/components/locale-home-page";
import type { PartnerBrand } from "@/lib/involve-asia";
import { faqItemsForLocale } from "@/lib/locale-faq";
import { localeHomeCopy } from "@/lib/locale-home-registry";

type JaHomePageProps = {
  initialPartners: PartnerBrand[];
};

export default function JaHomePage({ initialPartners }: JaHomePageProps) {
  return (
    <LocaleHomePage
      initialPartners={initialPartners}
      copy={localeHomeCopy("ja")}
      faqItems={faqItemsForLocale("ja")}
      documentLang="ja"
      partnerLogoAltTemplate="{name} GoGoCash キャッシュバックパートナー"
    />
  );
}
