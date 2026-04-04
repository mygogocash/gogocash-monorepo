"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

const BANNER_WIDTH = 924;
const BANNER_HEIGHT = 472;

/**
 * Referral step-by-step guide as a single banner asset (`public/referral/invite-friend-step-banner.svg`).
 */
export default function ReferralStepsSection() {
  const t = useTranslations();
  const alt = `${t("referralStepsKicker")} ${t("referralStepsTitle")}. ${t("referralStepCopyLink")} ${t("referralStepShareFriends")} ${t("referralStepEarnBoth")}`;

  return (
    <section
      className="w-full overflow-hidden rounded-2xl"
      aria-labelledby="referral-steps-heading"
    >
      <h2 id="referral-steps-heading" className="sr-only">
        {t("referralStepsTitle")}
      </h2>
      <Image
        src="/referral/invite-friend-step-banner.svg"
        alt={alt}
        width={BANNER_WIDTH}
        height={BANNER_HEIGHT}
        className="h-auto w-full"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 911px"
        priority={false}
        unoptimized
      />
    </section>
  );
}
