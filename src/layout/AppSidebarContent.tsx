"use client";

import React, { useCallback, useEffect, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  DEFAULT_OFFERS_LIST_QUERY,
  fetchOffersList,
  offersListQueryKey,
} from "@/lib/query/offersQueries";
import { useSidebar } from "../context/SidebarContext";
import {
  ArrowUpIcon,
  ChevronDownIcon,
  DollarLineIcon,
  GridIcon,
  GroupIcon,
  HorizontaLDots,
  ListIcon,
  PieChartIcon,
  ShootingStarIcon,
  TrophyIcon,
  VideoIcon,
} from "../icons/index";

export type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string; pro?: boolean }[];
};

export const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Platform Dashboard",
    path: "/dashboard",
  },
  {
    icon: <GroupIcon />,
    name: "Users Management",
    subItems: [
      { name: "Users Admin", path: "/admin-users", pro: false },
      { name: "GoGoCash Users", path: "/users", pro: false },
      { name: "MyCashBack Users", path: "/users/mycashback", pro: false },
      { name: "Membership", path: "/membership", pro: false },
      { name: "Subscription", path: "/subscription", pro: false },
      { name: "Credit score", path: "/credit-score", pro: false },
      { name: "Referral", path: "/referral", pro: false },
      { name: "Wallet", path: "/wallet", pro: false },
    ],
  },
  {
    icon: <ShootingStarIcon />,
    name: "Brands Management",
    subItems: [
      { name: "Create brand", path: "/brands/create-brand", pro: false },
      { name: "Brands", path: "/brands", pro: false },
      { name: "Commission Management", path: "/brands?tab=commission", pro: false },
      { name: "Policy Management", path: "/brands?tab=policy", pro: false },
      { name: "User tracking link", path: "/brands?tab=deeplink", pro: false },
      { name: "Top brands", path: "/brands?tab=top-brands", pro: false },
      { name: "Missing orders", path: "/missing-orders", pro: false },
      { name: "Search config", path: "/search-config", pro: false },
    ],
  },
  {
    icon: <DollarLineIcon />,
    name: "Withdraw Management",
    subItems: [{ name: "Withdraw", path: "/withdraw", pro: false }],
  },
  {
    icon: <PieChartIcon />,
    name: "Fee",
    subItems: [{ name: "Fee Structure", path: "/fee", pro: false }],
  },
  {
    icon: <ArrowUpIcon />,
    name: "Conversion Management",
    subItems: [
      { name: "Conversion Lists", path: "/conversion", pro: false },
      { name: "Created Conversion", path: "/conversion?tab=created", pro: false },
      { name: "Add conversion", path: "/conversion/add", pro: false },
      { name: "Transactions", path: "/transactions", pro: false },
    ],
  },
  {
    icon: <VideoIcon />,
    name: "Banner Management",
    subItems: [
      { name: "Home Page Banner", path: "/banner", pro: false },
      { name: "All Brand Page banner", path: "/banner/all-brand-page", pro: false },
      { name: "Modal popups", path: "/banner/modal-popups", pro: false },
      { name: "Popup history", path: "/banner/popup-history", pro: false },
    ],
  },
  {
    icon: <ListIcon />,
    name: "Coupon Management",
    subItems: [
      { name: "Coupon", path: "/coupon", pro: false },
      { name: "Coupon History", path: "/coupon/history", pro: false },
    ],
  },
  {
    icon: <TrophyIcon />,
    name: "Quest Management",
    subItems: [
      { name: "Quest", path: "/quest", pro: false },
      { name: "Create Reward", path: "/reward", pro: false },
      { name: "Create Points", path: "/points", pro: false },
    ],
  },
];

/** Secondary sidebar group; keep empty until more items belong under "Others". */
export const othersItems: NavItem[] = [];

type SubItem = NonNullable<NavItem["subItems"]>[number];

function SidebarSubmenuLink({
  subItem,
  active,
  closeMobileSidebar,
}: {
  subItem: SubItem;
  active: boolean;
  closeMobileSidebar: () => void;
}) {
  const queryClient = useQueryClient();
  const prefetchOffersManagement = useCallback(() => {
    if (!subItem.path.startsWith("/brands")) return;
    void queryClient.prefetchQuery({
      queryKey: offersListQueryKey(DEFAULT_OFFERS_LIST_QUERY),
      queryFn: () => fetchOffersList(DEFAULT_OFFERS_LIST_QUERY),
      staleTime: 60_000,
    });
  }, [queryClient, subItem.path]);

  const className = `menu-dropdown-item ${active ? "menu-dropdown-item-active" : "menu-dropdown-item-inactive"}`;

  const badges = (
    <span className="ml-auto flex items-center gap-1">
      {subItem.pro && (
        <span className={`ml-auto ${active ? "menu-dropdown-badge-active" : "menu-dropdown-badge-inactive"} menu-dropdown-badge`}>
          pro
        </span>
      )}
    </span>
  );

  return (
    <Link
      href={subItem.path}
      onClick={closeMobileSidebar}
      onMouseEnter={prefetchOffersManagement}
      className={className}
    >
      {subItem.name}
      {badges}
    </Link>
  );
}

