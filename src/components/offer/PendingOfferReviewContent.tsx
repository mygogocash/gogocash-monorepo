"use client";

import React from "react";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import Button from "@/components/ui/button/Button";
import {
  affiliateNetworkName,
  resolveAffiliateNetworkIdForOffer,
} from "@/data/affiliateNetworks";
import type { PendingOfferRow } from "@/data/mockPendingOffers";
import type { Offer } from "@/types/api";
import { pathImage } from "@/utils/helper";
import { hasNonEmptyString, OFFER_REVIEW_MEDIA_SIZES } from "./offerMedia";
import { FormSectionJumpNav } from "@/components/form/FormSectionJumpNav";
import { OfferFullscreenCardShell } from "./OfferFullscreenCardShell";

const PENDING_OFFER_JUMP_LINKS = [
  { id: "pending-offer-section-basic", label: "Basic info" },
  { id: "pending-offer-section-media", label: "Media" },
  { id: "pending-offer-section-partner", label: "Partner terms" },
  { id: "pending-offer-section-admin", label: "Admin & coverage" },
] as const;

const PENDING_OFFER_SCROLL_CLASS = "scroll-mt-[4.5rem]";

export function displayAffiliatePartner(offer: Offer): string {
  const raw = offer.affiliate_partner?.trim();
  if (raw) return raw;
  return affiliateNetworkName(resolveAffiliateNetworkIdForOffer(offer));
}

