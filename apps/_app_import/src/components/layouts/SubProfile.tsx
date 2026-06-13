"use client";

import { GOGOCASH_MARKETING_ORIGIN } from "@/constants/footer-links";
import {
  getSupportHref,
  GOGOCASH_LINKTREE_HREF,
  SUPPORT_LINE_OFFICIAL_HREF,
} from "@/constants/navigation";
import FavoriteIcon from "@/components/icons/FavoriteIcon";
import GlobeIcon from "@/components/icons/GlobeIcon";
import HelpIcon from "@/components/icons/HelpIcon";
import ProfileAddIcon from "@/components/icons/ProfileAddIcon";
import ProfileIcon from "@/components/icons/ProfileIcon";
import QuestIcon from "@/components/icons/QuestIcon";
import WalletIcon from "@/components/icons/WalletIcon";
import ProfilePopperMissingOrdersIcon from "@/components/icons/ProfilePopperMissingOrdersIcon";
import MembershipNavIcon from "@/components/icons/MembershipNavIcon";
import LogoutIcon from "@/components/icons/LogoutIcon";
import CookiesIcon from "@/components/icons/CookiesIcon";
import PrivacyPolicyNavIcon from "@/components/icons/PrivacyPolicyNavIcon";
import TermsOfServiceNavIcon from "@/components/icons/TermsOfServiceNavIcon";
import TermsOfUseNavIcon from "@/components/icons/TermsOfUseNavIcon";
import LogoutConfirmDialog from "@/components/layouts/LogoutConfirmDialog";
import AgeVerificationNavIcon from "@/components/icons/AgeVerificationNavIcon";
import ReferYourFriendsRow from "@/features/referral/component/ReferYourFriendsRow";
import { Link, usePathname } from "@/i18n/navigation";
import { useSessionContext } from "@/providers/SessionContext";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  isProfileSectionHubActive,
  isProfileSubNavItemActive,
  profileSectionSubNavItems,
  shouldAutoExpandProfileSubNav,
} from "@/components/layouts/profileSectionSubNav";
import { cn } from "@/lib/utils";
import KeyboardArrowDown from "@mui/icons-material/KeyboardArrowDown";
import { useBreakpointMdUp } from "@/hooks/useBreakpointMdUp";
import { useEffect, useState } from "react";
import type { ComponentType, SVGProps } from "react";

/** Inactive rail icons — matches `--gc-primary-strong` (Figma mint family). */
const RAIL_ICON = "var(--gc-primary-strong)";

/** Shared motion for sidebar rows (panel + default links). */
const navRowTransition =
  "transition-[background-color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-colors motion-reduce:duration-150";
const navRowActive = "bg-[var(--gc-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]";
/** Leaf menu links: subtle press feedback. */
const navRowInactive =
  "bg-transparent hover:bg-black/[0.03] active:scale-[0.99] active:bg-black/[0.05] motion-reduce:active:scale-100 motion-reduce:active:bg-transparent";
/** Profile hub row: one control toggles submenu (icon + label + chevron). */
const navRowInactiveHub = "bg-transparent hover:bg-black/[0.03]";

type IconComp = ComponentType<SVGProps<SVGSVGElement>>;

type MenuEntry = {
  translationKey: string;
  href: string;
  icon: IconComp;
  external?: boolean;
  /** When set, active if pathname matches this prefix (e.g. profile section). */
  activePrefix?: string;
  /** Stroke-based SVG (e.g. `ProfilePopperMissingOrdersIcon`) — default is fill-based icons. */
  iconStroke?: boolean;
};

const baseMenuHead: MenuEntry[] = [
  {
    translationKey: "Profile",
    href: "/profile",
    icon: ProfileIcon,
    activePrefix: "/profile",
  },
  {
    translationKey: "profilePopperReferYourFriends",
    href: "/referral",
    icon: ProfileAddIcon,
    activePrefix: "/referral",
  },
  {
    translationKey: "My Wallet",
    href: "/wallet",
    icon: WalletIcon,
    activePrefix: "/wallet",
  },
];

const missingOrderMenuItem: MenuEntry = {
  translationKey: "profilePopperMissingOrders",
  href: "/missing-orders",
  icon: ProfilePopperMissingOrdersIcon,
  activePrefix: "/missing-orders",
  iconStroke: true,
};

const membershipMenuItem: MenuEntry = {
  translationKey: "navMembership",
  href: "/membership",
  icon: MembershipNavIcon,
  activePrefix: "/membership",
  iconStroke: true,
};

const ageVerificationMenuItem: MenuEntry = {
  translationKey: "pdpaAgeVerifyTitle",
  href: "/age-verification",
  icon: AgeVerificationNavIcon,
  activePrefix: "/age-verification",
  iconStroke: true,
};

