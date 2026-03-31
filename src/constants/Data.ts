import { SUPPORT_LINE_OFFICIAL_HREF } from "@/constants/navigation";
import ByBitIcon from "@/components/icons/social/ByBitIcon";
import DiscordIcon from "@/components/icons/social/DiscordIcon";
import FacebookIcon from "@/components/icons/social/FacebookIcon";
import GPayIcon from "@/components/icons/social/GPayIcon";
import InstagramIcon from "@/components/icons/social/InstagramIcon";
import LinkedInIcon from "@/components/icons/social/LinkedInIcon";
import MetamaskIcon from "@/components/icons/social/MetamaskIcon";
import PaypalIcon from "@/components/icons/social/PaypalIcon";
import TelegramIcon from "@/components/icons/social/TelegramIcon";
import TrustIcon from "@/components/icons/social/TrustIcon";
import XIcon from "@/components/icons/social/XIcon";

export const FooterList1 = [
  {
    title: "GoGoCash",
    list: [
      {
        title: "Home",
        link: "/",
      },
      {
        title: "Promotions",
        link: "/",
      },
      {
        title: "navAllBrands",
        link: "/shop",
      },
      {
        title: "Join GoGoCash Gang",
        link: "#",
      },
    ],
  },
  {
    title: "About us",
    list: [
      {
        title: "About GoGoCash",
        link: "https://gogocash.gitbook.io/doc/",
      },
      {
        title: "Career",
        link: "https://gogocash.gitbook.io/doc/careers",
      },
      {
        title: "Roadmap",
        link: "https://gogocash.gitbook.io/doc/roadmap",
      },
      {
        title: "footerPrivacyPolicy",
        link: "/privacy-policy",
      },
    ],
  },
  {
    title: "Need Help",
    list: [
      {
        title: "Learning Center",
        link: "https://gogocash.gitbook.io/doc/learn-center",
      },
      {
        title: "Help center",
        link: "https://gogocash.gitbook.io/doc/help-center",
      },
      {
        title: "FAQ",
        link: "https://gogocash.gitbook.io/doc/faq",
      },
      {
        title: "Customer Support",
        link: SUPPORT_LINE_OFFICIAL_HREF,
      },
    ],
  },
];

export const Socail = [
  {
    icon: FacebookIcon,
    link: "https://web.facebook.com/gogocashofficial",
    ariaLabel: "GoGoCash on Facebook",
  },
  {
    icon: LinkedInIcon,
    link: "https://www.linkedin.com/company/gogocash",
    ariaLabel: "GoGoCash on LinkedIn",
  },
  {
    icon: InstagramIcon,
    link: "https://www.instagram.com/gogocash/",
    ariaLabel: "GoGoCash on Instagram",
  },
  {
    icon: XIcon,
    link: "https://x.com/mygogocash",
    ariaLabel: "GoGoCash on X",
  },
  {
    icon: TelegramIcon,
    link: "https://t.me/GoGoCashOfficialChannel",
    ariaLabel: "GoGoCash on Telegram",
  },
  {
    icon: DiscordIcon,
    link: "https://discord.com/invite/T9aydr2yFd",
    ariaLabel: "GoGoCash on Discord",
  },
];

export const Payment = [
  {
    icon: PaypalIcon,
    link: "#",
  },
  {
    icon: GPayIcon,
    link: "#",
  },
  {
    icon: ByBitIcon,
    link: "#",
  },
  {
    icon: TrustIcon,
    link: "#",
  },
  {
    icon: MetamaskIcon,
    link: "#",
  },
];

export const Content = [
  {
    title: "Terms and Conditions",
    link: "https://gogocash.co/term-of-use",
  },
  {
    title: "Privacy Policy",
    link: "https://gogocash.co/privacy-policy",
  },
  {
    title: "Cookies",
    link: "https://gogocash.co/cookies-notice",
  },
];
