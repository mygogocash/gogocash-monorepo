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
      className="flex h-full min-h-19 w-[112px] flex-col items-center justify-center gap-2 rounded-xl border border-[#e8e8e8] bg-white px-3 py-2.5 text-center shadow-[0_1px_2px_rgba(16,34,23,0.04)] transition hover:border-[#00cc99]/45 hover:bg-[#f9fffc] hover:shadow-[0_4px_14px_rgba(0,204,153,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00cc99] active:scale-[0.98] lg:min-h-15 lg:gap-1 lg:px-2 lg:py-1.5"
    >
      <span
        className="relative flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-5! [&_svg]:w-5! lg:h-[18px] lg:w-[18px] lg:[&_svg]:h-[18px]! lg:[&_svg]:w-[18px]!"
        aria-hidden
      >
        <Image
          src={iconSrc}
          alt=""
          width={20}
          height={20}
          unoptimized={isSvg}
          className="h-5 w-5 object-contain lg:h-[18px] lg:w-[18px]"
        />
      </span>
      <span className="line-clamp-2 min-h-8 w-full text-[11px] font-medium leading-snug text-[#5c5c5c] lg:min-h-0 lg:text-[10px] lg:leading-tight">
        {label}
      </span>
    </button>
  );
}