type Props = {
  isSubItemActive: (path: string) => boolean;
};

export default function AppSidebarContent({ isSubItemActive }: Props) {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } = useSidebar();
  const pathname = usePathname();

  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "others";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const closeMobileSidebar = useCallback(() => {
    if (isMobileOpen) toggleMobileSidebar();
  }, [isMobileOpen, toggleMobileSidebar]);

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const handleSubmenuToggle = useCallback((index: number, menuType: "main" | "others") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  }, []);

  useEffect(() => {
    startTransition(() => {
      let submenuMatched = false;
      (["main", "others"] as const).forEach((menuType) => {
        const items = menuType === "main" ? navItems : othersItems;
        items.forEach((nav, index) => {
          if (nav.subItems) {
            nav.subItems.forEach((subItem) => {
              if (isSubItemActive(subItem.path)) {
                setOpenSubmenu({
                  type: menuType,
                  index,
                });
                submenuMatched = true;
              }
            });
          }
        });
      });

      if (!submenuMatched) {
        setOpenSubmenu(null);
      }
    });
  }, [pathname, isSubItemActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-4">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              type="button"
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={`menu-item group ${
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "menu-item-active"
                  : "menu-item-inactive"
              } cursor-pointer ${
                !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
              }`}
            >
              <span
                className={` ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-icon-active"
                    : "menu-item-icon-inactive"
                }`}
              >
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <span className={`menu-item-text`}>{nav.name}</span>
              )}
              {(isExpanded || isHovered || isMobileOpen) && (
                <ChevronDownIcon
                  className={`ml-auto h-5 w-5 transition-transform duration-200 ${
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? "text-brand-500 rotate-180"
                      : ""
                  }`}
                />
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                onClick={closeMobileSidebar}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`${
                    isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className={`menu-item-text`}>{nav.name}</span>
                )}
              </Link>
            )
          )}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`] ?? 0}px`
                    : "0px",
              }}
            >
              <ul className="mt-2 ml-9 space-y-1">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.path}>
                    <SidebarSubmenuLink
                      subItem={subItem}
                      active={isSubItemActive(subItem.path)}
                      closeMobileSidebar={closeMobileSidebar}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`fixed top-0 left-0 z-50 mt-16 flex h-screen flex-col border-r border-gray-200 bg-white px-5 text-gray-900 transition-all duration-300 ease-in-out lg:mt-0 dark:border-gray-800 dark:bg-gray-900 ${
        isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
            ? "w-[290px]"
            : "w-[90px]"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex py-8 ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link
          href="/dashboard"
          className="flex items-center transition-opacity duration-200 ease-out hover:opacity-90"
          onClick={closeMobileSidebar}
        >
          {isExpanded || isHovered || isMobileOpen ? (
            <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              GoGoCash Admin
            </span>
          ) : (
            <span className="text-center text-sm font-semibold text-gray-900 dark:text-white">
              GoGoCash
            </span>
          )}
        </Link>
      </div>
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex text-xs leading-[20px] text-gray-400 uppercase ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                }`}
              >
                {isExpanded || isHovered || isMobileOpen ? "Menu" : <HorizontaLDots />}
              </h2>
              {renderMenuItems(navItems, "main")}
            </div>

            {othersItems.length > 0 && (
              <div className="">
                <h2
                  className={`mb-4 flex text-xs leading-[20px] text-gray-400 uppercase ${
                    !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                  }`}
                >
                  {isExpanded || isHovered || isMobileOpen ? "Others" : <HorizontaLDots />}
                </h2>
                {renderMenuItems(othersItems, "others")}
              </div>
            )}

            {/* External link: Open Customer App in a new tab */}
            <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
              <a
                href={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Open Customer App in new tab"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0">
                  <path d="M4.25 5A2.25 2.25 0 0 0 2 7.25v2a.75.75 0 0 0 1.5 0v-2a.75.75 0 0 1 .75-.75h2a.75.75 0 0 0 0-1.5h-2ZM13.75 5a.75.75 0 0 0 0 1.5h2a.75.75 0 0 1 .75.75v2a.75.75 0 0 0 1.5 0v-2A2.25 2.25 0 0 0 15.75 5h-2ZM3.5 13.75a.75.75 0 0 0-1.5 0v-.5a2.25 2.25 0 0 0 2.25 2.25h2a.75.75 0 0 0 0-1.5h-2a.75.75 0 0 1-.75-.75v.5ZM17.25 12.75a.75.75 0 0 0-1.5 0v1a.75.75 0 0 1-.75.75h-2a.75.75 0 0 0 0 1.5h2a2.25 2.25 0 0 0 2.25-2.25v-1ZM7 8.75A1.75 1.75 0 0 1 8.75 7h2.5A1.75 1.75 0 0 1 13 8.75v2.5A1.75 1.75 0 0 1 11.25 13h-2.5A1.75 1.75 0 0 1 7 11.25v-2.5Z" />
                </svg>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="flex-1 whitespace-nowrap">Open Customer App</span>
                )}
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="text-xs text-gray-400 group-hover:text-gray-500">↗</span>
                )}
              </a>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
}
