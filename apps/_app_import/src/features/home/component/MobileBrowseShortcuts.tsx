"use client";

import { useTranslations } from "next-intl";
import type { Route } from "next";
import { Link } from "@/i18n/navigation";
import { MenuBarMaskedIcon } from "@/components/nav/MenuBarMaskedIcon";
import type { DesktopMenuBarIcon } from "@/constants/navigation";

type BrowseTile = {
  id: string;
  labelKey: string;
  href: Route;
  icon: DesktopMenuBarIcon;
};

const BROWSE_TILES: readonly BrowseTile[] = [
  { id: "all-brands", labelKey: "navAllBrands", href: "/brand", icon: "shop" },
  { id: "all-shops", labelKey: "navAllShops", href: "/shops", icon: "shops" },
  {
    id: "product-discover",
    labelKey: "navProductDiscover",
    href: "/discover",
    icon: "promotion",
  },
  { id: "categories", labelKey: "categories", href: "/category", icon: "education" },
];

/**
 * Mobile-only compact menu bar below the search field. Surfaces the 4 desktop nav
 * features that aren't reachable from `FooterMobile` (All Brands / All Shops /
 * Product Discovery / Categories). Hidden on `md+` since the desktop top-bar
 * already exposes these.
 */
export default function MobileBrowseShortcuts() {
  const t = useTranslations();

  return (
    <nav
      aria-label={t("navAllShops")}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
    >
      {BROWSE_TILES.map((tile) => (
        <Link
          key={tile.id}
          href={tile.href}
          className="gc-hover-lift inline-flex shrink-0 items-center gap-1.5 rounded-full border border-(--gc-border) bg-white px-3 py-2 text-xs font-semibold text-(--gc-text) no-underline shadow-sm"
        >
          <span
            aria-hidden
            className="flex size-5 shrink-0 items-center justify-center text-(--gc-primary-strong)"
          >
            <MenuBarMaskedIcon kind={tile.icon} active sizeClass="size-4" variant="navbar" />
          </span>
          <span className="whitespace-nowrap">{t(tile.labelKey)}</span>
        </Link>
      ))}
    </nav>
  );
}
