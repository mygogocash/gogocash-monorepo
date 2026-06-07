/** Web app — desktop / large screens (Launch App CTA) */
export const WEB_APP_HREF = "https://app.gogocash.co";

/** Web app Quests route */
export const WEB_APP_QUEST_HREF = "https://app.gogocash.co/en/quest";

/** LINE Official Account (add friend / contact) */
export const LINE_OFFICIAL_ACCOUNT_HREF = "https://lin.ee/7om5sAr";

/** LINE Mini App (in-chat app) */
export const LINE_MINI_APP_HREF =
  "https://miniapp.line.me/2008237918-mpplkp5Q";

export const SOCIAL_ICONS = [
  { label: "X", href: "https://x.com/mygogocash", icon: "X" },
  {
    label: "Discord",
    href: "https://discord.gg/T9aydr2yFd",
    icon: "Discord",
  },
  {
    label: "Telegram",
    href: "https://t.me/GoGoCashOfficialChannel",
    icon: "Telegram",
  },
  {
    label: "Line",
    href: LINE_OFFICIAL_ACCOUNT_HREF,
    icon: "Line",
  },
  {
    label: "Threads",
    href: "https://www.threads.com/@mygogocash",
    icon: "Threads",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/gogocash",
    icon: "LinkedIn",
  },
  { label: "GitHub", href: "https://github.com/mygogocash", icon: "GitHub" },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@mygogocash",
    icon: "YouTube",
  },
] as const;

export type SocialIconName = (typeof SOCIAL_ICONS)[number]["icon"];
