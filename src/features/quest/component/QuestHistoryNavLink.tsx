"use client";

import QuestIcon from "@/components/icons/QuestIcon";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/** Match `SubProfile` rail row tokens for parity with profile mobile nav. */
const RAIL_ICON = "var(--gc-primary-strong)";
const navRowTransition =
  "transition-[background-color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-colors motion-reduce:duration-150";
const navRowActive = "bg-[var(--gc-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]";
const navRowInactive =
  "bg-transparent hover:bg-black/[0.03] active:scale-[0.99] active:bg-black/[0.05] motion-reduce:active:scale-100 motion-reduce:active:bg-transparent";

type QuestHistoryNavLinkProps = {
  className?: string;
  /** `inline` — same-row header chip (mobile leaderboard). Default `rail` matches SubProfile. */
  variant?: "rail" | "inline";
};

export default function QuestHistoryNavLink({
  className,
  variant = "rail",
}: QuestHistoryNavLinkProps) {
  const pathname = usePathname();
  const t = useTranslations();
  const questHistoryActive =
    pathname === "/quest/history" || pathname.startsWith("/quest/history/");

  if (variant === "inline") {
    const fill = questHistoryActive ? "#007D5E" : "#00CC99";
    return (
      <div className={className}>
        <Link
          href="/quest/history"
          className="no-underline"
          aria-current={questHistoryActive ? "page" : undefined}
        >
          <span
            className={cn(
              "inline-flex max-w-[min(220px,48vw)] items-center gap-1.5 rounded-lg py-0.5 text-left",
              "text-[12px] font-medium leading-tight text-[#00CC99] transition-opacity hover:opacity-90 sm:text-[13px]",
              questHistoryActive && "font-semibold text-[#007D5E]"
            )}
          >
            <QuestIcon width={18} height={18} className="shrink-0" fill={fill} aria-hidden />
            <span className="min-w-0 truncate">{t("profilePopperGogoquestHistory")}</span>
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className={className}>
      <Link
        href="/quest/history"
        className="no-underline"
        aria-current={questHistoryActive ? "page" : undefined}
      >
        <div
          className={cn(
            "flex h-[52px] max-h-[52px] w-full min-w-0 items-center gap-4 rounded-2xl px-4",
            navRowTransition,
            questHistoryActive ? navRowActive : navRowInactive
          )}
        >
          <span
            className="inline-flex size-6 shrink-0 items-center justify-center [&>svg]:block"
            aria-hidden
          >
            <QuestIcon width={24} height={24} fill={questHistoryActive ? "#ffffff" : RAIL_ICON} />
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-base leading-normal transition-colors duration-200 ease-out",
              questHistoryActive ? "font-medium text-white" : "font-normal text-[#3B3B3B]"
            )}
          >
            {t("profilePopperGogoquestHistory")}
          </span>
        </div>
      </Link>
    </div>
  );
}
