"use client";

import Image from "next/image";

export type SocialAuthTileProps = {
  label: string;
  onClick: () => void;
  /** Public path under `/public` (e.g. `/social/login/google.svg`). */
  iconSrc: string;
};

/**
 * Compact provider button for the login/register social grid.
 */
export default function SocialAuthTile({ label, onClick, iconSrc }: SocialAuthTileProps) {
  const isSvg = iconSrc.endsWith(".svg");

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] w-full touch-manipulation flex-col items-center justify-center gap-1.5 rounded-2xl border border-[#e4e4e4] bg-white px-2 py-3 text-center shadow-[0_2px_8px_rgba(16,34,23,0.06)] transition hover:border-[#00cc99]/50 hover:bg-[#f9fffc] hover:shadow-[0_4px_16px_rgba(0,204,153,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cc99] active:scale-[0.98] lg:min-h-15 lg:w-[112px] lg:gap-1 lg:rounded-xl lg:border-[#e8e8e8] lg:px-2 lg:py-1.5 lg:shadow-[0_1px_2px_rgba(16,34,23,0.04)]"
    >
      <span
        className="relative flex h-6 w-6 shrink-0 items-center justify-center [&_svg]:h-6! [&_svg]:w-6! lg:h-[18px] lg:w-[18px] lg:[&_svg]:h-[18px]! lg:[&_svg]:w-[18px]!"
        aria-hidden
      >
        <Image
          src={iconSrc}
          alt=""
          width={24}
          height={24}
          unoptimized={isSvg}
          className="h-6 w-6 object-contain lg:h-[18px] lg:w-[18px]"
        />
      </span>
      <span className="line-clamp-2 w-full px-0.5 text-center text-xs font-semibold leading-tight text-[#3b3b3b] lg:min-h-0 lg:text-[10px] lg:font-medium lg:leading-tight lg:text-[#5c5c5c]">
        {label}
      </span>
    </button>
  );
}
