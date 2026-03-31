"use client";
import SubProfile from "@/components/layouts/SubProfile";
import { IconButton } from "@mui/material";
import { useTranslations } from "next-intl";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useEffect, useRef } from "react";
import type { SubPageSubtitleKey, SubPageTitleKey } from "./subPageMessageKeys";

interface IProp {
  title: SubPageTitleKey;
  children?: React.ReactNode;
  subTitle?: SubPageSubtitleKey;
  showSubMenu?: boolean;
  /**
   * Use with `ProfileLayoutShell` when outer `SubProfile` is shown (split layout).
   * Renders the same main-column surface as `showSubMenu` without the embedded left panel.
   */
  contentOnly?: boolean;
}
const SubPage = ({ title, children, subTitle, showSubMenu, contentOnly }: IProp) => {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const mainScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mainScrollRef.current;
    if (!el) return;
    const instant =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: 0, behavior: instant ? "auto" : "smooth" });
  }, [pathname]);

  if (showSubMenu) {
    return (
      <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col px-0 pb-20 pt-6 md:pt-10 md:pb-20">
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border border-[#e4e4e4] bg-white">
          <div className="flex min-h-0 flex-1 flex-col md:flex-row md:items-start">
            <div className="flex min-h-0 flex-col border-b border-[#e4e4e4] p-5 md:sticky md:top-6 md:z-10 md:max-h-[calc(100vh-7rem)] md:w-[min(320px,34%)] md:max-w-[320px] md:shrink-0 md:overflow-y-auto md:overscroll-contain md:border-b-0 md:border-r md:p-6">
              <SubProfile variant="panel" />
            </div>
            <div
              ref={mainScrollRef}
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-auto overscroll-contain p-5 md:min-h-0 md:p-6"
            >
              <div
                key={pathname}
                className="gc-profile-subpage-content flex min-h-0 min-w-0 flex-1 flex-col gap-6"
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
    );
  }

  if (contentOnly) {
    return (
      <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col px-0 pb-20 pt-6 md:pt-10 md:pb-20">
        <h1 className="sr-only">{t(title)}</h1>
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border border-[#e4e4e4] bg-white">
          <div
            ref={mainScrollRef}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-auto overscroll-contain p-5 md:p-6"
          >
            <div
              key={pathname}
              className="gc-profile-subpage-content flex min-h-0 min-w-0 flex-1 flex-col gap-6"
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
    <div className="mx-auto w-full max-w-[1080px] px-4 pb-12 md:px-0">
      <div className="mb-4 flex w-full items-center gap-3 pt-5 md:mb-8 md:pt-10">
        <IconButton
          onClick={() => {
            router.back();
          }}
        >
          <ArrowBackIosIcon />
        </IconButton>
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-[#103522] md:text-[34px]">
          {t(title)}
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
