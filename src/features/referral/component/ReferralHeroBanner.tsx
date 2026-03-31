"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

const BANNER_WIDTH = 924;
const BANNER_HEIGHT = 184;

/**
 * Referral hero as a single banner asset (`public/referral/refer-friend-banner.svg`).
 */
export default function ReferralHeroBanner() {
  const t = useTranslations();
  const headline = `${t("referralHeroInvitePrefix")} ${t("referralHeroBrand")} ${t("referralHeroGetBonus")} ${t("referralHeroBonusHighlight")}`;
  const subtitle = t("Share your link or referral code below and enjoy your bonus instantly");
  const alt = `${headline} ${subtitle}`;

  return (
    <section className="w-full overflow-hidden rounded-2xl" aria-labelledby="referral-hero-heading">
      <h2 id="referral-hero-heading" className="sr-only">
        {headline}
      </h2>
      <p className="sr-only">{subtitle}</p>
      <Image
        src="/referral/refer-friend-banner.svg"
        alt={alt}
        width={BANNER_WIDTH}
        height={BANNER_HEIGHT}
        className="h-auto w-full"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 911px"
        priority
        unoptimized
      />
    </section>
  );
}
