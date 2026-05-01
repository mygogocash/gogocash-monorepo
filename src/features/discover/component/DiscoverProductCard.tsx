/* eslint-disable @next/next/no-img-element */
"use client";

import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import { useRouter } from "@/i18n/navigation";
import { FALLBACK_BANNER } from "@/lib/offer/offerCardVisuals";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

/**
 * GoGoCash 1.1 — Product Discovery card.
 * Two-line title with stable min-height for consistent card heights, no-wrap price
 * with tabular numerals, Shop Now CTA with arrow affordance.
 *
 * The card is rendered inside an `<a class="absolute inset-0">` overlay (see
 * DiscoverContentArea). To avoid an illegal nested-anchor structure, the inner
 * Shop Now CTA is a `<button>` that navigates programmatically.
 */

const interactive = "gc-discover-interactive pointer-events-auto relative z-10 cursor-pointer";

export type DiscoverShopNowTarget =
  | { kind: "external"; href: string }
  | { kind: "internal"; href: string };

export interface DiscoverProductCardProps {
  banner: string;
  offer_name: string;
  /** Formatted listing price, e.g. `100 THB`. */
  priceLabel: string;
  shopNow: DiscoverShopNowTarget;
  /** Fires when user follows Shop Now (analytics). */
  onShopNowNavigate?: () => void;
  /** Opens the shared terms dialog hoisted in the feed. */
  onOpenTerms: () => void;
  isDesktop?: boolean;
}

export function DiscoverProductCard({
  banner,
  offer_name,
  priceLabel,
  shopNow,
  onShopNowNavigate,
  onOpenTerms,
  isDesktop = false,
}: DiscoverProductCardProps) {
  const t = useTranslations();
  const router = useRouter();
  const showPrice = Boolean(priceLabel.trim());

  const handleShopNow = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onShopNowNavigate?.();
    if (shopNow.kind === "external") {
      window.open(shopNow.href, "_blank", "noopener,noreferrer");
    } else {
      router.push(shopNow.href);
    }
  };

  return (
    <div
      className={cn(
        "pointer-events-none flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-(--gc-border) bg-white p-2.5 shadow-sm",
        "[&_*]:pointer-events-none [&_.gc-discover-interactive]:pointer-events-auto"
      )}
    >
      <div className="relative w-full shrink-0">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-(--gc-text-soft)">
          <img
            src={banner}
            alt={offer_name}
            width={400}
            height={400}
            className={cn(
              "size-full transition-transform duration-300",
              banner === FALLBACK_BANNER ? "object-fill" : "object-cover"
            )}
          />
        </div>
        {/* TODO: wire up favorite toggle (currently a visual placeholder) */}
        <button
          type="button"
          className={cn(
            interactive,
            "absolute right-2 top-2 flex size-8 items-center justify-center rounded-full border border-(--gc-border) bg-white/95 text-(--gc-primary-strong) shadow-[0_2px_6px_rgba(0,0,0,0.08)] backdrop-blur-sm transition-transform hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gc-primary-strong)"
          )}
          aria-label={t("favoritePageAddFavorite")}
          aria-pressed={false}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <FavoriteBorder
            sx={{ fontSize: 16, color: "var(--gc-primary-strong)" }}
            aria-hidden
          />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        <h2
          className={cn(
            "line-clamp-2 min-h-[2.5em] font-semibold leading-snug tracking-tight text-(--gc-text)",
            isDesktop ? "text-[15px]" : "text-sm"
          )}
        >
          {offer_name}
        </h2>

        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-(--gc-text-soft)">
            {t("discoverCardPriceHint")}
          </span>
          <span
            className={cn(
              "shrink-0 whitespace-nowrap text-right font-bold leading-none tabular-nums",
              isDesktop ? "text-2xl" : "text-xl",
              showPrice ? "text-(--gc-primary-strong)" : "text-(--gc-text-soft)"
            )}
          >
            {showPrice ? priceLabel : "—"}
          </span>
        </div>

        <div className="mt-auto flex flex-col gap-1.5">
          <button
            type="button"
            className={cn(
              interactive,
              "group/cta flex w-full items-center justify-center gap-1.5 rounded-full border-0 py-2.5 text-center text-sm font-semibold !text-white",
              "bg-(--gc-primary-strong) shadow-[0_2px_6px_rgba(0,170,128,0.25)] transition-all duration-150 hover:opacity-90 active:scale-[0.98]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--gc-primary-strong)"
            )}
            onClick={handleShopNow}
          >
            <span>{t("Shop Now")}</span>
            <ArrowForwardRoundedIcon
              sx={{ fontSize: 16 }}
              className="transition-transform duration-200 group-hover/cta:translate-x-0.5"
              aria-hidden
            />
          </button>
          <button
            type="button"
            className={cn(
              interactive,
              "w-full border-0 bg-transparent p-0 text-center text-[11px] font-medium leading-normal text-(--gc-text-soft) underline decoration-(--gc-text-soft)/30 underline-offset-2 transition-colors hover:text-(--gc-primary-strong) hover:decoration-(--gc-primary-strong)/40"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenTerms();
            }}
          >
            {t("discoverTermsLearnMore")}
          </button>
        </div>
      </div>
    </div>
  );
}
