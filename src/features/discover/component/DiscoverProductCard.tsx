/* eslint-disable @next/next/no-img-element */
"use client";

import { CategoryChip } from "@/components/common/card/CategoryChip";
import { DiscoverProductTermsDialog } from "@/features/discover/component/DiscoverProductTermsDialog";
import { Link } from "@/i18n/navigation";
import { getOfferCategoryRowVisual, FALLBACK_BANNER } from "@/lib/offer/offerCardVisuals";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";

const interactive = "gc-discover-interactive pointer-events-auto relative z-10 cursor-pointer";

export type DiscoverShopNowTarget =
  | { kind: "external"; href: string }
  | { kind: "internal"; href: string };

/** Product Discovery tile aligned with GoGoCash CI (globals.css + Figma shop cards). */
export interface DiscoverProductCardProps {
  banner: string;
  offer_name: string;
  /** Formatted listing price, e.g. `100 THB`. */
  priceLabel: string;
  shopNow: DiscoverShopNowTarget;
  /** Fires when user follows Shop Now (analytics). */
  onShopNowNavigate?: () => void;
  categories?: string;
  isDesktop?: boolean;
}

export function DiscoverProductCard({
  banner,
  offer_name,
  priceLabel,
  shopNow,
  onShopNowNavigate,
  categories = "",
  isDesktop = false,
}: DiscoverProductCardProps) {
  const t = useTranslations();
  const [termsOpen, setTermsOpen] = useState(false);
  const { label: categoryLabel, iconIndex } = getOfferCategoryRowVisual(categories);
  const showPrice = Boolean(priceLabel.trim());

  return (
    <>
      <div
        className={cn(
          "flex h-full min-h-0 w-full flex-col gap-2.5 overflow-hidden rounded-2xl border border-(--gc-border) bg-(--gc-surface) p-3 shadow-[var(--gc-shadow)]",
          "[&_*]:pointer-events-none [&_.gc-discover-interactive]:pointer-events-auto"
        )}
      >
        <div className="relative w-full shrink-0">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-(--gc-text-soft) ring-1 ring-(--gc-border) ring-inset">
            <img
              src={banner}
              alt={offer_name}
              width={400}
              height={400}
              className={cn("size-full", banner === FALLBACK_BANNER ? "object-fill" : "object-cover")}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <CategoryChip
            label={categoryLabel}
            iconIndex={iconIndex}
            size="sm"
            className="max-w-full shrink-0"
          />

          <p
            className={cn(
              "line-clamp-2 min-h-[2.75em] font-semibold leading-snug tracking-tight text-(--gc-text)",
              isDesktop ? "text-[15px]" : "text-[13px] sm:text-[14px]"
            )}
          >
            {offer_name}
          </p>

          <div className="mt-auto flex flex-col gap-2 border-t border-(--gc-border) pt-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={cn(
                  "shrink-0 font-medium text-(--gc-text-soft)",
                  isDesktop ? "text-[11px]" : "text-[10px]"
                )}
              >
                {t("discoverCardPriceHint")}
              </span>
              <p
                className={cn(
                  "min-w-0 truncate text-right text-base font-bold tabular-nums leading-none md:text-lg",
                  showPrice ? "text-(--gc-primary-strong)" : "text-(--gc-text-soft)"
                )}
              >
                {showPrice ? priceLabel : "—"}
              </p>
            </div>
            {shopNow.kind === "external" ? (
              <a
                href={shopNow.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  interactive,
                  "flex w-full items-center justify-center rounded-full border-0 py-2.5 text-center text-sm font-semibold !text-white no-underline",
                  "bg-(--gc-primary-strong) shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onShopNowNavigate?.();
                }}
              >
                {t("Shop Now")}
              </a>
            ) : (
              <Link
                href={shopNow.href}
                className={cn(
                  interactive,
                  "flex w-full items-center justify-center rounded-full py-2.5 text-center text-sm font-semibold !text-white no-underline",
                  "bg-(--gc-primary-strong) shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onShopNowNavigate?.();
                }}
              >
                {t("Shop Now")}
              </Link>
            )}
            <button
              type="button"
              className={cn(
                interactive,
                "w-full border-0 bg-transparent p-0 text-center font-medium text-(--gc-primary-strong) underline decoration-(--gc-primary-strong)/40 underline-offset-2",
                isDesktop ? "text-[12px]" : "text-[11px]"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setTermsOpen(true);
              }}
            >
              {t("discoverTermsLearnMore")}
            </button>
          </div>
        </div>
      </div>

      <DiscoverProductTermsDialog open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  );
}
