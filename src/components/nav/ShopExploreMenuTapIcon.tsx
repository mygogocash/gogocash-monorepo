"use client";

import { cn } from "@/lib/utils";
import {
  SHOP_EXPLORE_ALL_ICON_PATH,
  SHOP_EXPLORE_CATEGORY_ICON_PATHS,
} from "@/components/nav/shopExploreMenuTapPaths.generated";

/** Figma Menu Taps (8123:68217): 24×24 icon slot at x=16; rows every 60px from y=14. */
const ICON_SLOT_X = 16;
const FIRST_ROW_Y = 14;
const ROW_STEP = 60;

/**
 * Vector icons from Figma “Menu Taps.svg” (node 8123:68217). Tint via `currentColor`
 * on the parent row (`text-white` active, `#005D46` default in List).
 *
 * **Sizing:** Omit `className` for shop-explore nav defaults (`size-5` / `lg:size-6`).
 * Pass explicit `className` (e.g. `size-4 md:size-3` from `CategoryChip`) so chip icons
 * are not enlarged by the nav breakpoint.
 */
export function ShopExploreMenuTapIcon({
  variant,
  categoryIndex = 0,
  className,
}: {
  variant: "all" | "category";
  /** 0 = Digital Services … 12 = Others (order matches `SHOP_EXPLORE_MENU_ITEMS`) */
  categoryIndex?: number;
  /** When set, replaces default `size-5 lg:size-6` (must include size utilities if needed). */
  className?: string;
}) {
  const translateY = variant === "all" ? FIRST_ROW_Y : FIRST_ROW_Y + ROW_STEP * (categoryIndex + 1);

  const d =
    variant === "all"
      ? SHOP_EXPLORE_ALL_ICON_PATH
      : SHOP_EXPLORE_CATEGORY_ICON_PATHS[categoryIndex];

  if (variant === "category" && d === undefined) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className ?? "size-5 lg:size-6")}
      aria-hidden
    >
      <g transform={`translate(-${ICON_SLOT_X},-${translateY})`}>
        <path d={d} fill="currentColor" />
      </g>
    </svg>
  );
}
