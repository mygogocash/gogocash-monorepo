"use client";

import { Typography } from "@mui/material";
import type { PurposeCode } from "@/lib/pdpa/constants";
import { useTranslations } from "next-intl";

type Props = {
  purposeCode: PurposeCode;
  className?: string;
};

/** Inline notice before data collection (มาตรา 23 alignment). */
export default function PDPAMicroNotice({ purposeCode, className }: Props) {
  const t = useTranslations();
  return (
    <Typography variant="caption" color="text.secondary" className={className} component="p">
      {t("pdpaMicroNotice")} <span className="sr-only">({purposeCode})</span>
    </Typography>
  );
}
