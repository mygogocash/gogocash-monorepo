"use client";
import SubProfile from "@/components/layouts/SubProfile";
import { IconButton } from "@mui/material";
import { useTranslations } from "next-intl";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useEffect } from "react";
import {
  PROFILE_SUBPAGE_CARD_CLASS,
  PROFILE_SUBPAGE_MAIN_SCROLL_SOLO_CLASS,
  PROFILE_SUBPAGE_MAIN_SCROLL_WITH_RAIL_CLASS,
} from "./subPageShell";
import type { SubPageSubtitleKey, SubPageTitleKey } from "./subPageMessageKeys";

interface IProp {
  title: SubPageTitleKey;
  /**
   * When set, used for the page `<h1>` instead of `t(title)` so Turbopack cannot drop flat keys
   * from `messages` (same pattern as missing-orders form copy).
   */
  resolvedTitle?: string;
  children?: React.ReactNode;
  subTitle?: SubPageSubtitleKey;
  showSubMenu?: boolean;
  /**
   * Use with `ProfileLayoutShell` when outer `SubProfile` is shown (split layout).
   * Renders the same main-column surface as `showSubMenu` without the embedded left panel.
   */
  contentOnly?: boolean;
}
const SubPage = ({ title, resolvedTitle, children, subTitle, showSubMenu, contentOnly }: IProp) => {
  const t = useTranslations();
  const heading = resolvedTitle ?? t(title);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: instant ? "auto" : "smooth" });
  }, [pathname]);

  if (showSubMenu) {
    return (
      <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col px-0 pb-20 pt-6 max-md:-mx-4 max-md:w-[calc(100%+2rem)] md:pt-10 md:pb-20">
        {/* Desktop: single sr-only title. Mobile: visible title lives in the top bar below. */}
        <h1 className="hidden md:sr-only">{heading}</h1>
        <div className={PROFILE_SUBPAGE_CARD_CLASS}>
          {/* md: min-h-0 + overflow-hidden so the row height follows the card (viewport), not the tallest child content */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:h-full md:min-h-0 md:flex-row md:items-stretch">
            {/* Mobile: full-screen column uses top bar + scroll only; rail is profile hub only. */}
            <div className="hidden min-h-0 flex-col border-b border-[var(--gc-border)] p-5 md:z-10 md:flex md:h-full md:max-h-full md:w-[min(320px,34%)] md:max-w-[320px] md:shrink-0 md:overflow-y-auto md:overscroll-contain md:border-b-0 md:p-6">
              <SubProfile variant="panel" />
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <Link
                href="/profile"
                className="flex min-h-[48px] min-w-0 shrink-0 items-center gap-2 border-b border-[var(--gc-border)] bg-white px-3 py-2.5 no-underline outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00cc99] md:hidden"
                aria-label={`${t("Back to Profile")}: ${heading}`}
              >
                <span className="inline-flex shrink-0 text-[#103522]" aria-hidden>
                  <ArrowBackIosIcon sx={{ fontSize: 20 }} />
                </span>
                <h1 className="min-w-0 flex-1 truncate text-[18px] font-semibold leading-snug tracking-[-0.02em] text-[#103522]">
                  {heading}
                </h1>
              </Link>
              <div
                data-testid="profile-subpage-main-scroll"
                className={`${PROFILE_SUBPAGE_MAIN_SCROLL_WITH_RAIL_CLASS} min-h-0 flex-1`}
              >
                <div
                  key={pathname}
                  className="gc-profile-subpage-content flex min-w-0 w-full flex-col gap-4 md:gap-6"
                >
                  {subTitle && (
                    <h2 className="text-[20px] font-semibold tracking-tight text-[#3b3b3b] md:text-[22px]">
                      {t(subTitle)}
                    </h2>
                  )}
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (contentOnly) {
    return (
      <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col px-0 pb-20 pt-6 max-md:-mx-4 max-md:w-[calc(100%+2rem)] md:pt-10 md:pb-20">
        <h1 className="sr-only">{heading}</h1>
        <div className={PROFILE_SUBPAGE_CARD_CLASS}>
          <div
            data-testid="profile-subpage-main-scroll"
            className={PROFILE_SUBPAGE_MAIN_SCROLL_SOLO_CLASS}
          >
            <div
              key={pathname}
              className="gc-profile-subpage-content flex min-w-0 w-full flex-col gap-4 md:gap-6"
            >
              {subTitle && (
                <h2 className="text-[20px] font-semibold tracking-tight text-[#3b3b3b] md:text-[22px]">
                  {t(subTitle)}
                </h2>
              )}
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1080px] pb-12 max-md:-mx-4 max-md:w-[calc(100%+2rem)] md:px-0">
      {/* Mobile: no back row (profile hub uses bottom nav); keep one sr-only h1 for a11y. md+: visible title bar. */}
      <h1 className="sr-only md:hidden">{heading}</h1>
      <div className="mb-4 hidden w-full items-center gap-3 pt-5 md:mb-8 md:flex md:pt-10">
        <IconButton
          onClick={() => {
            router.back();
          }}
        >
          <ArrowBackIosIcon />
        </IconButton>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[#103522] md:text-[34px]">
          {heading}
        </h1>
      </div>
      <div className="gc-surface-card flex h-full w-full gap-2 p-2 md:p-3">
        <div className="flex w-full flex-col gap-6 overflow-auto rounded-[24px] bg-white/80 p-4 md:p-6 md:pb-10">
          {subTitle && (
            <h5 className="text-[20px] font-semibold tracking-[-0.02em] text-[#102217] md:text-[22px]">
              {t(subTitle)}
            </h5>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default SubPage;
