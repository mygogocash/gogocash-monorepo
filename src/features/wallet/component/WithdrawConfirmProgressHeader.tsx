"use client";

import Image from "next/image";

const withdrawStateIllustration = "/withdraw/withdraw-state.png";

/**
 * GoGoCash 1.1 — withdraw status illustration (single asset, replaces layered Figma export).
 */
function WithdrawStateIllustration() {
  return (
    <div className="relative mx-auto h-[155px] w-[208px] shrink-0" aria-hidden>
      <Image
        src={withdrawStateIllustration}
        alt=""
        width={208}
        height={155}
        className="pointer-events-none h-[155px] w-[208px] object-contain"
        priority={false}
      />
    </div>
  );
}

export interface WithdrawConfirmProgressHeaderProps {
  headline: string;
  subline: string;
}

export function WithdrawConfirmProgressHeader({
  headline,
  subline,
}: WithdrawConfirmProgressHeaderProps) {
  return (
    <div className="flex w-full flex-col items-center gap-4 text-center">
      <WithdrawStateIllustration />
      <div className="flex w-full max-w-[640px] flex-col gap-1">
        <h2 className="text-[28px] font-medium leading-tight text-[#ffd700] md:text-[32px]">
          {headline}
        </h2>
        <p className="text-lg font-normal leading-relaxed text-[#7f7f7f] md:text-[18px]">
          {subline}
        </p>
      </div>
    </div>
  );
}
