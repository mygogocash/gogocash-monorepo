"use client";

import { Button, Typography } from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

const sectionHeadingClass = "text-lg font-semibold tracking-tight text-[#1a1a1a] md:text-xl";

const cardPad = "p-4 sm:p-5 md:p-8";

const cardActionFootnoteClass =
  "mt-3 max-md:leading-snug text-center text-[#6b7280] md:mt-4 md:leading-relaxed";

const primaryGreenButtonSx = {
  bgcolor: "#00AA80",
  "&:hover": { bgcolor: "#009970" },
} as const;

/**
 * PDPA data portability + erasure requests (moved from Privacy Center to Personal Information).
 */
export default function PdpaDataRightsSection() {
  const t = useTranslations();

  const requestExport = async () => {
    try {
      const res = await fetch("/api/pdpa/data-subject-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "PORTABILITY", channel: "IN_APP" }),
      });
      if (!res.ok) {
        toast.error(t("pdpaRequestFailed"));
        return;
      }
      toast.success(t("pdpaRequestSubmitted"));
    } catch {
      toast.error(t("pdpaRequestFailed"));
    }
  };

  const requestErasure = async () => {
    try {
      const res = await fetch("/api/pdpa/data-subject-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "ERASURE", channel: "IN_APP" }),
      });
      if (!res.ok) {
        toast.error(t("pdpaRequestFailed"));
        return;
      }
      toast.success(t("pdpaRequestSubmitted"));
    } catch {
      toast.error(t("pdpaRequestFailed"));
    }
  };

  return (
    <section
      aria-labelledby="pdpa-data-rights-heading"
      className="flex flex-col gap-6 border-t border-[#e4e4e4] pt-6 md:gap-8"
    >
      <h3 id="pdpa-data-rights-heading" className={sectionHeadingClass}>
        {t("pdpaSectionExport")} &amp; {t("pdpaSectionDelete")}
      </h3>
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2 lg:gap-8">
        <div className={`flex h-full flex-col rounded-2xl border border-[#e4e4e4] bg-white shadow-sm ${cardPad}`}>
          <div className="mb-3 flex items-center gap-2.5 text-[#00AA80] md:mb-4 md:gap-3">
            <DownloadRoundedIcon sx={{ fontSize: { xs: 24, md: 26 } }} aria-hidden />
            <Typography
              variant="subtitle1"
              component="h4"
              className="text-[15px] font-semibold text-[#1a1a1a] md:text-base"
            >
              {t("pdpaSectionExport")}
            </Typography>
          </div>
          <Typography
            variant="body2"
            className="mb-4 flex-1 text-[14px] leading-relaxed text-[#5a5a5a] md:mb-6 md:text-[0.875rem]"
          >
            {t("pdpaExportSectionBody")}
          </Typography>
          <Button
            variant="contained"
            className="max-md:min-h-11 max-md:py-2 max-md:text-[0.9375rem] w-full rounded-full normal-case sm:w-auto"
            aria-describedby="pdpa-export-email-note"
            onClick={() => void requestExport()}
            sx={primaryGreenButtonSx}
          >
            {t("pdpaRequestExport")}
          </Button>
          <Typography
            id="pdpa-export-email-note"
            variant="caption"
            component="p"
            className={`m-0 ${cardActionFootnoteClass}`}
          >
            {t("pdpaExportEmailNote")}
          </Typography>
        </div>

        <div className={`flex h-full flex-col rounded-2xl border border-[#f0e6d6] bg-[#fffaf5] shadow-sm ${cardPad}`}>
          <div className="mb-3 flex items-center gap-2.5 text-[#c45c00] md:mb-4 md:gap-3">
            <DeleteOutlineRoundedIcon sx={{ fontSize: { xs: 24, md: 26 } }} aria-hidden />
            <Typography
              variant="subtitle1"
              component="h4"
              className="text-[15px] font-semibold text-[#1a1a1a] md:text-base"
            >
              {t("pdpaSectionDelete")}
            </Typography>
          </div>
          <Typography
            variant="body2"
            className="mb-4 flex-1 text-[14px] leading-relaxed text-[#5a5a5a] md:mb-6 md:text-[0.875rem]"
          >
            {t("pdpaDeleteSectionBody")}
          </Typography>
          <Button
            variant="outlined"
            color="warning"
            className="max-md:min-h-11 max-md:py-2 max-md:text-[0.9375rem] w-full rounded-full border-amber-700 normal-case sm:w-auto"
            aria-describedby="pdpa-delete-retention-note"
            onClick={() => void requestErasure()}
          >
            {t("pdpaRequestDeleteButton")}
          </Button>
          <Typography
            id="pdpa-delete-retention-note"
            variant="caption"
            component="p"
            className={`m-0 ${cardActionFootnoteClass}`}
          >
            {t("pdpaDeleteRetentionNote")}
          </Typography>
        </div>
      </div>
    </section>
  );
}
