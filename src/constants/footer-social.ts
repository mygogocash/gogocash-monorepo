import { SUPPORT_LINE_OFFICIAL_HREF } from "@/constants/navigation";

/** Web app — matches gogocash landing footer “Website” link */
export const WEB_APP_PUBLIC_HREF = "https://app.gogocash.co";

/** LINE Mini App (in-chat app) — matches landing */
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
    href: SUPPORT_LINE_OFFICIAL_HREF,
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
