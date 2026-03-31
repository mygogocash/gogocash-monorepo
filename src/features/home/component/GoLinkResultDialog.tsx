"use client";

import { GOGOCASH_GITBOOK_LEARN_SHOPPING_HREF } from "@/constants/navigation";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import { Dialog, IconButton } from "@mui/material";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export type GoLinkResultDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Valid http(s) URL the user pasted — opened when they tap Shop Now. */
  href: string | null;
};

/**
 * GoGoCash 1.1 — Figma node 9669:184807 (Link result after paste).
 * Demo product visuals under `/public/golink-result/`; cashback line is illustrative until an API exists.
 */
export function GoLinkResultDialog({ open, onClose, href }: GoLinkResultDialogProps) {
  const t = useTranslations();
  const [showPastedBar, setShowPastedBar] = useState(true);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setShowPastedBar(true);
    });
  }, [open]);

  const hostLabel = (() => {
    if (!href) return "";
    try {
      return new URL(href).hostname.replace(/^www\./i, "");
    } catch {
      return "";
    }
  })();

  const shopNow = () => {
    if (!href) return;
    window.open(href, "_blank", "noopener,noreferrer");
    onClose();
  };

  return (
    <Dialog
      open={open && Boolean(href)}
      onClose={onClose}
      aria-labelledby="golink-result-title"
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.45)" } },
      }}
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: "24px",
          maxWidth: "640px",
          width: "100%",
          margin: "16px",
          maxHeight: "min(92vh, 720px)",
          overflow: "hidden",
        },
      }}
    >
      {href ? (
        <div className="relative flex max-h-[min(92vh,720px)] flex-col overflow-y-auto p-5 sm:p-6">
          <IconButton
            type="button"
            onClick={onClose}
            aria-label={t("golinkResultCloseAria")}
            className="!absolute !right-3 !top-3 z-[2] text-[#3B3B3B]"
            size="small"
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <div className="mt-6 flex flex-col gap-8 lg:mt-2 lg:flex-row lg:gap-6">
            <div className="relative mx-auto h-[200px] w-[200px] shrink-0 overflow-hidden rounded-2xl border border-[#f6f6f6] sm:h-[220px] sm:w-[220px] lg:h-[240px] lg:w-[240px]">
              <Image
                src="/golink-result/product-demo.png"
                alt={t("golinkResultProductImageAlt")}
                fill
                className="object-cover"
                sizes="240px"
                priority={open}
              />
              <div className="absolute bottom-2.5 right-2.5 size-12">
                <Image
                  src="/golink-result/shop-badge.png"
                  alt={t("golinkResultShopBadgeAlt")}
                  width={48}
                  height={48}
                  className="size-12 object-contain"
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-w-[296px]">
              <div className="flex gap-2 pr-8">
                <div className="min-w-0 flex-1">
                  <p
                    id="golink-result-title"
                    className="text-lg font-normal leading-snug text-[#3b3b3b]"
                  >
                    {t("golinkResultDemoProductTitle")}
                  </p>
                  {hostLabel ? (
                    <p className="mt-1 truncate text-sm text-[#7f7f7f]" title={href}>
                      {t("golinkResultSourceHost", { host: hostLabel })}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <span className="text-2xl font-semibold leading-none text-[#3b3b3b]">
                      {t("golinkResultDemoPriceAmount")}
                    </span>
                    <span className="pb-0.5 text-lg font-semibold text-[#3b3b3b]">
                      {t("golinkResultDemoPriceCurrency")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-[288px] overflow-hidden rounded-lg border border-[#e4e4e4]">
                <div className="flex flex-wrap items-baseline gap-1 border-x border-t border-[#e4e4e4] px-3 py-3 text-[#3b3b3b]">
                  <span className="text-lg font-semibold">{t("golinkResultEarnCashback")}</span>
                  <span className="text-lg font-semibold">
                    {t("golinkResultDemoCashbackAmount")}
                  </span>
                  <span className="text-lg font-semibold">
                    {t("golinkResultDemoPriceCurrency")}
                  </span>
                  <span className="text-lg font-semibold">
                    {t("golinkResultDemoCashbackPercent")}
                  </span>
                </div>
                <a
                  href={GOGOCASH_GITBOOK_LEARN_SHOPPING_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 bg-[#d8f8ef] px-3 py-3 text-sm text-[#00aa80] transition hover:bg-[#c8f0e5]"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <InfoOutlined sx={{ fontSize: 16 }} aria-hidden />
                    <span className="font-normal">{t("golinkResultTnCLink")}</span>
                  </span>
                  <ChevronRightIcon sx={{ fontSize: 18 }} aria-hidden />
                </a>
              </div>
              <p className="mt-2 text-xs leading-snug text-[#7f7f7f]">
                {t("golinkResultDisclaimer")}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center gap-4">
            {showPastedBar ? (
              <div
                className="flex w-full max-w-[347px] items-center justify-between gap-3 rounded-lg px-4 py-3"
                style={{ backgroundColor: "#052f5f" }}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CheckCircleIcon sx={{ fontSize: 18, color: "#00CC99", flexShrink: 0 }} />
                  <span className="text-sm font-normal text-white">
                    {t("golinkResultLinkPastedSuccess")}
                  </span>
                </div>
                <IconButton
                  type="button"
                  size="small"
                  onClick={() => setShowPastedBar(false)}
                  aria-label={t("golinkResultDismissSuccessAria")}
                  sx={{ color: "rgba(255,255,255,0.85)", p: 0.25 }}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </div>
            ) : null}

            <button
              type="button"
              onClick={shopNow}
              className="inline-flex h-10 w-full max-w-[240px] items-center justify-center rounded-full bg-[#00CC99] px-6 text-base font-medium text-white transition hover:brightness-[0.97]"
            >
              {t("golinkResultShopNow")}
            </button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
