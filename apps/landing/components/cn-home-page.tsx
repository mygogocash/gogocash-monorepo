import LocaleHomePage from "@/components/locale-home-page";
import type { PartnerBrand } from "@/lib/involve-asia";
import { faqItemsForLocale } from "@/lib/locale-faq";
import { localeHomeCopy } from "@/lib/locale-home-registry";

type CnHomePageProps = {
  initialPartners: PartnerBrand[];
};

export default function CnHomePage({ initialPartners }: CnHomePageProps) {
  return (
    <LocaleHomePage
      initialPartners={initialPartners}
      copy={localeHomeCopy("cn")}
      faqItems={faqItemsForLocale("cn")}
      documentLang="zh-CN"
      partnerLogoAltTemplate="{name} GoGoCash 现金回馈合作伙伴"
    />
  );
}
