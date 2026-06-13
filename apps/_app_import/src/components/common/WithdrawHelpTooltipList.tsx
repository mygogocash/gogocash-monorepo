"use client";

import { useTranslations } from "next-intl";

/** Bullet list explaining total / pending / withdrawn cashback (shared by wallet + withdraw help tooltips). */
export function WithdrawHelpTooltipList() {
  const t = useTranslations();
  return (
    <ul className="m-0 list-disc space-y-1.5 pl-4 text-left text-sm leading-normal text-[#031819]">
      <li>{t("withdrawHelpTooltipLine1")}</li>
      <li>{t("withdrawHelpTooltipLine2")}</li>
      <li>{t("withdrawHelpTooltipLine3")}</li>
    </ul>
  );
}
