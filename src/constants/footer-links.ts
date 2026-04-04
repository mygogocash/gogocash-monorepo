import { SUPPORT_LINE_OFFICIAL_HREF } from "@/constants/navigation";
import { LINE_MINI_APP_HREF, WEB_APP_PUBLIC_HREF } from "@/constants/footer-social";

const MARKETING_ORIGIN = "https://gogocash.co";

export type FooterLinkItem = {
  labelKey: string;
  href: string;
};

export type FooterSectionDef = {
  titleKey: string;
  items: FooterLinkItem[];
};

/** Column layout and URLs aligned with `landing-page-main/components/footer.tsx` */
export const FOOTER_SECTIONS: FooterSectionDef[] = [
  {
    titleKey: "footerSectionLiveOnPlatform",
    items: [
      { labelKey: "footerLinkWebsite", href: WEB_APP_PUBLIC_HREF },
      { labelKey: "footerLinkTelegramMiniApp", href: "https://t.me/GoGoCashAppBot" },
      { labelKey: "footerLinkLineMiniApp", href: LINE_MINI_APP_HREF },
    ],
  },
  {
    titleKey: "footerSectionProducts",
    items: [
      { labelKey: "Business Inquiries", href: SUPPORT_LINE_OFFICIAL_HREF },
      { labelKey: "Careers", href: SUPPORT_LINE_OFFICIAL_HREF },
    ],
  },
  {
    titleKey: "Resources",
    items: [
      { labelKey: "Privacy Policy", href: "/privacy-policy" },
      { labelKey: "footerLinkTermsOfUse", href: `${MARKETING_ORIGIN}/term-of-use` },
      {
        labelKey: "footerLinkTermsOfService",
        href: `${MARKETING_ORIGIN}/terms-of-service`,
      },
      {
        labelKey: "footerLinkHowGoGoCashMakesMoney",
        href: `${MARKETING_ORIGIN}/how-gogocash-makes-money`,
      },
      { labelKey: "footerLinkLearn", href: `${MARKETING_ORIGIN}/learn` },
      { labelKey: "footerLinkSystemStatus", href: "https://status.gogocash.co/" },
      {
        labelKey: "footerLinkCookieSettings",
        href: `${MARKETING_ORIGIN}/privacy-policy`,
      },
    ],
  },
];
