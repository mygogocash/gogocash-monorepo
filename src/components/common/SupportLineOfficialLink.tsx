"use client";

import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import { useTranslations } from "next-intl";
import { SUPPORT_LINE_OFFICIAL_HREF } from "@/constants/navigation";

export function SupportLineOfficialLink() {
  const t = useTranslations();

  return (
    <a
      href={SUPPORT_LINE_OFFICIAL_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex w-full shrink-0 items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-all duration-200 hover:border-[#00cc99]/35 hover:shadow-[0_8px_24px_rgba(0,204,153,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00cc99] focus-visible:ring-offset-2 md:w-auto md:min-w-[232px]"
      aria-label={`${t("withdrawContactSupport")} — ${t("withdrawContactSupportLineOaSub")}`}
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#06C755]/12"
        aria-hidden
      >
        <span className="select-none text-[11px] font-bold tracking-tight text-[#06C755]">
          LINE
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
        <span className="text-[15px] font-semibold leading-tight text-[#103522]">
          {t("withdrawContactSupport")}
        </span>
        <span className="text-xs font-medium leading-tight text-slate-500">
          {t("withdrawContactSupportLineOaSub")}
        </span>
      </span>
      <OpenInNewOutlined
        sx={{ fontSize: 20 }}
        className="shrink-0 text-slate-400 transition-colors group-hover:text-[#00A148]"
        aria-hidden
      />
    </a>
  );
}