export function formatSubmitted(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatPartnerMaxCap(offer: Offer | null): string {
  const raw = offer?.partner_max_cap;
  if (raw === undefined || raw === null || raw === "") return "—";
  if (typeof raw === "string") return raw.trim() || "—";
  const cur = offer?.currency?.trim();
  const formatted = Number.isFinite(raw) ? raw.toLocaleString() : String(raw);
  return cur ? `${formatted} ${cur}` : formatted;
}

function parsePercentFromPartnerRateString(s: unknown): number | null {
  if (typeof s !== "string") return null;
  const m = s.trim().match(/([\d.]+)\s*%/);
  if (m) return parseFloat(m[1]);
  return null;
}

function formatPartnerRatesMinMax(offer: Offer | null): string {
  const list = offer?.commissions ?? [];
  const percents: number[] = [];
  for (const c of list) {
    const p = parsePercentFromPartnerRateString(c);
    if (p != null && !Number.isNaN(p)) percents.push(p);
  }
  if (percents.length === 0) return "—";
  const min = Math.min(...percents);
  const max = Math.max(...percents);
  if (min === max) return `${min}%`;
  return `Min ${min}% · Max ${max}%`;
}

function FieldLabel({ label, description }: { label: string; description: string }) {
  return (
    <div className="mb-1.5">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

function ReadOnlyValue({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-100">
      {children}
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-gray-100 py-3 last:border-0 dark:border-gray-800 sm:grid-cols-[minmax(0,200px)_1fr] sm:gap-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="min-w-0 text-sm text-gray-900 dark:text-gray-100">{children}</div>
    </div>
  );
}

export function PendingOfferDetailBody({ offer }: { offer: PendingOfferRow }) {
  const logoDesktopSrc = pathImage(offer.logo_desktop);
  const logoMobileSrc = pathImage(offer.logo_mobile);
  const bannerSrc = pathImage(offer.banner, "banner");
  const logoCircleSrc = pathImage(offer.logo_circle);

  return (
    <>
      <section id="pending-offer-section-basic" className={`space-y-4 ${PENDING_OFFER_SCROLL_CLASS}`}>
        <div className="flex flex-wrap items-center gap-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Basic info
          </h4>
          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            Pending review
          </span>
        </div>
        <div>
          <FieldLabel
            label="Name of offer"
            description="Internal / system name for this submission."
          />
          <ReadOnlyValue>{offer.offer_name || "—"}</ReadOnlyValue>
        </div>
        <div>
          <FieldLabel
            label="Display name"
            description="Display name shown to users in the app."
          />
          <ReadOnlyValue>{offer.offer_name_display?.trim() || "—"}</ReadOnlyValue>
        </div>
        <div>
          <FieldLabel label="Submitted" description="When the merchant sent this for review." />
          <ReadOnlyValue>{formatSubmitted(offer.submitted_at)}</ReadOnlyValue>
        </div>
      </section>

      <section id="pending-offer-section-media" className={`space-y-3 ${PENDING_OFFER_SCROLL_CLASS}`}>
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Media
        </h4>
        <div className="flex flex-wrap gap-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Main logo</span>
            <div className="h-20 w-20 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700">
              {offer.logo ? (
                <RemoteOrBlobImage
                  className="h-full w-full object-contain p-1"
                  src={offer.logo}
                  alt={offer.offer_name_display?.trim() || offer.offer_name || "Offer logo"}
                  width={80}
                  height={80}
                  sizes={OFFER_REVIEW_MEDIA_SIZES}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">—</div>
              )}
            </div>
          </div>
          {[
            { label: "Desktop", src: logoDesktopSrc },
            { label: "Mobile", src: logoMobileSrc },
            { label: "Banner", src: bannerSrc },
            { label: "Circle", src: logoCircleSrc },
          ].map(({ label, src }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
              <div className="h-20 w-20 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700">
                {hasNonEmptyString(src) ? (
                  <RemoteOrBlobImage
                    className="h-full w-full object-cover"
                    src={src}
                    alt={`${label} logo`}
                    width={80}
                    height={80}
                    sizes={OFFER_REVIEW_MEDIA_SIZES}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">—</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="pending-offer-section-partner"
        className={`rounded-xl border border-dashed border-brand-200/80 bg-brand-50/50 p-4 dark:border-brand-800/60 dark:bg-brand-950/25 ${PENDING_OFFER_SCROLL_CLASS}`}
      >
        <h4 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
          Commission info from partner
        </h4>
        <p className="mt-1 text-xs text-brand-800/80 dark:text-brand-200/80">
          Structured terms as supplied by the partner or affiliate network. Partner commission details below are read-only (from the network).
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Affiliate partner
            </dt>
            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
              {displayAffiliatePartner(offer)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tracking model
            </dt>
            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
              {offer.commission_tracking?.trim() ? offer.commission_tracking : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Min / Max
            </dt>
            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
              {formatPartnerRatesMinMax(offer)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Max cap (partner)
            </dt>
            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
              {formatPartnerMaxCap(offer)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Currency (partner)
            </dt>
            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
              {offer.currency?.trim() ? offer.currency : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Payment terms
            </dt>
            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
              {typeof offer.payment_terms === "number" ? `${offer.payment_terms} days` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Validation terms
            </dt>
            <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
              {typeof offer.validation_terms === "number" ? `${offer.validation_terms} days` : "—"}
            </dd>
          </div>
        </dl>
        {Array.isArray(offer.special_commissions) && offer.special_commissions.length > 0 ? (
          <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium text-gray-700 dark:text-gray-300">Special commissions: </span>
            {offer.special_commissions.length} tier(s) — see partner portal for full rules.
          </p>
        ) : null}
      </section>

      <section id="pending-offer-section-admin" className={`space-y-3 ${PENDING_OFFER_SCROLL_CLASS}`}>
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Admin &amp; coverage (submission)
        </h4>
        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white p-4 dark:divide-gray-800 dark:border-gray-700 dark:bg-gray-900/40 sm:px-5">
          <DetailRow label="Countries">
            {offer.countries
              ? offer.countries
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean)
                  .join(", ")
              : "—"}
          </DetailRow>
          <DetailRow label="Category">{offer.categories || "—"}</DetailRow>
          <DetailRow label="Currency (offer)">{offer.currency || "—"}</DetailRow>
          <DetailRow label="Description">
            <span className="whitespace-pre-wrap">{offer.description || "—"}</span>
          </DetailRow>
          <DetailRow label="Active policy">{offer.active_policy ?? offer.categories ?? "—"}</DetailRow>
          <DetailRow label="Max cap (admin)">
            {offer.max_cap != null ? offer.max_cap.toLocaleString() : "—"}
          </DetailRow>
          <DetailRow label="Max commission (store)">
            {offer.commission_store != null ? `${offer.commission_store}%` : "—"}
          </DetailRow>
          <DetailRow label="Commissions (partner lines)">
            {(offer.commissions ?? []).length ? offer.commissions.join(" · ") : "—"}
          </DetailRow>
          <DetailRow label="Tracking link">
            {offer.tracking_link ? (
              <a
                href={offer.tracking_link}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
              >
                {offer.tracking_link}
              </a>
            ) : (
              "—"
            )}
          </DetailRow>
          <DetailRow label="Preview URL">
            {offer.preview_url ? (
              <a
                href={offer.preview_url}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-brand-600 underline hover:text-brand-700 dark:text-brand-400"
              >
                {offer.preview_url}
              </a>
            ) : (
              "—"
            )}
          </DetailRow>
          <DetailRow label="Directory / store page">{offer.directory_page || "—"}</DetailRow>
          <DetailRow label="Tracking link store id">{offer.deeplink_store_id ?? "—"}</DetailRow>
          <DetailRow label="Offer ID (system)">{String(offer.offer_id)}</DetailRow>
          <DetailRow label="Internal ID">{offer._id}</DetailRow>
          <DetailRow label="Lookup value">{offer.lookup_value || "—"}</DetailRow>
          <DetailRow label="Merchant ID">{String(offer.merchant_id)}</DetailRow>
          <DetailRow label="Disabled">{offer.disabled ? "Yes" : "No"}</DetailRow>
          <DetailRow label="Requires approval (flag)">{String(offer.is_require_approval)}</DetailRow>
        </div>
      </section>
    </>
  );
}

export function PendingOfferReviewPage({
  offer,
  onClose,
  onApprove,
  onReject,
}: {
  offer: PendingOfferRow;
  onClose: () => void;
  onApprove: (o: PendingOfferRow) => void;
  onReject: (o: PendingOfferRow) => void;
}) {
  return (
    <OfferFullscreenCardShell
      afterHeader={
        <FormSectionJumpNav
          links={[...PENDING_OFFER_JUMP_LINKS]}
          ariaLabel="Jump to review sections"
        />
      }
      header={
        <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Review new offer
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Check basic info, policy source, promo period, and media. Partner commission details below are read-only (from the network). Approve to publish or reject to send back.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button size="sm" variant="outline" type="button" onClick={onClose}>
              Close
            </Button>
            <button
              type="button"
              onClick={() => onReject(offer)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-400 dark:ring-red-900/50 dark:hover:bg-red-950/40"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={() => onApprove(offer)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
            >
              Approve
            </button>
          </div>
        </div>
      }
    >
      <PendingOfferDetailBody offer={offer} />
    </OfferFullscreenCardShell>
  );
}
