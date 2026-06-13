import { SUPPORT_LINE_OFFICIAL_HREF } from "@/constants/navigation";
import { Socail } from "@/constants/Data";

/** Static “Join us on …” art under `public/images/account-settings/community/{id}.png`. */
const B = "/images/account-settings/community";

/** External community destinations — GoGoCash 1.1 Account Settings (Figma 8367:126049). */
function socialHref(match: (s: (typeof Socail)[number]) => boolean): string {
  const item = Socail.find(match);
  return item?.link ?? "#";
}

export type AccountCommunityEntry = {
  id: string;
  /** i18n key for platform display name (alt text + screen readers) */
  nameKey: string;
  href: string;
  /** Path under /public for the full banner image */
  bannerSrc: string;
};

export const ACCOUNT_SETTINGS_COMMUNITY: readonly AccountCommunityEntry[] = [
  {
    id: "facebook",
    nameKey: "accountSettingsCommunityFacebook",
    href: socialHref((s) => s.ariaLabel.includes("Facebook")),
    bannerSrc: `${B}/facebook.png`,
  },
  {
    id: "instagram",
    nameKey: "accountSettingsCommunityInstagram",
    href: socialHref((s) => s.ariaLabel.includes("Instagram")),
    bannerSrc: `${B}/instagram.png`,
  },
  {
    id: "line",
    nameKey: "accountSettingsCommunityLine",
    href: SUPPORT_LINE_OFFICIAL_HREF,
    bannerSrc: `${B}/line.png`,
  },
  {
    id: "youtube",
    nameKey: "accountSettingsCommunityYouTube",
    href: "https://www.youtube.com/results?search_query=GoGoCash",
    bannerSrc: `${B}/youtube.png`,
  },
  {
    id: "x",
    nameKey: "accountSettingsCommunityX",
    href: socialHref((s) => /x\.com|twitter\.com/i.test(s.link)),
    bannerSrc: `${B}/x.png`,
  },
  {
    id: "telegram",
    nameKey: "accountSettingsCommunityTelegram",
    href: socialHref((s) => s.ariaLabel.includes("Telegram")),
    bannerSrc: `${B}/telegram.png`,
  },
  {
    id: "luma",
    nameKey: "accountSettingsCommunityLuma",
    href: "https://luma.com/",
    bannerSrc: `${B}/luma.png`,
  },
  {
    id: "linkedin",
    nameKey: "accountSettingsCommunityLinkedIn",
    href: socialHref((s) => s.ariaLabel.includes("LinkedIn")),
    bannerSrc: `${B}/linkedin.png`,
  },
  {
    id: "discord",
    nameKey: "accountSettingsCommunityDiscord",
    href: socialHref((s) => s.ariaLabel.includes("Discord")),
    bannerSrc: `${B}/discord.png`,
  },
  {
    id: "questn",
    nameKey: "accountSettingsCommunityQuestN",
    href: "https://questn.com/",
    bannerSrc: `${B}/questn.png`,
  },
  {
    id: "github",
    nameKey: "accountSettingsCommunityGitHub",
    href: "https://github.com/gogocash",
    bannerSrc: `${B}/github.png`,
  },
  {
    id: "angellist",
    nameKey: "accountSettingsCommunityAngelList",
    href: "https://angel.co/",
    bannerSrc: `${B}/angellist.png`,
  },
  {
    id: "crunchbase",
    nameKey: "accountSettingsCommunityCrunchBase",
    href: "https://www.crunchbase.com/",
    bannerSrc: `${B}/crunchbase.png`,
  },
] as const;
