"use client";

import { designSystemColor } from "@/constants/design-system";
import { useTranslations } from "next-intl";

/**
 * Empty favorites grid — GoGoCash 1.1
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=9080-138313
 */
function FavoriteShopsEmptyIllustration() {
  return (
    <svg
      width={256}
      height={120}
      viewBox="0 0 256 120"
      className="mx-auto shrink-0 opacity-60"
      aria-hidden
    >
      <g
        stroke="#989898"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Storefront */}
        <path d="M88 88V52h80v36" />
        <path d="M84 52l12-18h68l12 18" />
        <path d="M96 52v-10h64v10" />
        {/* Awning scallops */}
        <path d="M96 52c6-4 12-4 18 0s12 4 18 0 12-4 18 0 12 4 18 0 12-4 18 0" />
        <path d="M100 88h56M108 72h40" strokeWidth={1} />
        {/* Door */}
        <path d="M118 88V68h20v20" strokeWidth={1.2} />
        {/* Floating hearts */}
        <path
          d="M24 36c0-6 5-10 10-8 2-4 8-5 12-1 4-4 10-3 12 1 4-8 10-8 14-4-4-8-10-8z"
          fill="#e8e8e8"
          stroke="#b0b0b0"
          strokeWidth={1}
        />
        <path
          d="M210 28c0-4 3.5-7 7-5.5 1.5-3 5.5-3.5 8 0 2.8-3.2 7-3.2 10-2.8-2.8-7-7-7z"
          fill="#e8e8e8"
          stroke="#b0b0b0"
          strokeWidth={0.9}
        />
        <path
          d="M196 92c0-3 2.5-5.5 5-4.5 1-2.5 4-3 6 0 2-2.5 5.5-2.5 8-2-2-5.5-5.5-5.5z"
          fill="#f0f0f0"
          stroke="#b8b8b8"
          strokeWidth={0.85}
        />
        <circle cx={48} cy={22} r={3} strokeWidth={1} />
        <circle cx={228} cy={56} r={2.5} strokeWidth={1} />
        <circle cx={32} cy={78} r={2} strokeWidth={1} />
      </g>
    </svg>
  );
}

export default function FavoriteShopsEmptyState() {
  const t = useTranslations();

  return (
    <div
      className="flex w-full flex-col items-center justify-center gap-6 py-16 md:py-[72px]"
      role="status"
      aria-live="polite"
    >
      <FavoriteShopsEmptyIllustration />
      <div className="flex w-full max-w-lg flex-col gap-2 text-center">
        <p
          className="text-2xl font-medium leading-snug"
          style={{ color: designSystemColor.green2 }}
        >
          {t("favoritePageEmptyTitle")}
        </p>
        <p className="text-base font-normal leading-relaxed text-[#7f7f7f]">
          {t("favoritePageEmptyDescription")}
        </p>
      </div>
    </div>
  );
}
