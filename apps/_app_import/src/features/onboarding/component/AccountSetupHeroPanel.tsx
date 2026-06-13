"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * Promotional hero — mirrors the login page's card shape exactly (Figma
 * auth layout; LoginComponent.tsx line 534). Same 588×690 aspect, same
 * rounded border, same `lg:block` gate so mobile / tablet get the form
 * only and desktop gets the split hero+form view.
 */
export function AccountSetupHeroPanel() {
  const t = useTranslations();
  return (
    <div className="relative mx-auto hidden aspect-588/690 w-full max-w-[588px] shrink-0 overflow-hidden rounded-[24px] border-2 border-[#e4e4e4] lg:mx-0 lg:block lg:aspect-auto lg:h-[690px]">
      <Image
        src="/images/auth-login-hero.png"
        alt={t("authHeroAlt")}
        fill
        className="object-cover"
        priority
        sizes="(max-width: 1023px) min(100vw, 588px), 588px"
      />
    </div>
  );
}
