import {
  LINE_MINI_APP_HREF,
  WEB_APP_HREF,
} from "@/components/social-data";

export type FooterLink = { label: string; href: string };
export type FooterColumns = Record<string, readonly FooterLink[]>;

/**
 * Footer navigation columns. Careers and Business Inquiries route to distinct,
 * non-LINE destinations (issue #9) so B2B partners and job seekers without LINE
 * still have a path. Business uses the public contact email; Careers uses the
 * LinkedIn company page (has a Jobs tab). Swap these for a dedicated careers /
 * B2B contact page when one exists.
 */
export const FOOTER_LINKS: FooterColumns = {
  "Live on Platform": [
    { label: "Website", href: WEB_APP_HREF },
    { label: "Telegram Mini App", href: "https://t.me/GoGoCashAppBot" },
    { label: "Line Mini App", href: LINE_MINI_APP_HREF },
  ],
  Company: [
    { label: "Business Inquiries", href: "mailto:info@gogocash.co" },
    { label: "Careers", href: "https://www.linkedin.com/company/gogocash" },
  ],
  Resources: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Use", href: "/term-of-use" },
    { label: "Terms of Service", href: "/terms-of-service" },
    { label: "How GoGoCash Makes Money", href: "/how-gogocash-makes-money" },
    { label: "Learn", href: "/learn" },
    { label: "System Status", href: "https://status.gogocash.co/" },
    { label: "Cookie Settings", href: "/privacy-policy" },
  ],
};

/** Column under which the "Secured by Cloudflare" trust row is rendered. */
export const FOOTER_TRUST_ROW_COLUMN = "Company";