const baseMenuTail: MenuEntry[] = [
  {
    translationKey: "Favorite Brands",
    href: "/favorite",
    icon: FavoriteIcon,
    activePrefix: "/favorite",
  },
  {
    translationKey: "profilePopperGogoquestHistory",
    href: "/quest/history",
    icon: QuestIcon,
    activePrefix: "/quest/history",
  },
  ageVerificationMenuItem,
  {
    translationKey: "navPrivacyPolicy",
    href: "/privacy-center",
    icon: CookiesIcon,
    activePrefix: "/privacy-center",
  },
  /** Same destinations as footer Resources (internal policy route + marketing legal pages). */
  {
    translationKey: "footerPrivacyPolicy",
    href: "/privacy-policy",
    icon: PrivacyPolicyNavIcon,
    activePrefix: "/privacy-policy",
    iconStroke: true,
  },
  {
    translationKey: "footerLinkTermsOfUse",
    href: `${GOGOCASH_MARKETING_ORIGIN}/term-of-use`,
    icon: TermsOfUseNavIcon,
    external: true,
    iconStroke: true,
  },
  {
    translationKey: "footerLinkTermsOfService",
    href: `${GOGOCASH_MARKETING_ORIGIN}/terms-of-service`,
    icon: TermsOfServiceNavIcon,
    external: true,
    iconStroke: true,
  },
];

const helpItem: MenuEntry = {
  translationKey: "Help Center",
  href: SUPPORT_LINE_OFFICIAL_HREF,
  icon: HelpIcon,
  external: true,
};

const connectItem: MenuEntry = {
  translationKey: "sidebarConnectGoGoCash",
  href: GOGOCASH_LINKTREE_HREF,
  icon: GlobeIcon,
  external: true,
  iconStroke: true,
};

