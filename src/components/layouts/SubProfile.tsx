"use client";

import { FEATURE_FLAGS } from "@/constants/featureFlags";
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
import LogoutIcon from "@/components/icons/LogoutIcon";
import CookiesIcon from "@/components/icons/CookiesIcon";
import LogoutConfirmDialog from "@/components/layouts/LogoutConfirmDialog";
import { Link, usePathname } from "@/i18n/navigation";
import { useCrossmintLoginContext } from "@/providers/CrossmintLoginContext";
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
import { useEffect, useState } from "react";
import type { ComponentType, SVGProps } from "react";

const TEAL = "#00AA80";

/** Shared motion for sidebar rows (panel + default links). */
const navRowTransition =
  "transition-[background-color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-colors motion-reduce:duration-150";
const navRowActive = "bg-[#00AA80] shadow-[0_1px_3px_rgba(0,0,0,0.06)]";
/** Leaf menu links: subtle press feedback. */
const navRowInactive =
  "bg-transparent hover:bg-black/[0.03] active:scale-[0.99] active:bg-black/[0.05] motion-reduce:active:scale-100 motion-reduce:active:bg-transparent";
/** Profile hub row (link + chevron): no whole-row scale so the expand control stays stable. */
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
  {
    translationKey: "navCookiesPolicy",
    href: "/privacy-center",
    icon: CookiesIcon,
    activePrefix: "/privacy-center",
  },
  {
    translationKey: "profilePopperReferYourFriends",
    href: "/referral",
    icon: ProfileAddIcon,
    activePrefix: "/referral",
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
};

const subscriptionItem: MenuEntry = {
  translationKey: "Subscription",
  href: "/subscription",
  icon: ProfileAddIcon,
  activePrefix: "/subscription",
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
  const t = useTranslations();
  const { data: session } = useSession();
  const { signOutAuth } = useCrossmintLoginContext();
  const supportHref = getSupportHref(session?.user?.region);

  const autoExpandProfileSub = shouldAutoExpandProfileSubNav(pathname);
  const [profileSubOpen, setProfileSubOpen] = useState(autoExpandProfileSub);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  useEffect(() => {
    setProfileSubOpen(shouldAutoExpandProfileSubNav(pathname));
  }, [pathname]);

  const menu: MenuEntry[] = [
    ...baseMenuHead,
    missingOrderMenuItem,
    ...baseMenuTail,
    { ...helpItem, href: supportHref },
    connectItem,
    ...(FEATURE_FLAGS.subscription ? [subscriptionItem] : []),
  ];

  return (
    <aside className={cn(subProfileAsideClass[variant], className)}>
      <nav className="flex w-full flex-1 flex-col gap-2" aria-label={t("Profile")}>
        {menu.map((item) => {
          const profileHubVariant = variant === "panel" || variant === "sidebar";
          const active =
            profileHubVariant && item.href === "/profile" && !item.external
              ? isProfileSectionHubActive(pathname)
              : isActive(pathname, item);
          const iconFill = active ? "#ffffff" : TEAL;
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

          if (profileHubVariant && item.href === "/profile") {
            const chevronColor = active ? "#ffffff" : "#3B3B3B";
            return (
              <div key={item.translationKey} className="flex flex-col gap-1">
                <div
                  className={cn(
                    "flex h-[52px] max-h-[52px] w-full items-stretch overflow-hidden rounded-2xl",
                    navRowTransition,
                    active ? navRowActive : navRowInactiveHub
                  )}
                >
                  <Link
                    href={item.href}
                    className="flex min-w-0 flex-1 items-center gap-4 px-4 no-underline"
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
                  </Link>
                  <button
                    type="button"
                    id="profile-section-submenu-trigger"
                    aria-expanded={profileSubOpen}
                    aria-controls="profile-section-submenu"
                    aria-label={t("profileSubNavToggleAriaLabel")}
                    onClick={() => setProfileSubOpen((open) => !open)}
                    className={cn(
                      "flex shrink-0 items-center justify-center border-0 px-2 transition-[color,background-color] duration-200 ease-out md:px-3",
                      "cursor-pointer bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-inset",
                      active
                        ? "text-white focus-visible:ring-white/80"
                        : "text-[#3B3B3B] focus-visible:ring-[#00AA80]/50"
                    )}
                  >
                    <KeyboardArrowDown
                      sx={{
                        fontSize: 24,
                        color: chevronColor,
                        transition: "transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
                        transform: profileSubOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                      aria-hidden
                    />
                  </button>
                </div>
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
                    <div className="ml-2 mt-0.5 flex flex-col gap-1 pl-2 pt-1">
                      {profileSectionSubNavItems.map((sub) => {
                        const subActive = isProfileSubNavItemActive(pathname, sub.href);
                        return (
                          <Link key={sub.href} href={sub.href} className="no-underline">
                            <div
                              className={cn(
                                "flex min-h-[44px] items-center rounded-xl px-3 py-2 text-sm",
                                "transition-[background-color,color,transform,box-shadow] duration-200 ease-out motion-reduce:transition-colors",
                                "active:scale-[0.99] motion-reduce:active:scale-100",
                                subActive
                                  ? "bg-[#00AA80] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
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
          <LogoutIcon width={24} height={24} fill={TEAL} />
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
