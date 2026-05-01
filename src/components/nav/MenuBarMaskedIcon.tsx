"use client";

import ShopIcon from "@/components/icons/ShopIcon";
import { cn } from "@/lib/utils";
import type { DesktopMenuBarIcon } from "@/constants/navigation";
import type { CSSProperties } from "react";

/**
 * Menu-bar glyphs from Figma **Icon** (Streamline Core), file GoGoCash 1.1 · node `6:30038`:
 * https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=6-30038
 *
 * SVGs live under `/public/nav/menu-bar/`, use `fill="currentColor"` for mask + `background-color` tinting.
 */
const FIGMA_MENU_BAR_SVG: Partial<Record<DesktopMenuBarIcon, string>> = {
  promotion: "/nav/menu-bar/promotion.svg",
  /** 4-tile grid representing a directory of shops (distinguishes "All Shops" from single-storefront "All Brands"). */
  shops: "/nav/menu-bar/shops.svg",
  travel: "/nav/menu-bar/travel.svg",
  electronic: "/nav/menu-bar/electronics.svg",
  beauty: "/nav/menu-bar/health-beauty.svg",
  digital: "/nav/menu-bar/digital-services.svg",
  /** `interface-content-book-open--content-books-book-open` · Figma node `6:29197` */
  education: "/nav/menu-bar/education.svg",
  help: "/nav/menu-bar/help.svg",
};

export type MenuBarMaskedIconVariant = "navbar" | "explore";

export function MenuBarMaskedIcon({
  kind,
  active,
  variant = "navbar",
  sizeClass = "size-4",
  className,
}: {
  kind: DesktopMenuBarIcon;
  active: boolean;
  variant?: MenuBarMaskedIconVariant;
  /** Tailwind size utility, e.g. size-4 (SubHeader), size-5 lg:size-6 (explore aside) */
  sizeClass?: string;
  className?: string;
}) {
  const src = FIGMA_MENU_BAR_SVG[kind];

  if (src) {
    const maskStyle: CSSProperties = {
      maskImage: `url("${src}")`,
      WebkitMaskImage: `url("${src}")`,
      maskSize: "contain",
      WebkitMaskSize: "contain",
      maskRepeat: "no-repeat",
      WebkitMaskRepeat: "no-repeat",
      maskPosition: "center",
      WebkitMaskPosition: "center",
      /* Prefer alpha over luminance so opaque black/currentColor in SVG masks reliably */
      maskMode: "alpha",
    };

    const bgNavbar = active ? "bg-[#00B14F]" : "bg-[#3B3B3B] group-hover:bg-[#103522]";
    const bgExplore = active
      ? "bg-white"
      : "bg-[#3b3b3b] group-hover:bg-[#00aa80] lg:group-hover:bg-[#00aa80]";

    return (
      <span
        className={cn(
          "block transition-colors",
          sizeClass,
          variant === "explore" ? bgExplore : bgNavbar,
          className
        )}
        style={maskStyle}
      />
    );
  }

  if (kind === "shop") {
    const textNavbar = active ? "text-[#00B14F]" : "text-[#3B3B3B] group-hover:text-[#103522]";
    const textExplore = active
      ? "text-white"
      : "text-[#3b3b3b] group-hover:text-[#00aa80] lg:group-hover:text-[#00aa80]";

    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center [&_svg]:h-full [&_svg]:w-full",
          sizeClass,
          variant === "explore" ? textExplore : textNavbar,
          className
        )}
      >
        <ShopIcon
          fill="currentColor"
          width="16"
          height="16"
          className="block h-full w-full max-h-full max-w-full"
        />
      </span>
    );
  }

  return null;
}