function isActive(pathname: string, item: MenuEntry): boolean {
  if (item.external) {
    return false;
  }
  const prefix = item.activePrefix ?? item.href;
  if (prefix === "/profile") {
    return isProfileSectionHubActive(pathname);
  }
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export type SubProfileVariant = "sidebar" | "panel";

const subProfileAsideClass: Record<SubProfileVariant, string> = {
  /** Padding matches `SubPage` shell (`pt-6 md:pt-10`, `pb-20`) so the nav column lines up with the main column. */
  sidebar:
    "hidden h-full min-h-0 w-[320px] shrink-0 flex-col self-stretch rounded-br-[24px] rounded-tr-[24px] bg-white px-6 pb-20 pt-6 md:flex md:pt-10",
  /** Inside merged account card: no own surface; parent supplies border/padding. */
  panel: "flex min-h-0 w-full flex-1 flex-col",
};

type SubProfileProps = {
  variant?: SubProfileVariant;
  className?: string;
};

const SubProfile = ({ variant = "sidebar", className }: SubProfileProps) => {
  const pathname = usePathname();
  /** Align with Tailwind `md:` — mobile `/profile` is hub-only; desktop `/profile` is personal info. */
  const isMdUp = useBreakpointMdUp();
  const isMobileProfileHub = pathname === "/profile" && !isMdUp;
  const t = useTranslations();
  const { data: session } = useSession();
  const { signOutAuth } = useSessionContext();
  const supportHref = getSupportHref(session?.user?.region);

  const autoExpandProfileSub = shouldAutoExpandProfileSubNav(pathname);
  const [profileSubOpen, setProfileSubOpen] = useState(autoExpandProfileSub);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  /** Immediate highlight while client navigates (pathname updates shortly after). */
  const [pendingProfileSubHref, setPendingProfileSubHref] = useState<string | null>(null);
  /** After mount so subnav active state can use matchMedia without SSR/client HTML drift. */
  const [viewportReady, setViewportReady] = useState(false);

  useEffect(() => {
    setProfileSubOpen(shouldAutoExpandProfileSubNav(pathname));
  }, [pathname]);

  useEffect(() => {
    setPendingProfileSubHref(null);
  }, [pathname]);

  useEffect(() => {
    setViewportReady(true);
  }, []);

  const menu: MenuEntry[] = [
    ...baseMenuHead,
    membershipMenuItem,
    missingOrderMenuItem,
    ...baseMenuTail,
    { ...helpItem, href: supportHref },
    connectItem,
  ];

  return (
    <aside className={cn(subProfileAsideClass[variant], className)}>
      <nav className="flex w-full flex-1 flex-col gap-3 md:gap-2" aria-label={t("Profile")}>
        {menu.map((item) => {
          const profileHubVariant = variant === "panel" || variant === "sidebar";
          const active =
            profileHubVariant && item.href === "/profile" && !item.external
              ? isProfileSectionHubActive(pathname)
              : isActive(pathname, item);
          const iconFill = active ? "#ffffff" : RAIL_ICON;
          const Icon = item.icon;

          const row = (
            <div
              className={cn(
                "flex h-[52px] max-h-[52px] w-full min-w-0 items-center gap-4 rounded-2xl px-4",
                navRowTransition,
                active ? navRowActive : navRowInactive
              )}
            >
              <span
                className="inline-flex size-6 shrink-0 items-center justify-center [&>svg]:block"
                aria-hidden
              >
                <Icon
                  width={24}
                  height={24}
                  {...(item.iconStroke ? { stroke: iconFill } : { fill: iconFill })}
                />
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-base leading-normal transition-colors duration-200 ease-out",
                  active ? "font-medium text-white" : "font-normal text-[#3B3B3B]"
                )}
              >
                {t(item.translationKey)}
              </span>
            </div>
          );

          if (item.external) {
            return (
              <a
                key={item.translationKey}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="no-underline"
              >
                {row}
              </a>
            );
          }

          if (item.href === "/referral") {
            return <ReferYourFriendsRow key={item.translationKey} />;
          }

          if (profileHubVariant && item.href === "/profile") {
            const chevronColor = active ? "#ffffff" : "#3B3B3B";
            return (
              <div key={item.translationKey} className="flex flex-col gap-1">
                <button
                  type="button"
                  id="profile-section-submenu-trigger"
                  aria-expanded={profileSubOpen}
                  aria-controls="profile-section-submenu"
                  aria-label={t("profileSubNavToggleAriaLabel")}
                  onClick={() => setProfileSubOpen((open) => !open)}
                  className={cn(
                    "flex h-[52px] max-h-[52px] w-full min-w-0 cursor-pointer items-center gap-4 rounded-2xl border-0 px-4 text-left outline-none transition-[color,background-color,box-shadow,transform] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-inset",
                    navRowTransition,
                    active ? navRowActive : navRowInactiveHub,
                    active
                      ? "focus-visible:ring-white/80"
                      : "focus-visible:ring-[var(--gc-primary)]/50"
                  )}
                >
                  <span
                    className="inline-flex size-6 shrink-0 items-center justify-center [&>svg]:block"
                    aria-hidden
                  >
                    <Icon width={24} height={24} fill={iconFill} />
                  </span>
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-base leading-normal transition-colors duration-200 ease-out",
                      active ? "font-medium text-white" : "font-normal text-[#3B3B3B]"
                    )}
                  >
                    {t(item.translationKey)}
                  </span>
                  <span className="inline-flex shrink-0 items-center justify-center" aria-hidden>
                    <KeyboardArrowDown
                      sx={{
                        fontSize: 24,
                        color: chevronColor,
                        transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
                        transform: profileSubOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </span>
                </button>
                <div
                  id="profile-section-submenu"
                  role="group"
                  aria-label={t("Profile Info")}
                  aria-hidden={!profileSubOpen}
                  className={cn(
                    "grid overflow-hidden transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:duration-150",
                    profileSubOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="min-h-0">
                    <div className="ml-1 mt-1 flex flex-col gap-2 pl-2 pt-0.5 md:ml-2 md:mt-0.5 md:gap-1 md:pt-1">
                      {profileSectionSubNavItems.map((sub) => {
                        const fromPath = isProfileSubNavItemActive(
                          pathname,
                          sub.href,
                          isMobileProfileHub,
                          viewportReady
                        );
                        const subActive =
                          pendingProfileSubHref != null
                            ? sub.href === pendingProfileSubHref
                            : fromPath;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className="no-underline"
                            aria-current={subActive ? "page" : undefined}
                            onClick={() => {
                              if (sub.href !== pathname) {
                                setPendingProfileSubHref(sub.href);
                              }
                            }}
                          >
                            <div
                              className={cn(
                                "flex min-h-[44px] items-center rounded-xl px-3 py-2 text-sm",
                                "transition-[background-color,color,transform,box-shadow] duration-200 ease-out motion-reduce:transition-colors",
                                "active:scale-[0.99] motion-reduce:active:scale-100",
                                subActive
                                  ? "bg-[var(--gc-primary)] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                                  : "font-normal text-[#3B3B3B] hover:bg-black/[0.03] active:bg-black/[0.05] motion-reduce:active:bg-transparent"
                              )}
                            >
                              {t(sub.messageKey)}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link key={item.translationKey} href={item.href} className="no-underline">
              {row}
            </Link>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => setLogoutDialogOpen(true)}
        className="mt-4 flex h-[52px] w-full min-w-0 cursor-pointer items-center gap-4 rounded-2xl border-0 bg-transparent px-4 text-left transition-[background-color,transform] duration-200 ease-out hover:bg-black/[0.03] active:scale-[0.99] motion-reduce:transition-colors motion-reduce:active:scale-100"
      >
        <span
          className="inline-flex size-6 shrink-0 items-center justify-center [&>svg]:block"
          aria-hidden
        >
          <LogoutIcon width={24} height={24} fill="var(--gc-primary-strong)" />
        </span>
        <span className="min-w-0 flex-1 truncate text-base font-normal leading-normal text-[#3B3B3B]">
          {t("profilePopperLogOut")}
        </span>
      </button>
      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        onConfirm={async () => {
          await signOutAuth();
          setLogoutDialogOpen(false);
        }}
      />
    </aside>
  );
};

export default SubProfile;
