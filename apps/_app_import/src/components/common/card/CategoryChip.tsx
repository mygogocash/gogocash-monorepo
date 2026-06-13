"use client";

import { ShopExploreMenuTapIcon } from "@/components/nav/ShopExploreMenuTapIcon";
import { cn } from "@/lib/utils";

const BASE =
  "inline-flex min-h-0 items-center gap-1 overflow-hidden rounded-full border border-(--gc-border-mint) bg-(--gc-primary-soft) font-medium leading-none text-(--gc-primary-strong) shadow-[0_1px_3px_rgba(0,170,128,0.12)]";

const SIZE = {
  sm: "h-4 max-h-4 px-1.5 py-0 text-[10px]",
  md: "h-5 max-h-5 px-2 py-0 text-[10px] sm:text-xs md:h-4 md:max-h-4 md:px-1.5",
} as const;

const ICON_SIZE = {
  sm: "size-3",
  /** Smaller icon from `md` up so chips match desktop type scale (see `CardSpecial`). */
  md: "size-4 md:size-3",
} as const;

interface CategoryChipProps {
  label: string;
  iconIndex: number;
  size?: "sm" | "md";
  className?: string;
}

export function CategoryChip({ label, iconIndex, size = "sm", className }: CategoryChipProps) {
  return (
    <span className={cn(BASE, SIZE[size], className)}>
      <span className="flex shrink-0 items-center justify-center text-(--gc-primary-strong)">
        <ShopExploreMenuTapIcon
          variant="category"
          categoryIndex={iconIndex}
          className={ICON_SIZE[size]}
        />
      </span>
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}
