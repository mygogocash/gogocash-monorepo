"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import type { FetchBestResponse } from "@/components/commission/CommissionManagementClient";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import NoData from "@/components/common/NoData";
import CopyButton from "@/components/ui/CopyButton";
import Input from "../form/input/InputField";
import TimeFieldHM from "../form/input/TimeFieldHM";
import TextArea from "../form/input/TextArea";
import client, { fetcher } from "@/lib/axios/client";
import { devError } from "@/lib/devConsole";
import { formatDate } from "@/lib/dateFormat";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import SecondaryButton from "../ui/button/SecondaryButton";
import PrimaryButton from "../ui/button/PrimaryButton";
import { SUPPORT_BUTTON_CLASS } from "../ui/button/SupportButton";
import ProductTypeTable from "./ProductTypeTable";
import {
  OFFER_MOCK_TERMS,
  resolveConfiguredOfferPolicyTerms,
  resolveOfferPolicyBaseTerms,
} from "@/lib/offerPolicyTerms";
import {
  CUSTOM_POLICY_CATEGORY_ID,
  inferOfferPolicyMode,
  type OfferPolicyMode,
} from "@/lib/offerPolicyMode";
import { OfferPolicyModeSwitch } from "./OfferPolicyModeSwitch";
import Switch from "../form/switch/Switch";
import {
  Offer,
  OfferRequestForm,
  type OfferDisplayTags,
  type OfferProductTypeEntry,
} from "@/types/api";
import { pathImage } from "@/utils/helper";
import { resolveAdminOfferLogoPath } from "@/lib/offerDisplay";
import { getOfferAvailabilityDisplay } from "@/lib/offerAvailabilityDisplay";
import { reorder } from "@/lib/reorder";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ResCategoryList } from "@/types/category";
import { DEEPLINK_STORE_OPTIONS } from "@/data/deeplinkStores";
import {
  AFFILIATE_NETWORKS,
  affiliateNetworkIdForOfferId,
} from "@/data/affiliateNetworks";
import {
  bestPartnerRawFromCommissions,
  commissionFieldsFromPartnerRaw,
} from "@/lib/autoCommissionFromPartner";
import {
  buildSuggestedAppDeeplink,
  formatPartnerRatesMinMax,
} from "@/lib/offerDeeplink";
import { defaultLookupFromBrandAndCountry } from "@/lib/createBrandLookupSlug";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import {
  applyPlatformFee,
  reconcileCommissionOnFeeChange,
  reversePlatformFee,
} from "@/lib/commissionFee";
import { netCommissionFromRaw } from "@/lib/productTypeCommission";
import { useSystemFeePercent } from "@/hooks/useSystemFeePercent";
import {
  EMPTY_PRODUCT_TYPE_DRAFT,
  highestCashbackPercent,
  productTypeDraftToEntry,
  productTypeEntryToDraft,
  serializeOfferProductTypes,
} from "@/lib/productTypeDraft";
import { appendCashbackPatchFields } from "@/lib/offerCashbackSave";
import {
  formatTrackingDays,
  isValidTrackingDayCount,
  MAX_TRACKING_PERIOD_DAYS,
  MIN_TRACKING_PERIOD_DAYS,
  resolveTrackingPeriodPreview,
} from "@/lib/offerTrackingPeriod";
import { STATUS_BADGE_BASE } from "@/lib/statusBadge";
import {
  brandSectionSaveBlockedMessage,
  isBrandSectionDirty,
} from "@/lib/brandSectionEdit";
import { isDirty } from "@/lib/isDirty";
import { COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY } from "@/lib/query/offersQueries";
import { OfferFullscreenCardShell } from "./OfferFullscreenCardShell";
import { FormSectionJumpNav } from "@/components/form/FormSectionJumpNav";

function formatPartnerMaxCap(offer: Offer | null): string {
  const raw = offer?.partner_max_cap;
  if (raw === undefined || raw === null || raw === "") return "—";
  if (typeof raw === "string") return raw.trim() || "—";
  const cur = offer?.currency?.trim();
  const formatted = Number.isFinite(raw) ? raw.toLocaleString() : String(raw);
  return cur ? `${formatted} ${cur}` : formatted;
}

/** Whether an offer form already carries any upsize-event data (drives the
 *  "Launch Upsize Event" default — launched when there's something to show). */
function offerFormHasUpsize(f: OfferRequestForm): boolean {
  return Boolean(
    f.upsize_start_date ||
    f.upsize_end_date ||
    f.upsize_start_time ||
    f.upsize_end_time ||
    f.upsize_special_commission != null ||
    f.upsize_max_cap != null ||
    (f.upsize_product_types ?? []).length > 0,
  );
}

function FieldLabel({
  label,
  description,
}: {
  label: React.ReactNode;
  description: string;
}) {
  return (
    <div className="mb-1.5">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
      </p>
      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

const OFFER_FORM_SECTION_SCROLL_CLASS = "scroll-mt-24";

/**
 * Commission entry-mode toggle (Manual / Auto) — compact "Support button" look
 * (h-7, text-xs). Inactive wears SUPPORT_BUTTON_CLASS; the selected mode is
 * brand-filled so the active choice stays obvious.
 */
const COMMISSION_MODE_TOGGLE_ACTIVE =
  "inline-flex h-7 items-center justify-center rounded-lg border border-brand-500 bg-brand-500 px-3 text-xs font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300";
const COMMISSION_MODE_TOGGLE_INACTIVE = `${SUPPORT_BUTTON_CLASS} transition disabled:cursor-not-allowed disabled:opacity-50`;

/** Plain-text rendering of a saved field value (Cashback view mode). */
const CASHBACK_READONLY_VALUE =
  "flex min-h-11 items-center text-sm font-medium text-gray-800 dark:text-gray-200";

/** Plain-text rendering of the upsize promo window (view mode). */
function formatUpsizePeriod(
  startDate: string | null | undefined,
  startTime: string | null | undefined,
  endDate: string | null | undefined,
  endTime: string | null | undefined,
): string {
  const start = startDate
    ? `${formatDate(startDate)}${startTime ? ` ${startTime}` : ""}`
    : "";
  const end = endDate
    ? `${formatDate(endDate)}${endTime ? ` ${endTime}` : ""}`
    : "";
  if (!start && !end) return "—";
  return `${start || "—"} to ${end || "—"}`;
}

/** Blank upsize per-product-line draft. */
const EMPTY_UPSIZE_DRAFT: OfferProductTypeEntry = {
  name: "",
  commission_info: "",
  deeplink: "",
};

/** Blue (brand-filled) Support button — for the product-type "Add" action. */
const SUPPORT_BUTTON_BLUE_CLASS = COMMISSION_MODE_TOGGLE_ACTIVE;
/** Default (outline) Support button with disabled states — for "Cancel". */
const SUPPORT_BUTTON_DEFAULT_CLASS = `${SUPPORT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`;

type IdLabelOption = { id: string; label: string };

function OfferFormSectionNav({ showReference }: { showReference: boolean }) {
  const links = useMemo(
    () =>
      [
        ...(showReference
          ? [{ id: "offer-section-reference", label: "Reference" }]
          : []),
        { id: "offer-section-brand", label: "Brand & Cashback" },
        { id: "offer-section-merch", label: "Promotion" },
        { id: "offer-section-upsize", label: "Upsize event" },
        { id: "offer-section-media", label: "Logo & Medias" },
        { id: "offer-section-policy", label: "Terms & Conditions" },
        { id: "offer-section-tracking", label: "Partner & Tracking link" },
        { id: "offer-section-tracking-period", label: "Cashback tracking period" },
      ] as const,
    [showReference],
  );
  return (
    <FormSectionJumpNav links={[...links]} ariaLabel="Jump to form section" />
  );
}

/** Preview pills for the “Offer tags” block (kept pure for clarity and reuse). */
function buildOfferTagPreviewChips(
  tags: OfferDisplayTags,
  offer: Offer | null,
): string[] {
  const chips: string[] = [];
  if (tags.brand_category_enabled) {
    chips.push(
      tags.brand_category_label.trim() ||
        (offer?.categories?.trim() ? offer.categories : "Brand category"),
    );
  }
  if (tags.extra_cashback_tag) chips.push("Extra cashback");
  if (tags.grab_coupon_tag) chips.push("Grab Coupon");
  if (tags.expire_in_days_enabled && tags.expire_in_days != null) {
    chips.push(`Expire in ${tags.expire_in_days} days`);
  }
  return chips;
}

function FormOfferBrandReferenceStrip({
  offer,
  form,
}: {
  offer: Offer;
  form: OfferRequestForm;
}) {
  const persistedLogo = resolveAdminOfferLogoPath(offer);
  const logoDesktopObjectUrl = useObjectUrl(form.logo_desktop);
  const logoMobileObjectUrl = useObjectUrl(form.logo_mobile);
  const logoSrc =
    logoDesktopObjectUrl ??
    logoMobileObjectUrl ??
    pathImage(persistedLogo || null);
  const availability = getOfferAvailabilityDisplay(offer);
  const availabilityValue = availability.clarification
    ? `${availability.availabilityLabel} — ${availability.clarification}`
    : availability.availabilityLabel;

  const meta = [
    { label: "Offer ID", value: offer._id },
    { label: "Lookup slug", value: offer.lookup_value?.trim() || "—" },
    { label: "Category", value: offer.categories?.trim() || "—" },
    { label: "Partner offer name", value: offer.offer_name?.trim() || "—" },
    { label: "Availability", value: availabilityValue },
    {
      label: "Configured country / variant",
      value: availability.configuredCountry,
    },
    {
      label: "Default / fallback country",
      value: availability.fallbackCountry,
    },
  ] as const;

  return (
    <section
      id="offer-section-reference"
      className={`border-brand-200/80 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/5 rounded-xl border p-4 sm:p-5 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            Brand reference
          </h4>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Partner feed snapshot: logo and IDs so you know which merchant row
            you are editing. Nothing here is saved from this form.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex shrink-0 flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Logo
          </span>
          <div className="shadow-theme-xs flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white sm:h-[5.5rem] sm:w-[5.5rem] dark:border-gray-600 dark:bg-gray-900">
            {logoSrc.trim() ? (
              <RemoteOrBlobImage
                src={logoSrc}
                alt="Brand logo"
                width={128}
                height={128}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="px-1 text-center text-[10px] leading-tight text-gray-400 dark:text-gray-500">
                No image
              </span>
            )}
          </div>
        </div>
        <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-8 gap-y-4 text-xs sm:grid-cols-2">
          {meta.map(({ label, value }) => {
            const copyable =
              value !== "—" &&
              (label === "Offer ID" ||
                label === "Lookup slug" ||
                label === "Partner offer name" ||
                label === "Category");
            return (
              <div
                key={label}
                className="min-w-0 rounded-lg border border-gray-200/80 bg-white/60 px-3 py-2.5 dark:border-gray-600/60 dark:bg-gray-900/40"
              >
                <dt className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  {label}
                </dt>
                <dd className="mt-1 flex items-start justify-between gap-2 font-mono text-[13px] font-medium break-all text-gray-900 dark:text-gray-100">
                  <span className="min-w-0">{value}</span>
                  {copyable ? (
                    <span className="shrink-0 pt-0.5">
                      <CopyButton value={String(value)} />
                    </span>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}

interface FormOfferProps {
  fetchOffers: () => void;
  openModal: boolean | Offer;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean | Offer>>;
  form: OfferRequestForm;
  setForm: React.Dispatch<React.SetStateAction<OfferRequestForm>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}
const FormOffer = ({
  fetchOffers,
  openModal,
  setOpenModal,
  form,
  setForm,
  isLoading,
}: FormOfferProps) => {
  const queryClient = useQueryClient();
  // Platform fee % from Fee Structure (falls back to 30 while loading / on error).
  const { feePercent, isFallback: feeIsFallback } = useSystemFeePercent();
  const logoDesktopUrl = useObjectUrl(form.logo_desktop);
  const bannerUrl = useObjectUrl(form.banner);
  const offer = openModal && typeof openModal === "object" ? openModal : null;
  const persistedBannerPath =
    offer?.banner ?? offer?.banner_mobile ?? offer?.logo_circle ?? "";
  const offerCountry = offer?.countries ?? "";
  // Lookup slug: when synced, the slug is derived from the offer name + country
  // (brandname_countrycode) and the input is read-only; off by default so an
  // existing offer's saved slug is preserved and freely editable.
  const [syncLookupFromBrandCountry, setSyncLookupFromBrandCountry] =
    useState(false);
  useEffect(() => {
    if (!syncLookupFromBrandCountry) return;
    setForm((prev) => ({
      ...prev,
      lookup_value: defaultLookupFromBrandAndCountry(
        prev.offer_name_display,
        offerCountry,
      ),
    }));
  }, [
    syncLookupFromBrandCountry,
    form.offer_name_display,
    offerCountry,
    setForm,
  ]);
  const networkId = offer
    ? form.affiliate_network_id.trim() ||
      affiliateNetworkIdForOfferId(offer._id)
    : "";

  const { data: brandsRes } = useQuery({
    queryKey: [...COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY, networkId],
    queryFn: async () => {
      const { data } = await client.get<{
        data: { id: string; appDeeplink: string }[];
      }>("/admin/commission-management/brands", { params: { networkId } });
      return data;
    },
    enabled: Boolean(offer && networkId),
    staleTime: 30_000,
  });

  const brandRowForOffer = useMemo(() => {
    if (!offer) return null;
    return brandsRes?.data?.find((b) => b.id === offer._id) ?? null;
  }, [brandsRes?.data, offer]);

  const partnerPreviewDeeplink = useMemo(() => {
    if (!offer) return "";
    const nw =
      form.affiliate_network_id.trim() ||
      affiliateNetworkIdForOfferId(offer._id);
    return buildSuggestedAppDeeplink(
      offer,
      nw,
      form.commission_store,
      form.deeplink_store_id,
    );
  }, [
    offer,
    form.affiliate_network_id,
    form.commission_store,
    form.deeplink_store_id,
  ]);

  /** Per-line tracking URLs only when there are product-type rows and “all product types” is off. */
  const usePerProductTrackingLinks =
    (form.product_types ?? []).some((r) => !r.is_tagline) &&
    !form.all_product_types;

  const affiliateSelectOptions = useMemo<IdLabelOption[]>(
    () => AFFILIATE_NETWORKS.map((n) => ({ id: n.id, label: n.name })),
    [],
  );
  const advertiserSelectOptions = useMemo<IdLabelOption[]>(
    () => DEEPLINK_STORE_OPTIONS.map((s) => ({ id: s.id, label: s.label })),
    [],
  );

  /** Names from Brand Info → Product Type rows, for Upsize line picker.
   *  Excludes tagline (group-heading) rows — those aren't selectable product types. */
  const upsizeProductTypeNameOptions = useMemo(() => {
    const names = (form.product_types ?? [])
      .filter((r) => !r.is_tagline)
      .map((r) => r.name.trim())
      .filter(Boolean);
    return [...new Set(names)];
  }, [form.product_types]);

  /** When there are no product-type rows, the app tracking link is stored via commission API (same as Commission Management). */
  const serverSuggestedDeeplink = useMemo(() => {
    if (!offer) return null;
    const saved = brandRowForOffer?.appDeeplink?.trim() ?? "";
    if (!saved || saved === partnerPreviewDeeplink) return null;
    return saved;
  }, [offer, brandRowForOffer?.appDeeplink, partnerPreviewDeeplink]);

  /** Scoped to `offer._id` so switching offers does not reuse a stale typed URL (no reset effect). */
  const [deeplinkOverride, setDeeplinkOverride] = useState<{
    offerId: string;
    value: string;
  } | null>(null);

  const offerDeeplinkDraft = useMemo(() => {
    if (deeplinkOverride && offer && deeplinkOverride.offerId === offer._id) {
      return deeplinkOverride.value;
    }
    return serverSuggestedDeeplink ?? partnerPreviewDeeplink;
  }, [
    deeplinkOverride,
    offer,
    serverSuggestedDeeplink,
    partnerPreviewDeeplink,
  ]);

  /**
   * Baseline snapshot of the loaded `form`, captured once per offer id (the
   * parent populates `form` before opening the modal, so the first render for a
   * given id already holds the loaded values). Drives "disable Save until the
   * form has unsaved changes". Re-snapshotting only when `form.id` changes uses
   * React's supported "adjust state during render" pattern.
   */
  const [formBaseline, setFormBaseline] = useState<{
    id: string;
    snapshot: OfferRequestForm;
  }>({ id: form.id, snapshot: form });
  if (formBaseline.id !== form.id) {
    setFormBaseline({ id: form.id, snapshot: form });
  }

  /**
   * Auto fee mode: the raw partner number the admin types. The saved
   * commission (`commission_store`) is this minus the platform fee
   * (raw × (1 − fee/100), Fee Structure rate). Held as a string for clean
   * typing; re-derived from the saved net whenever a different offer loads
   * (same `form.id` cadence as the baseline above).
   */
  const [commissionRaw, setCommissionRaw] = useState(() =>
    form.commission_store != null
      ? String(reversePlatformFee(form.commission_store, feePercent))
      : "",
  );
  // Upsize "Special commission" mirrors the main commission entry: Auto applies
  // the platform fee to a raw partner %, Manual takes the net directly. Mode +
  // raw are local (the net lives in form.upsize_special_commission).
  const [upsizeCommissionMode, setUpsizeCommissionMode] = useState<
    "auto" | "manual"
  >("auto");
  const [upsizeCommissionRaw, setUpsizeCommissionRaw] = useState(() =>
    form.upsize_special_commission != null
      ? String(reversePlatformFee(form.upsize_special_commission, feePercent))
      : "",
  );
  // Upsize date inputs render as type="text" (so the "Start Date" / "End Date"
  // placeholder shows) and swap to type="date" on focus / when a value is set —
  // a native <input type=date> can't carry a custom placeholder.
  const [startDateType, setStartDateType] = useState<"text" | "date">(
    form.upsize_start_date ? "date" : "text",
  );
  const [endDateType, setEndDateType] = useState<"text" | "date">(
    form.upsize_end_date ? "date" : "text",
  );
  // "Launch Upsize Event" master toggle — when off the whole upsize config is
  // hidden; launched by default if the offer already carries upsize data.
  const [upsizeLaunched, setUpsizeLaunched] = useState(() =>
    offerFormHasUpsize(form),
  );
  const [commissionRawId, setCommissionRawId] = useState(form.id);
  if (commissionRawId !== form.id) {
    setCommissionRawId(form.id);
    setUpsizeLaunched(offerFormHasUpsize(form));
    setCommissionRaw(
      form.commission_store != null
        ? String(reversePlatformFee(form.commission_store, feePercent))
        : "",
    );
    setUpsizeCommissionRaw(
      form.upsize_special_commission != null
        ? String(reversePlatformFee(form.upsize_special_commission, feePercent))
        : "",
    );
    setUpsizeCommissionMode("auto");
    setStartDateType(form.upsize_start_date ? "date" : "text");
    setEndDateType(form.upsize_end_date ? "date" : "text");
  }
  // The Fee Structure rate resolves asynchronously. When it changes (the 30%
  // fallback giving way to the configured value), reconcile raw ↔ net: a raw
  // the admin authored this session (typed / partner-synced) is ground truth
  // and the stored net is recomputed with the real fee; a raw that was only
  // seeded from the stored net is re-derived so a passive open never rewrites
  // stored economics.
  const commissionRawEditedRef = useRef(false);
  const upsizeCommissionRawEditedRef = useRef(false);
  const [seededFeePercent, setSeededFeePercent] = useState(feePercent);
  if (seededFeePercent !== feePercent) {
    setSeededFeePercent(feePercent);
    const main = reconcileCommissionOnFeeChange({
      rawEdited: commissionRawEditedRef.current,
      raw: commissionRaw,
      storedNet: form.commission_store,
      feePercent,
    });
    const upsize = reconcileCommissionOnFeeChange({
      rawEdited: upsizeCommissionRawEditedRef.current,
      raw: upsizeCommissionRaw,
      storedNet: form.upsize_special_commission,
      feePercent,
    });
    setCommissionRaw(main.raw);
    setUpsizeCommissionRaw(upsize.raw);
    if (
      main.storedNet !== (form.commission_store ?? null) ||
      upsize.storedNet !== (form.upsize_special_commission ?? null)
    ) {
      setForm((prev) => ({
        ...prev,
        commission_store: main.storedNet,
        upsize_special_commission: upsize.storedNet,
      }));
    }
  }

  // When per-row product types are in play ("All product types" off), the single
  // offer commission isn't hand-entered — it tracks the highest per-row cashback
  // %. Keep commission_store (and the raw display) synced to that max.
  const highestRowCashback = useMemo(
    () => highestCashbackPercent(form.product_types ?? []),
    [form.product_types],
  );
  if (
    !form.all_product_types &&
    highestRowCashback != null &&
    form.commission_store !== highestRowCashback
  ) {
    setForm((prev) => ({ ...prev, commission_store: highestRowCashback }));
    setCommissionRaw(String(reversePlatformFee(highestRowCashback, feePercent)));
  }

  // The single-commission controls are read-only when per-row rates drive the
  // value ("All product types" off) — it's auto-filled from the highest line.
  const commissionLockedToRows = !form.all_product_types;

  const applyPartnerCommissionToForm = useCallback(
    (rawPercent: number): boolean => {
      const fields = commissionFieldsFromPartnerRaw(rawPercent, feePercent);
      if (!fields) return false;
      commissionRawEditedRef.current = true;
      setCommissionRaw(fields.commissionRaw);
      setForm((prev) => ({
        ...prev,
        commission_entry_mode: "auto",
        commission_store: fields.commission_store,
      }));
      return true;
    },
    [setForm, feePercent],
  );

  const fetchBestCommission = useMutation({
    mutationFn: async (payload: {
      offerId: string;
      affiliateNetworkId: string;
    }) => {
      const { data } = await client.post<FetchBestResponse>(
        "/admin/commission-management/fetch-best",
        payload,
      );
      return data;
    },
  });

  const syncAutoCommissionFromPartner = useCallback(async () => {
    if (!offer || commissionLockedToRows) return;

    const localRaw = bestPartnerRawFromCommissions(offer.commissions ?? []);
    const affiliateNetworkId =
      form.affiliate_network_id.trim() ||
      affiliateNetworkIdForOfferId(offer._id);

    if (!form.id) {
      if (localRaw > 0) applyPartnerCommissionToForm(localRaw);
      return;
    }

    try {
      const data = await fetchBestCommission.mutateAsync({
        offerId: form.id,
        affiliateNetworkId,
      });
      if (data.bestRatePercent > 0) {
        applyPartnerCommissionToForm(data.bestRatePercent);
        fetchOffers();
        toast.success(
          `Loaded partner rate ${data.bestRatePercent}% (user-facing ${applyPlatformFee(data.bestRatePercent, feePercent)}% after ${feePercent}% fee)`,
        );
        return;
      }
      if (localRaw > 0) {
        applyPartnerCommissionToForm(localRaw);
        toast.success(
          `Using partner rate on file ${localRaw}% (user-facing ${applyPlatformFee(localRaw, feePercent)}%)`,
        );
        return;
      }
      toast.error(
        "No partner rate found. Set commission in Commission Management or switch to Manual.",
      );
    } catch (err) {
      if (localRaw > 0) {
        applyPartnerCommissionToForm(localRaw);
        toast.success(
          `Using partner rate on file ${localRaw}% (live sync unavailable)`,
        );
        return;
      }
      const msg =
        isAxiosError(err) &&
        err.response?.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
          ? String((err.response.data as { message?: string }).message)
          : "Could not fetch partner rate. Try again or enter manually.";
      toast.error(msg);
    }
  }, [
    offer,
    commissionLockedToRows,
    form.id,
    form.affiliate_network_id,
    fetchBestCommission,
    applyPartnerCommissionToForm,
    fetchOffers,
    feePercent,
  ]);

  // Product-type "add" frame: a local draft, committed into form.product_types
  // on Add (the committed lines show in a summary table — a later step). Cancel
  // clears the draft.
  const [productTypeDraft, setProductTypeDraft] = useState(
    EMPTY_PRODUCT_TYPE_DRAFT,
  );
  // Draft frame mode: add a product type, or a tagline (group heading) row.
  const [insertMode, setInsertMode] = useState<"product" | "tagline">(
    "product",
  );
  // The added-product-type table (drag reorder + Action menu) lives in
  // <ProductTypeTable>, which owns its own drag/menu state.
  // Which committed row is loaded into the draft frame for editing (null = adding new).
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(
    null,
  );

  // Policy section: read-only by default with its own Edit → Cancel/Save
  // (mirrors the User page's "Edit user"). Saves ONLY policy_category_id +
  // custom_terms via a partial PATCH, independent of the form-wide save.
  const [editingPolicy, setEditingPolicy] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policySnapshot, setPolicySnapshot] = useState<{
    policy_category_id: string;
    custom_terms: string;
    note_to_user: string;
  } | null>(null);
  const [policySaveError, setPolicySaveError] = useState<string | null>(null);
  const [templatePolicyCategoryId, setTemplatePolicyCategoryId] = useState("");
  const [templateTermsDraft, setTemplateTermsDraft] = useState("");
  const [templateTermsTouched, setTemplateTermsTouched] = useState(false);
  const [customWritingDraft, setCustomWritingDraft] = useState("");
  // "Add note to users" toggle inside the policy section (note_to_user field).
  const [showNoteToUser, setShowNoteToUser] = useState(() =>
    Boolean(form.note_to_user?.trim()),
  );

  const beginEditPolicy = () => {
    const mode = inferOfferPolicyMode(form.policy_category_id);
    const savedTerms = form.custom_terms ?? "";
    const nextTemplateCategoryId =
      mode === "template" ? (form.policy_category_id ?? "") : "";
    const configuredTerms = resolveConfiguredOfferPolicyTerms(
      nextTemplateCategoryId,
      offer?.categories,
      policyCategories,
      policiesList,
    );
    setPolicySnapshot({
      policy_category_id: form.policy_category_id ?? "",
      custom_terms: savedTerms,
      note_to_user: form.note_to_user ?? "",
    });
    setTemplatePolicyCategoryId(nextTemplateCategoryId);
    setTemplateTermsTouched(false);
    setTemplateTermsDraft(
      mode === "template" ? savedTerms || configuredTerms : configuredTerms,
    );
    setCustomWritingDraft(mode === "custom" ? savedTerms : "");
    setPolicySaveError(null);
    setShowNoteToUser(Boolean(form.note_to_user?.trim()));
    if (mode === "template" && !savedTerms.trim() && configuredTerms) {
      setForm((prev) => ({
        ...prev,
        custom_terms: configuredTerms,
      }));
    }
    setEditingPolicy(true);
  };

  const changePolicyMode = (nextMode: OfferPolicyMode) => {
    const currentMode = inferOfferPolicyMode(form.policy_category_id);
    if (nextMode === currentMode) return;

    if (nextMode === "custom") {
      setTemplatePolicyCategoryId(form.policy_category_id ?? "");
      setTemplateTermsDraft(form.custom_terms ?? "");
      setForm((prev) => ({
        ...prev,
        policy_category_id: CUSTOM_POLICY_CATEGORY_ID,
        custom_terms: customWritingDraft,
      }));
      return;
    }

    setCustomWritingDraft(form.custom_terms ?? "");
    const configuredTerms = resolveConfiguredOfferPolicyTerms(
      templatePolicyCategoryId,
      offer?.categories,
      policyCategories,
      policiesList,
    );
    setForm((prev) => ({
      ...prev,
      policy_category_id: templatePolicyCategoryId,
      custom_terms: templateTermsDraft || configuredTerms,
    }));
  };

  const changeTemplatePolicyCategory = (categoryId: string) => {
    const configuredTerms = resolveConfiguredOfferPolicyTerms(
      categoryId,
      offer?.categories,
      policyCategories,
      policiesList,
    );
    setTemplatePolicyCategoryId(categoryId);
    setTemplateTermsTouched(false);
    setTemplateTermsDraft(configuredTerms);
    setForm((prev) => ({
      ...prev,
      policy_category_id: categoryId,
      custom_terms: configuredTerms,
    }));
  };

  const changeActivePolicyTerms = (terms: string) => {
    if (inferOfferPolicyMode(form.policy_category_id) === "custom") {
      setCustomWritingDraft(terms);
    } else {
      setTemplateTermsTouched(true);
      setTemplateTermsDraft(terms);
    }
    setForm((prev) => ({ ...prev, custom_terms: terms }));
  };

  const cancelEditPolicy = () => {
    if (policySnapshot) {
      setForm((prev) => ({
        ...prev,
        policy_category_id: policySnapshot.policy_category_id,
        custom_terms: policySnapshot.custom_terms,
        note_to_user: policySnapshot.note_to_user,
      }));
      setShowNoteToUser(Boolean(policySnapshot.note_to_user.trim()));
    }
    setPolicySaveError(null);
    setEditingPolicy(false);
  };

  const savePolicyEdit = async () => {
    if (!form.id) return;
    setSavingPolicy(true);
    setPolicySaveError(null);
    try {
      const fd = new FormData();
      fd.append("policy_category_id", form.policy_category_id ?? "");
      fd.append("custom_terms", form.custom_terms ?? "");
      fd.append("note_to_user", form.note_to_user ?? "");
      await client.patch(`/admin/update-offer/${form.id}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // Re-baseline the saved fields so the form-wide "Save changes" doesn't
      // re-flag this now-persisted policy as dirty.
      setFormBaseline((prev) => ({
        ...prev,
        snapshot: {
          ...prev.snapshot,
          policy_category_id: form.policy_category_id ?? "",
          custom_terms: form.custom_terms ?? "",
          note_to_user: form.note_to_user ?? "",
        },
      }));
      setEditingPolicy(false);
      fetchOffers();
      toast.success("Policy updated successfully");
    } catch (err) {
      devError("Failed to update policy:", err);
      setPolicySaveError(
        getApiErrorMessage(
          err,
          "Could not update policy. Please try again, or contact an administrator if it continues.",
        ),
      );
    } finally {
      setSavingPolicy(false);
    }
  };

  // Cashback tracking period: the "Purchase → Tracking → Confirm" steps
  // customers see. Auto follows partner validation terms; Manual is per-brand.
  const [editingTrackingPeriod, setEditingTrackingPeriod] = useState(false);
  const [savingTrackingPeriod, setSavingTrackingPeriod] = useState(false);
  const [trackingPeriodSnapshot, setTrackingPeriodSnapshot] = useState<{
    tracking_period_mode: "auto" | "manual";
    tracking_days: number | null;
    confirm_days: number | null;
    flow_type: "three_step" | "two_step";
    tracking_subtitle: string | null;
    confirm_subtitle: string | null;
  } | null>(null);
  const [trackingPeriodSaveError, setTrackingPeriodSaveError] = useState<
    string | null
  >(null);

  const beginEditTrackingPeriod = () => {
    setTrackingPeriodSnapshot({
      tracking_period_mode: form.tracking_period_mode,
      tracking_days: form.tracking_days,
      confirm_days: form.confirm_days,
      flow_type: form.flow_type,
      tracking_subtitle: form.tracking_subtitle,
      confirm_subtitle: form.confirm_subtitle,
    });
    setTrackingPeriodSaveError(null);
    setEditingTrackingPeriod(true);
  };

  const cancelEditTrackingPeriod = () => {
    if (trackingPeriodSnapshot) {
      setForm((prev) => ({ ...prev, ...trackingPeriodSnapshot }));
    }
    setTrackingPeriodSaveError(null);
    setEditingTrackingPeriod(false);
  };

  const saveTrackingPeriodEdit = async () => {
    if (!form.id) return;
    if (form.tracking_period_mode === "manual") {
      if (
        !isValidTrackingDayCount(form.tracking_days ?? undefined) ||
        !isValidTrackingDayCount(form.confirm_days ?? undefined)
      ) {
        setTrackingPeriodSaveError(
          `Enter whole day counts between ${MIN_TRACKING_PERIOD_DAYS} and ${MAX_TRACKING_PERIOD_DAYS} for both windows.`,
        );
        return;
      }
    }
    setSavingTrackingPeriod(true);
    setTrackingPeriodSaveError(null);
    try {
      const fd = new FormData();
      fd.append("tracking_period_mode", form.tracking_period_mode);
      if (form.tracking_period_mode === "manual") {
        // Day counts only travel in manual mode — auto saves leave the stored
        // manual values untouched server-side (absent key = no change).
        fd.append("tracking_days", String(form.tracking_days));
        fd.append("confirm_days", String(form.confirm_days));
      }
      // Flow + subtitles always travel: an empty subtitle is an explicit
      // clear back to the default caption (coerceOptionalText semantics).
      fd.append("flow_type", form.flow_type);
      fd.append("tracking_subtitle", form.tracking_subtitle ?? "");
      fd.append("confirm_subtitle", form.confirm_subtitle ?? "");
      await client.patch(`/admin/update-offer/${form.id}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setFormBaseline((prev) => ({
        ...prev,
        snapshot: {
          ...prev.snapshot,
          tracking_period_mode: form.tracking_period_mode,
          tracking_days: form.tracking_days,
          confirm_days: form.confirm_days,
          flow_type: form.flow_type,
          tracking_subtitle: form.tracking_subtitle,
          confirm_subtitle: form.confirm_subtitle,
        },
      }));
      setEditingTrackingPeriod(false);
      fetchOffers();
      toast.success("Tracking period updated successfully");
    } catch (err) {
      devError("Failed to update tracking period:", err);
      setTrackingPeriodSaveError(
        "Could not update tracking period. Please try again.",
      );
    } finally {
      setSavingTrackingPeriod(false);
    }
  };

  // Logos & media: read-only previews by default with its own Edit → Cancel/Save
  // (mirrors the Policy section). Save uploads only the image fields via an
  // independent partial PATCH, separate from the form-wide "Save changes".
  const [editingMedia, setEditingMedia] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [mediaSnapshot, setMediaSnapshot] = useState<Pick<
    OfferRequestForm,
    "logo_desktop" | "logo_mobile" | "logo_circle" | "banner" | "banner_mobile"
  > | null>(null);

  const beginEditMedia = () => {
    setMediaSnapshot({
      logo_desktop: form.logo_desktop,
      logo_mobile: form.logo_mobile,
      logo_circle: form.logo_circle,
      banner: form.banner,
      banner_mobile: form.banner_mobile,
    });
    setEditingMedia(true);
  };

  const cancelEditMedia = () => {
    if (mediaSnapshot) {
      setForm((prev) => ({ ...prev, ...mediaSnapshot }));
    }
    setEditingMedia(false);
  };

  const saveMediaEdit = async () => {
    if (!form.id) return;
    setSavingMedia(true);
    try {
      const fd = new FormData();
      if (form.logo_desktop) fd.append("logo_desktop", form.logo_desktop);
      if (form.banner) fd.append("banner", form.banner);
      await client.patch(`/admin/update-offer/${form.id}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // Re-baseline the image fields so the form-wide "Save changes" doesn't
      // re-flag these now-persisted uploads as dirty.
      setFormBaseline((prev) => ({
        ...prev,
        snapshot: {
          ...prev.snapshot,
          logo_desktop: form.logo_desktop,
          logo_mobile: form.logo_mobile,
          logo_circle: form.logo_circle,
          banner: form.banner,
          banner_mobile: form.banner_mobile,
        },
      }));
      setEditingMedia(false);
      fetchOffers();
      toast.success("Media updated successfully");
    } catch (err) {
      devError("Failed to update media:", err);
      toast.error("Could not update media. Please try again.");
    } finally {
      setSavingMedia(false);
    }
  };
  const saveOfferDeeplink = useMutation({
    mutationFn: async (payload: { offerId: string; deeplink: string }) => {
      const { data } = await client.patch<{ success: boolean }>(
        "/admin/commission-management/deeplink",
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY,
      });
    },
  });

  // Info from partner: read-only by default with its own Edit → Cancel/Save
  // (mirrors the Policy section). Save persists the affiliate network/store and
  // the tracking link(s) via a partial PATCH plus the deeplink mutation.
  const [editingTracking, setEditingTracking] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);
  const [trackingSnapshot, setTrackingSnapshot] = useState<{
    affiliate_network_id: string;
    deeplink_store_id: string;
    deeplink: string | null;
  } | null>(null);
  const [trackingSaveError, setTrackingSaveError] = useState<string | null>(
    null,
  );

  const beginEditTracking = () => {
    setTrackingSnapshot({
      affiliate_network_id: form.affiliate_network_id,
      deeplink_store_id: form.deeplink_store_id,
      deeplink:
        deeplinkOverride && offer && deeplinkOverride.offerId === offer._id
          ? deeplinkOverride.value
          : null,
    });
    setTrackingSaveError(null);
    setEditingTracking(true);
  };

  const cancelEditTracking = () => {
    if (trackingSnapshot) {
      setForm((prev) => ({
        ...prev,
        affiliate_network_id: trackingSnapshot.affiliate_network_id,
        deeplink_store_id: trackingSnapshot.deeplink_store_id,
      }));
      setDeeplinkOverride(
        trackingSnapshot.deeplink !== null && offer
          ? { offerId: offer._id, value: trackingSnapshot.deeplink }
          : null,
      );
    }
    setTrackingSaveError(null);
    setEditingTracking(false);
  };

  const saveTrackingEdit = async () => {
    if (!form.id) return;
    setSavingTracking(true);
    setTrackingSaveError(null);
    try {
      const fd = new FormData();
      fd.append(
        "affiliate_network_id",
        form.affiliate_network_id.trim() || "involve_asia",
      );
      fd.append("deeplink_store_id", form.deeplink_store_id.trim() || "global");
      // Per-product tracking URLs live in product_types — persist them too.
      if (usePerProductTrackingLinks) {
        fd.append(
          "product_types",
          JSON.stringify(serializeOfferProductTypes(form.product_types ?? [])),
        );
        fd.append("all_product_types", String(form.all_product_types));
      }
      await client.patch(`/admin/update-offer/${form.id}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // Single tracking link persists via the commission deeplink mutation.
      if (!usePerProductTrackingLinks) {
        const d = offerDeeplinkDraft.trim();
        if (d) {
          await saveOfferDeeplink.mutateAsync({
            offerId: form.id,
            deeplink: d,
          });
        }
      }
      // Re-baseline saved fields so the form-wide "Save changes" doesn't
      // re-flag this now-persisted partner info as dirty.
      setFormBaseline((prev) => ({
        ...prev,
        snapshot: {
          ...prev.snapshot,
          affiliate_network_id: form.affiliate_network_id,
          deeplink_store_id: form.deeplink_store_id,
          ...(usePerProductTrackingLinks
            ? { product_types: form.product_types }
            : {}),
        },
      }));
      setEditingTracking(false);
      fetchOffers();
      toast.success("Partner info updated successfully");
    } catch (err) {
      devError("Failed to update partner info:", err);
      setTrackingSaveError("Could not update partner info. Please try again.");
    } finally {
      setSavingTracking(false);
    }
  };

  // Brand Info: read-only by default with its own Edit → Cancel/Save (mirrors the
  // Policy/Info-from-partner sections). Save persists the brand fields + display
  // tags via a partial PATCH; the form-wide "Save changes" in the header still
  // saves everything else.
  const [editingBrand, setEditingBrand] = useState(false);
  const [savingBrand, setSavingBrand] = useState(false);
  // Remount brand edit controls so uncontrolled fields re-read form after Cancel.
  const [brandEditKey, setBrandEditKey] = useState(0);
  const [brandSnapshot, setBrandSnapshot] = useState<{
    offer_name_display: string;
    lookup_value: string;
    disabled: boolean;
    extra_store: boolean;
    offer_display_tags: OfferDisplayTags;
    syncLookup: boolean;
  } | null>(null);
  const [brandSaveError, setBrandSaveError] = useState<string | null>(null);

  const beginEditBrand = () => {
    setBrandSnapshot({
      offer_name_display: form.offer_name_display,
      lookup_value: form.lookup_value ?? "",
      disabled: form.disabled,
      extra_store: form.extra_store,
      offer_display_tags: { ...form.offer_display_tags },
      syncLookup: syncLookupFromBrandCountry,
    });
    setBrandSaveError(null);
    setEditingBrand(true);
    setBrandEditKey((k) => k + 1);
  };

  const cancelEditBrand = () => {
    if (brandSnapshot) {
      setForm((prev) => ({
        ...prev,
        offer_name_display: brandSnapshot.offer_name_display,
        lookup_value: brandSnapshot.lookup_value,
        disabled: brandSnapshot.disabled,
        extra_store: brandSnapshot.extra_store,
        offer_display_tags: brandSnapshot.offer_display_tags,
      }));
      setSyncLookupFromBrandCountry(brandSnapshot.syncLookup);
    }
    setBrandSaveError(null);
    setBrandEditKey((k) => k + 1);
    setEditingBrand(false);
  };

  const saveBrandEdit = async () => {
    if (!form.id) return;
    const validationMessage = brandSectionSaveBlockedMessage(
      form.offer_name_display,
    );
    if (validationMessage) {
      setBrandSaveError(validationMessage);
      return;
    }
    setSavingBrand(true);
    setBrandSaveError(null);
    try {
      const fd = new FormData();
      fd.append("offer_name_display", form.offer_name_display);
      fd.append("lookup_value", form.lookup_value ?? "");
      fd.append("disabled", String(form.disabled));
      fd.append("extra_store", String(form.extra_store));
      fd.append("offer_display_tags", JSON.stringify(form.offer_display_tags));
      await client.patch(`/admin/update-offer/${form.id}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      // Re-baseline so the form-wide "Save changes" doesn't re-flag these.
      setFormBaseline((prev) => ({
        ...prev,
        snapshot: {
          ...prev.snapshot,
          offer_name_display: form.offer_name_display,
          lookup_value: form.lookup_value ?? "",
          disabled: form.disabled,
          extra_store: form.extra_store,
          offer_display_tags: { ...form.offer_display_tags },
        },
      }));
      setEditingBrand(false);
      setBrandEditKey((k) => k + 1);
      fetchOffers();
      toast.success("Brand info updated successfully");
    } catch (err) {
      devError("Failed to update brand info:", err);
      setBrandSaveError("Could not update brand info. Please try again.");
    } finally {
      setSavingBrand(false);
    }
  };

  // Whether the Brand Info fields changed since Edit was opened (drives the
  // section Save button: disabled + "No changes" until something is edited).
  const brandDirty = isBrandSectionDirty(
    {
      offer_name_display: form.offer_name_display,
      lookup_value: form.lookup_value ?? "",
      disabled: form.disabled,
      extra_store: form.extra_store,
      offer_display_tags: form.offer_display_tags,
      syncLookup: syncLookupFromBrandCountry,
    },
    brandSnapshot,
  );

  // Cashback Management edit toggle — locks/unlocks the fields. Save persists
  // commission/max-cap/product-type lines via a partial PATCH (mirrors Brand Info).
  const [editingCashback, setEditingCashback] = useState(false);
  const [savingCashback, setSavingCashback] = useState(false);
  const [cashbackSaveError, setCashbackSaveError] = useState<string | null>(null);
  // Bump to remount the locked fieldset so uncontrolled controls (the Switch's
  // defaultChecked, defaultValue inputs) re-read the form after a Cancel revert.
  const [cashbackEditKey, setCashbackEditKey] = useState(0);
  const [cashbackSnapshot, setCashbackSnapshot] = useState<
    | (Pick<
        OfferRequestForm,
        | "commission_store"
        | "all_product_types"
        | "max_cap"
        | "product_types"
        | "commission_entry_mode"
      > & { commissionRaw: string })
    | null
  >(null);

  const beginEditCashback = () => {
    setCashbackSnapshot({
      commission_store: form.commission_store,
      all_product_types: form.all_product_types,
      max_cap: form.max_cap,
      product_types: form.product_types,
      commission_entry_mode: form.commission_entry_mode,
      commissionRaw,
    });
    setCashbackSaveError(null);
    setEditingCashback(true);
    if (
      form.commission_entry_mode === "auto" &&
      (form.commission_store == null || form.commission_store === 0) &&
      !commissionRaw.trim()
    ) {
      void syncAutoCommissionFromPartner();
    }
  };

  const cancelEditCashback = () => {
    if (cashbackSnapshot) {
      setForm((prev) => ({
        ...prev,
        commission_store: cashbackSnapshot.commission_store,
        all_product_types: cashbackSnapshot.all_product_types,
        max_cap: cashbackSnapshot.max_cap,
        product_types: cashbackSnapshot.product_types,
        commission_entry_mode: cashbackSnapshot.commission_entry_mode,
      }));
      setCommissionRaw(cashbackSnapshot.commissionRaw);
    }
    setCashbackSaveError(null);
    setCashbackEditKey((k) => k + 1);
    setEditingCashback(false);
  };

  const saveCashbackEdit = async () => {
    if (!form.id) return;
    setSavingCashback(true);
    setCashbackSaveError(null);
    try {
      const fd = new FormData();
      appendCashbackPatchFields(fd, {
        commission_store: form.commission_store,
        max_cap: form.max_cap,
        all_product_types: form.all_product_types,
        product_types: form.product_types,
      });
      await client.patch(`/admin/update-offer/${form.id}`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setFormBaseline((prev) => ({
        ...prev,
        snapshot: {
          ...prev.snapshot,
          commission_store: form.commission_store,
          all_product_types: form.all_product_types,
          max_cap: form.max_cap,
          product_types: form.product_types,
          commission_entry_mode: form.commission_entry_mode,
        },
      }));
      setOpenModal((prev) =>
        prev && typeof prev === "object"
          ? {
              ...prev,
              commission_store: form.commission_store,
              max_cap: form.max_cap,
              all_product_types: form.all_product_types,
              product_types: form.product_types,
            }
          : prev,
      );
      setEditingCashback(false);
      fetchOffers();
      toast.success("Cashback updated successfully");
    } catch (err) {
      devError("Failed to update cashback:", err);
      setCashbackSaveError("Could not update cashback. Please try again.");
    } finally {
      setSavingCashback(false);
    }
  };

  const cashbackDirty =
    !!cashbackSnapshot &&
    isDirty(
      {
        commission_store: form.commission_store,
        all_product_types: form.all_product_types,
        max_cap: form.max_cap,
        product_types: form.product_types,
        commission_entry_mode: form.commission_entry_mode,
        commissionRaw,
      },
      cashbackSnapshot,
    );

  // Upsize event edit toggle — mirrors Cashback (lock/unlock; no section save).
  const [editingUpsize, setEditingUpsize] = useState(false);
  const [upsizeEditKey, setUpsizeEditKey] = useState(0);
  const [upsizeSnapshot, setUpsizeSnapshot] = useState<
    | (Pick<
        OfferRequestForm,
        | "upsize_all_product_types"
        | "upsize_product_types"
        | "upsize_start_date"
        | "upsize_end_date"
        | "upsize_start_time"
        | "upsize_end_time"
        | "upsize_special_commission"
        | "upsize_max_cap"
      > & { launched: boolean })
    | null
  >(null);

  const beginEditUpsize = () => {
    setUpsizeSnapshot({
      upsize_all_product_types: form.upsize_all_product_types,
      upsize_product_types: form.upsize_product_types,
      upsize_start_date: form.upsize_start_date,
      upsize_end_date: form.upsize_end_date,
      upsize_start_time: form.upsize_start_time,
      upsize_end_time: form.upsize_end_time,
      upsize_special_commission: form.upsize_special_commission,
      upsize_max_cap: form.upsize_max_cap,
      launched: upsizeLaunched,
    });
    setEditingUpsize(true);
  };

  const cancelEditUpsize = () => {
    if (upsizeSnapshot) {
      const { launched, ...fields } = upsizeSnapshot;
      setForm((prev) => ({ ...prev, ...fields }));
      setUpsizeLaunched(launched);
    }
    setUpsizeEditKey((k) => k + 1);
    setEditingUpsize(false);
  };

  const { data: policyCategories = [], isPending: policyCategoriesPending } =
    useQuery<ResCategoryList[]>({
      queryKey: ["getCategory", "form-offer-policy"],
      queryFn: () => fetcher("/offer/get-category/list"),
      staleTime: 60_000,
    });

  const categoriesSortedForTags = [...policyCategories].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  /** One option per unique category name (duplicate names would break native select value matching). */
  const categoriesForTagSelect = (() => {
    const seen = new Set<string>();
    const out: ResCategoryList[] = [];
    for (const c of categoriesSortedForTags) {
      const n = c.name.trim();
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(c);
    }
    return out;
  })();

  const offerTagPreviewChips = useMemo(
    () => buildOfferTagPreviewChips(form.offer_display_tags, offer),
    [form.offer_display_tags, offer],
  );

  const legacyBrandCategoryLabel = (() => {
    const cur = form.offer_display_tags.brand_category_label.trim();
    if (!cur) return null;
    if (categoriesForTagSelect.some((c) => c.name === cur)) return null;
    return cur;
  })();

  // Upsize per-product-line draft: the editor edits a transient draft; "Add"
  // commits it into upsize_product_types (the table) and clears it; "Cancel"
  // discards. "Edit" on a table row re-loads it here (editingUpsizeIndex).
  const [upsizeDraft, setUpsizeDraft] =
    useState<OfferProductTypeEntry>(EMPTY_UPSIZE_DRAFT);
  const [editingUpsizeIndex, setEditingUpsizeIndex] = useState<number | null>(
    null,
  );

  const updateUpsizeDraft = (patch: Partial<OfferProductTypeEntry>) =>
    setUpsizeDraft((d) => ({ ...d, ...patch }));

  const cancelUpsizeDraft = () => {
    setUpsizeDraft(EMPTY_UPSIZE_DRAFT);
    setEditingUpsizeIndex(null);
  };

  const addUpsizeDraft = () => {
    if (!upsizeDraft.name.trim()) return;
    // Commit-time recompute: the draft's commission_info was written at typing
    // time with whatever fee was current then (possibly the 30% fallback) —
    // rebuild it from the raw with the fee that is current NOW.
    const committedDraft =
      (upsizeDraft.pay_in ?? "cashback") === "cashback" &&
      (upsizeDraft.commission_raw ?? "").trim()
        ? {
            ...upsizeDraft,
            commission_info: netCommissionFromRaw(
              upsizeDraft.commission_raw ?? "",
              feePercent,
            ),
          }
        : upsizeDraft;
    const editing = editingUpsizeIndex;
    setForm((prev) => {
      const list = prev.upsize_product_types ?? [];
      const next =
        editing !== null && editing < list.length
          ? list.map((row, i) => (i === editing ? committedDraft : row))
          : [...list, committedDraft];
      return { ...prev, upsize_product_types: next };
    });
    setUpsizeDraft(EMPTY_UPSIZE_DRAFT);
    setEditingUpsizeIndex(null);
  };

  const editUpsizeRow = (index: number) => {
    const entry = (form.upsize_product_types ?? [])[index];
    if (!entry) return;
    setUpsizeDraft({ ...entry });
    setEditingUpsizeIndex(index);
  };

  const deleteUpsizeRow = (index: number) =>
    setForm((prev) => ({
      ...prev,
      upsize_product_types: (prev.upsize_product_types ?? []).filter(
        (_, i) => i !== index,
      ),
    }));

  const reorderUpsizeRow = (from: number, to: number) =>
    setForm((prev) => ({
      ...prev,
      upsize_product_types: reorder(prev.upsize_product_types ?? [], from, to),
    }));

  // Default description per product type (for the upsize line's "Default" view).
  const productTypeDescByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of form.product_types ?? []) {
      if (!p.is_tagline && p.name.trim())
        map.set(p.name.trim(), (p.description ?? "").trim());
    }
    return map;
  }, [form.product_types]);

  const { data: policiesList = {} } = useQuery<Record<string, string>>({
    queryKey: ["policyList"],
    queryFn: () => fetcher("/policy/list"),
    staleTime: 30_000,
  });

  const policyMode = inferOfferPolicyMode(form.policy_category_id);
  const configuredTemplateTerms = resolveConfiguredOfferPolicyTerms(
    policyMode === "template"
      ? (form.policy_category_id ?? "")
      : templatePolicyCategoryId,
    offer?.categories,
    policyCategories,
    policiesList,
  );
  useEffect(() => {
    if (
      !editingPolicy ||
      policyMode !== "template" ||
      templateTermsTouched ||
      form.custom_terms?.trim() ||
      !configuredTemplateTerms
    ) {
      return;
    }
    setTemplateTermsDraft(configuredTemplateTerms);
    setForm((prev) => ({
      ...prev,
      custom_terms: configuredTemplateTerms,
    }));
  }, [
    configuredTemplateTerms,
    editingPolicy,
    form.custom_terms,
    policyMode,
    setForm,
    templateTermsTouched,
  ]);
  // The brand's effective Terms & Conditions in read-only mode. Template mode
  // can fall back to sample text; Custom Writing never does.
  const policyBaseTerms = resolveOfferPolicyBaseTerms(
    form.policy_category_id ?? "",
    offer?.categories,
    policyCategories,
    policiesList,
  );
  const policyPreviewText =
    policyMode === "custom"
      ? form.custom_terms?.trim() || "No custom terms have been written yet."
      : form.custom_terms?.trim() || policyBaseTerms || OFFER_MOCK_TERMS;
  // Shared read-only preview box (heading + "Preview" badge + bordered box) so
  // the Terms & Conditions and Note-to-users previews look identical.
  const policyPreviewBox = (
    title: string,
    content: string,
    heightClass = "h-36",
  ) => (
    <div className="border-t border-gray-200 pt-3 dark:border-gray-600">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {title}
        </p>
        <span className="inline-flex items-center rounded-md bg-gray-500/10 px-1.5 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
          Preview
        </span>
      </div>
      <div
        className={`${heightClass} overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed whitespace-pre-line text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400`}
      >
        {content}
      </div>
    </div>
  );

  if (!openModal) return null;

  const cancelProductTypeDraft = () => {
    setProductTypeDraft(EMPTY_PRODUCT_TYPE_DRAFT);
    setEditingProductIndex(null);
  };

  // Commit the draft into form.product_types: replace the row being edited (in
  // place, preserving its position) or append a new one. Persists on Save changes.
  const addProductTypeDraft = () => {
    if (!productTypeDraft.name.trim()) return;
    if (insertMode === "tagline") {
      const editing = editingProductIndex;
      const taglineEntry = {
        name: productTypeDraft.name.trim(),
        commission_info: "",
        is_tagline: true,
      };
      setForm((prev) => {
        const list = prev.product_types ?? [];
        const next =
          editing !== null && editing < list.length
            ? list.map((row, i) => (i === editing ? taglineEntry : row))
            : [...list, taglineEntry];
        return { ...prev, product_types: next };
      });
      setProductTypeDraft(EMPTY_PRODUCT_TYPE_DRAFT);
      setEditingProductIndex(null);
      toast.success(editing !== null ? "Tagline updated" : "Tagline added");
      return;
    }
    const entry = productTypeDraftToEntry(productTypeDraft, feePercent);
    const editing = editingProductIndex;
    setForm((prev) => {
      const list = prev.product_types ?? [];
      const next =
        editing !== null && editing < list.length
          ? list.map((row, i) => (i === editing ? entry : row))
          : [...list, entry];
      return { ...prev, product_types: next };
    });
    setProductTypeDraft(EMPTY_PRODUCT_TYPE_DRAFT);
    setEditingProductIndex(null);
    toast.success(
      editing !== null ? "Product type updated" : "Product type added",
    );
  };

  // Load a committed row into the draft frame for editing — non-destructive: the
  // row stays in the list and is replaced in place on Update (Cancel discards).
  const editProductTypeRow = (index: number) => {
    const entry = (form.product_types ?? [])[index];
    if (!entry) return;
    if (entry.is_tagline) {
      setInsertMode("tagline");
      setProductTypeDraft({ ...EMPTY_PRODUCT_TYPE_DRAFT, name: entry.name });
    } else {
      setInsertMode("product");
      setProductTypeDraft(productTypeEntryToDraft(entry, feePercent));
    }
    setEditingProductIndex(index);
  };

  const deleteProductTypeRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      product_types: (prev.product_types ?? []).filter((_, i) => i !== index),
    }));
  };

  // Drag-and-drop: move the row at `from` to `to` (order persists on Save).
  const reorderProductTypeRow = (from: number, to: number) =>
    setForm((prev) => ({
      ...prev,
      product_types: reorder(prev.product_types ?? [], from, to),
    }));

  return (
    <OfferFullscreenCardShell
      afterHeader={<OfferFormSectionNav showReference={Boolean(offer)} />}
      header={
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-3">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {offer ? (
                <>
                  <h3
                    className="max-w-full truncate text-[32px] font-semibold tracking-tight text-gray-900 dark:text-white"
                    title={
                      form.offer_name_display?.trim() ||
                      offer.offer_name ||
                      offer._id
                    }
                  >
                    {form.offer_name_display?.trim() ||
                      offer.offer_name ||
                      offer._id}
                  </h3>
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-0.5 text-base font-medium text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
                    Edit offer
                  </span>
                </>
              ) : (
                <h3 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                  Edit offer
                </h3>
              )}
            </div>
            <p className="max-w-2xl text-sm leading-snug text-pretty text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">
                You edit
              </span>{" "}
              names, caps, tracking links, images, and display tags.{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                Grey / reference blocks
              </span>{" "}
              show partner feed data (not saved from this screen).
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold tracking-wide text-emerald-800 uppercase dark:bg-emerald-500/20 dark:text-emerald-200">
                Editable fields below
              </span>
              <span className="inline-flex items-center rounded-md bg-gray-500/10 px-2 py-1 text-[11px] font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                Partner feed = read-only
              </span>
            </div>
          </div>
          <div className="xsm:flex-row xsm:justify-end flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:items-center sm:gap-2">
            <Button
              className="xsm:w-auto min-h-11 w-full touch-manipulation"
              size="sm"
              variant="outline"
              type="button"
              onClick={() => setOpenModal(false)}
              disabled={isLoading}
            >
              Close
            </Button>
          </div>
        </div>
      }
    >
      <>
        {offer ? (
          <FormOfferBrandReferenceStrip offer={offer} form={form} />
        ) : null}

        <section
          id="offer-section-brand"
          className={`relative space-y-8 rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-800/30 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
        >
          {brandSaveError && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {brandSaveError}
            </p>
          )}
          {/* Brand info fields — grouped for easier selection */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                Brand Info
              </h4>
              <div className="relative z-20 flex shrink-0 flex-wrap items-center gap-2">
                {!editingBrand ? (
                  <SecondaryButton onClick={beginEditBrand} disabled={!offer}>
                    Edit
                  </SecondaryButton>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditBrand}
                      disabled={savingBrand}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveBrandEdit()}
                      disabled={savingBrand || !brandDirty}
                      className="border-brand-600 bg-brand-600 hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500 rounded-lg border px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingBrand
                        ? "Saving…"
                        : brandDirty
                          ? "Save changes"
                          : "No changes"}
                    </button>
                  </>
                )}
              </div>
            </div>
            {editingBrand ? (
              <>
                <div
                  key={`brand-edit-fields-${brandEditKey}`}
                  className="mt-2 space-y-[18px]"
                >
                  <div>
                    <FieldLabel
                      label="Name of offer"
                      description="Display name shown to users in the app."
                    />
                    <Input
                      type="text"
                      name="offer_name_display"
                      value={form.offer_name_display}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          offer_name_display: e.target.value,
                        }))
                      }
                    />
                  </div>
                  {/* Brand category dropdown — picks the system-category tag; the
                  on/off toggle lives with the other tags under Offer tags. */}
                  <div>
                    <div className="mb-1.5">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        Brand category
                      </p>
                      <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                        Partner feed:{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {offer?.categories?.trim() ? offer.categories : "—"}
                        </span>
                        . Pick a system category, or keep “Use partner feed”.
                        Enable the tag under Offer tags.
                      </p>
                    </div>
                    <label
                      htmlFor="offer_tag_brand_category"
                      className="sr-only"
                    >
                      Brand category tag
                    </label>
                    <select
                      id="offer_tag_brand_category"
                      name="offer_tag_brand_category"
                      className="shadow-theme-xs w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                      value={form.offer_display_tags.brand_category_label}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          offer_display_tags: {
                            ...form.offer_display_tags,
                            brand_category_label: e.target.value,
                          },
                        })
                      }
                      disabled={isLoading || policyCategoriesPending}
                    >
                      <option value="">
                        Use partner feed
                        {offer?.categories?.trim()
                          ? ` (${offer.categories.trim()})`
                          : ""}
                      </option>
                      {legacyBrandCategoryLabel ? (
                        <option value={legacyBrandCategoryLabel}>
                          {legacyBrandCategoryLabel} (not in category list —
                          choose a listed value to replace)
                        </option>
                      ) : null}
                      {categoriesForTagSelect.map((cat) => (
                        <option key={cat._id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    {policyCategoriesPending ? (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Loading categories…
                      </p>
                    ) : categoriesForTagSelect.length === 0 ? (
                      <NoData className="mt-1">
                        No categories in the system yet. Add them under Category
                        Management, or use partner feed.
                      </NoData>
                    ) : null}
                  </div>
                </div>
                <div className="mt-[18px]">
                  <div className="mb-1.5">
                    <label
                      htmlFor="offer-lookup"
                      className="text-sm font-medium text-gray-800 dark:text-gray-200"
                    >
                      Lookup slug (optional)
                    </label>
                    <p
                      id="offer-lookup-hint"
                      className="mt-0.5 text-xs text-gray-500 dark:text-gray-400"
                    >
                      With the default option on, the slug stays{" "}
                      <code className="rounded bg-gray-100 px-1 py-0.5 text-[0.7rem] dark:bg-gray-800">
                        brandname_countrycode
                      </code>{" "}
                      (lowercase, non-alphanumeric → underscore) and updates
                      when the offer name or country changes.
                    </p>
                  </div>
                  <input
                    id="offer-lookup"
                    type="text"
                    value={form.lookup_value}
                    onChange={(e) =>
                      setForm({ ...form, lookup_value: e.target.value })
                    }
                    readOnly={syncLookupFromBrandCountry}
                    disabled={isLoading}
                    aria-describedby="offer-lookup-hint"
                    title={
                      syncLookupFromBrandCountry
                        ? 'Uncheck "Default: brand + country" to edit manually'
                        : undefined
                    }
                    className="shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 read-only:bg-gray-50 read-only:text-gray-700 focus:ring-3 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:read-only:bg-gray-800 dark:read-only:text-gray-200"
                    placeholder="my_brand_th — used in app open URLs"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="offer-sync-lookup"
                      className="flex cursor-pointer items-center gap-2 text-xs text-gray-600 dark:text-gray-400"
                    >
                      <input
                        id="offer-sync-lookup"
                        type="checkbox"
                        checked={syncLookupFromBrandCountry}
                        onChange={(e) =>
                          setSyncLookupFromBrandCountry(e.target.checked)
                        }
                        className="text-brand-600 focus:ring-brand-500 h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-900"
                      />
                      <span>Default: brand + country (e.g. apple_th)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          lookup_value: defaultLookupFromBrandAndCountry(
                            prev.offer_name_display,
                            offerCountry,
                          ),
                        }))
                      }
                      disabled={isLoading || syncLookupFromBrandCountry}
                      className="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Apply once
                    </button>
                  </div>
                </div>
                <div className="mt-[18px] flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:gap-6">
                  <div className="flex min-w-0 items-start gap-3 sm:max-w-md">
                    <Switch
                      key={`brand-active-${brandEditKey}`}
                      label=""
                      checked={!form.disabled}
                      onChange={(checked) =>
                        setForm((prev) => ({ ...prev, disabled: !checked }))
                      }
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                        Active offer
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Show this offer to users.
                      </p>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-start gap-3 sm:max-w-md">
                    <Switch
                      key={`brand-top-${brandEditKey}`}
                      label=""
                      checked={form.extra_store}
                      onChange={(checked) =>
                        setForm((prev) => ({ ...prev, extra_store: checked }))
                      }
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                        Top Brands
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Highlight this offer in top-brand placements in the app.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <dl
                aria-label="Brand Info summary"
                className="mt-2 grid gap-x-6 gap-y-4 sm:grid-cols-2"
              >
                <div>
                  <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    Name of offer
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                    {form.offer_name_display?.trim() || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    Brand category
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                    {form.offer_display_tags.brand_category_label?.trim() ||
                      (offer?.categories?.trim()
                        ? `Use partner feed (${offer.categories.trim()})`
                        : "Use partner feed")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    Lookup slug
                  </dt>
                  <dd className="mt-0.5 text-sm break-all text-gray-900 dark:text-gray-100">
                    {form.lookup_value?.trim() || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    Visibility
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    <span
                      className={`${STATUS_BADGE_BASE} ${
                        form.disabled
                          ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                      }`}
                    >
                      {form.disabled ? "Disabled" : "Active"}
                    </span>
                    {form.extra_store ? (
                      <span
                        className={`${STATUS_BADGE_BASE} bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200`}
                      >
                        Top brand
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    Active tags
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                    {offerTagPreviewChips.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {offerTagPreviewChips.map((c, i) => (
                          <span
                            key={`brand-summary-tag-${i}`}
                            className="text-brand-900 dark:bg-brand-950/60 dark:text-brand-100 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium shadow-sm"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "None enabled"
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </div>

          {editingBrand && (
            <div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Offer tags (merchandising)
                </h4>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Optional labels for the offer card in the app: category,
                  promos, and expiry messaging. Editable here; unrelated to
                  partner rates above.
                </p>
                {offerTagPreviewChips.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {offerTagPreviewChips.map((c, i) => (
                      <span
                        key={`tag-preview-${i}`}
                        className="text-brand-900 dark:bg-brand-950/60 dark:text-brand-100 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium shadow-sm"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-brand-800/70 dark:text-brand-200/70 mt-2 text-xs">
                    No tags enabled — use the toggles below to show pills in the
                    app.
                  </p>
                )}
              </div>
              <div className="mt-4 space-y-5">
                <div>
                  <div className="flex items-start gap-3">
                    <Switch
                      key={`${form.id}-odt-brand`}
                      label=""
                      defaultChecked={
                        form.offer_display_tags.brand_category_enabled
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          offer_display_tags: {
                            ...form.offer_display_tags,
                            brand_category_enabled: e,
                          },
                        })
                      }
                      disabled={isLoading}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                        Brand category
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                        Show the brand-category pill in the app. Pick which
                        category under Brand Info above.
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex items-start gap-3">
                    <Switch
                      key={`${form.id}-odt-xc`}
                      label=""
                      defaultChecked={
                        form.offer_display_tags.extra_cashback_tag
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          offer_display_tags: {
                            ...form.offer_display_tags,
                            extra_cashback_tag: e,
                          },
                        })
                      }
                      disabled={isLoading}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                        Extra cashback
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                        Show an “extra cashback” style promo tag (separate from
                        Upsize fields below).
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-3">
                    <Switch
                      key={`${form.id}-odt-grab`}
                      label=""
                      defaultChecked={form.offer_display_tags.grab_coupon_tag}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          offer_display_tags: {
                            ...form.offer_display_tags,
                            grab_coupon_tag: e,
                          },
                        })
                      }
                      disabled={isLoading}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                        Grab Coupon
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                        Highlight that users can claim a Grab-related coupon for
                        this offer.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-3">
                    <Switch
                      key={`${form.id}-odt-exp`}
                      label=""
                      defaultChecked={
                        form.offer_display_tags.expire_in_days_enabled
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          offer_display_tags: {
                            ...form.offer_display_tags,
                            expire_in_days_enabled: e,
                          },
                        })
                      }
                      disabled={isLoading}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                        Expire in X days
                      </p>
                      <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                        Shows “Expire in {"{n}"} days” on the card. Set the
                        number when enabled.
                      </p>
                      {form.offer_display_tags.expire_in_days_enabled ? (
                        <div className="mt-2 flex max-w-md flex-wrap items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Expire in
                          </span>
                          <Input
                            type="number"
                            name="offer_tag_expire_days"
                            min="1"
                            className="w-24"
                            value={
                              form.offer_display_tags.expire_in_days == null
                                ? ""
                                : String(form.offer_display_tags.expire_in_days)
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm({
                                ...form,
                                offer_display_tags: {
                                  ...form.offer_display_tags,
                                  expire_in_days: v === "" ? null : Number(v),
                                },
                              });
                            }}
                            disabled={isLoading}
                            autoComplete="off"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            days
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Cashback management, product types & upsize promotion */}
        <div
          id="offer-section-merch"
          className={`border-brand-200/80 bg-brand-50/50 dark:border-brand-800/60 dark:bg-brand-950/25 rounded-xl border border-dashed p-4 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
        >
          <section
            id="offer-section-cashback"
            className={`relative space-y-8 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
          >
            {/* Section actions — pinned top-right; Edit unlocks the fields,
            Save PATCHes cashback to the API, Cancel reverts. */}
            <div className="absolute top-0 right-0 z-10">
              {!editingCashback ? (
                <SecondaryButton onClick={beginEditCashback} disabled={!offer}>
                  Edit
                </SecondaryButton>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={cancelEditCashback}
                    disabled={savingCashback}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveCashbackEdit()}
                    disabled={savingCashback || !cashbackDirty}
                    className="border-brand-600 bg-brand-600 hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500 rounded-lg border px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingCashback
                      ? "Saving…"
                      : cashbackDirty
                        ? "Save changes"
                        : "No changes"}
                  </button>
                </div>
              )}
            </div>
            {cashbackSaveError ? (
              <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                {cashbackSaveError}
              </p>
            ) : null}
            {feeIsFallback ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Fee Structure rate unavailable — using the {feePercent}% default
                until it loads.
              </p>
            ) : null}
            <fieldset
              key={cashbackEditKey}
              disabled={!editingCashback || isLoading}
              className="min-w-0 space-y-8"
            >
              {/* Cashback management fields — grouped for easier selection */}
              <div className="space-y-2">
                <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                  Cashback Management
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  The default cashback for this offer (commission %,
                  product-type lines, and max cap). Run a special-period
                  promotion under{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Upsize event
                  </span>
                  .
                </p>

                <div className="min-w-0 space-y-[18px]">
                  {/* Commission entry — grouped for easier selection */}
                  <div>
                    <FieldLabel
                      label="Commission (%)"
                      description={
                        form.commission_entry_mode === "auto"
                          ? `Loads the best partner rate for this merchant on the selected affiliate network (same as Commission Management), then applies −${feePercent}% for the user-facing %.`
                          : `Maximum % offered to users. Enter the value already reduced by ${feePercent}% from the affiliate partner rate.`
                      }
                    />
                    <div className="mb-3 flex min-w-0 items-start gap-3 sm:max-w-md">
                      <Switch
                        key={`${form.id}-all-product-types`}
                        label=""
                        onChange={(e) =>
                          setForm({ ...form, all_product_types: e })
                        }
                        defaultChecked={form.all_product_types}
                        disabled={isLoading || !editingCashback}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          All product types
                        </p>
                        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                          Use one commission rate and tracking link for all
                          lines. Turn off to add per-row names and commission.
                        </p>
                      </div>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            commission_entry_mode: "auto",
                          }));
                          void syncAutoCommissionFromPartner();
                        }}
                        disabled={
                          isLoading ||
                          commissionLockedToRows ||
                          fetchBestCommission.isPending
                        }
                        aria-pressed={form.commission_entry_mode === "auto"}
                        className={`${
                          form.commission_entry_mode === "auto"
                            ? COMMISSION_MODE_TOGGLE_ACTIVE
                            : COMMISSION_MODE_TOGGLE_INACTIVE
                        } touch-manipulation`}
                      >
                        {fetchBestCommission.isPending
                          ? "Loading partner rate…"
                          : `Auto applying with ${feePercent}% fee`}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            commission_entry_mode: "manual",
                          }))
                        }
                        disabled={isLoading || commissionLockedToRows}
                        aria-pressed={form.commission_entry_mode === "manual"}
                        className={`${
                          form.commission_entry_mode === "manual"
                            ? COMMISSION_MODE_TOGGLE_ACTIVE
                            : COMMISSION_MODE_TOGGLE_INACTIVE
                        } touch-manipulation`}
                      >
                        Manual
                      </button>
                    </div>
                    <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2">
                      {form.commission_entry_mode === "auto" ? (
                        <>
                          <div className="min-w-0">
                            <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                              Raw %
                            </p>
                            {editingCashback ? (
                              <Input
                                type="text"
                                name="commission_raw"
                                value={commissionRaw}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  commissionRawEditedRef.current = true;
                                  setCommissionRaw(v);
                                  const n = Number(v);
                                  setForm((prev) => ({
                                    ...prev,
                                    commission_store:
                                      v.trim() === "" || Number.isNaN(n)
                                        ? null
                                        : applyPlatformFee(n, feePercent),
                                  }));
                                }}
                                disabled={isLoading || commissionLockedToRows}
                                placeholder="e.g. 10"
                              />
                            ) : (
                              <p className={CASHBACK_READONLY_VALUE}>
                                {commissionRaw.trim() ? commissionRaw : "—"}
                              </p>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                              % after {feePercent}% fee
                            </p>
                            {editingCashback ? (
                              <Input
                                type="text"
                                name="commission_store"
                                value={form.commission_store ?? ""}
                                disabled
                                placeholder="—"
                              />
                            ) : (
                              <p className={CASHBACK_READONLY_VALUE}>
                                {form.commission_store != null
                                  ? form.commission_store
                                  : "—"}
                              </p>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="min-w-0">
                          {editingCashback ? (
                            <Input
                              type="text"
                              name="commission_store"
                              value={form.commission_store ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                const n = Number(v);
                                setForm((prev) => ({
                                  ...prev,
                                  commission_store:
                                    v.trim() === "" || !Number.isFinite(n)
                                      ? null
                                      : n,
                                }));
                              }}
                              disabled={isLoading || commissionLockedToRows}
                            />
                          ) : (
                            <p className={CASHBACK_READONLY_VALUE}>
                              {form.commission_store != null
                                ? form.commission_store
                                : "—"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {commissionLockedToRows ? (
                      <p className="text-theme-xs mt-1.5 text-gray-500 dark:text-gray-400">
                        Auto-filled from the highest product-type cashback
                        {highestRowCashback != null
                          ? ` (${highestRowCashback}%)`
                          : ""}
                        . Turn on “All product types” to set a single rate.
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <FieldLabel
                      label="Max cap"
                      description={`Maximum cap offered to users. Enter the value already reduced by ${feePercent}% from the affiliate partner cap.`}
                    />
                    {editingCashback ? (
                      <Input
                        type="text"
                        name="max_cap"
                        value={form.max_cap ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          const n = Number(v);
                          setForm((prev) => ({
                            ...prev,
                            max_cap:
                              v.trim() === "" || !Number.isFinite(n) ? null : n,
                          }));
                        }}
                        disabled={isLoading}
                      />
                    ) : (
                      <p className={CASHBACK_READONLY_VALUE}>
                        {form.max_cap != null ? form.max_cap : "—"}
                      </p>
                    )}
                  </div>
                  {form.commission_entry_mode === "auto" ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Partner rates on file:{" "}
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {formatPartnerRatesMinMax(offer)}
                        </span>
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Product Type — hidden while "All product types" is on (one rate/link for all lines) */}
              {!form.all_product_types && (
                <section
                  id="offer-section-product"
                  className={`space-y-4 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
                >
                  {/* 1. Title · 2. Subtitle · 3. Add (blue outline secondary) */}
                  <div className="space-y-0.5">
                    <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                      Product Type
                    </h4>
                    <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      Set up a product type below, then{" "}
                      <span className="font-medium">Add</span> it. Added lines
                      persist with{" "}
                      <span className="font-medium">Save changes</span> at the
                      top of this section.
                    </p>
                  </div>
                  {editingCashback ? (
                    <div className="flex flex-col gap-4 rounded-xl border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-900">
                      {/* Insert mode: a product type, or a tagline (group heading) */}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Insert :
                        </span>
                        <button
                          type="button"
                          onClick={() => setInsertMode("product")}
                          disabled={isLoading || editingProductIndex !== null}
                          aria-pressed={insertMode === "product"}
                          className={`${
                            insertMode === "product"
                              ? COMMISSION_MODE_TOGGLE_ACTIVE
                              : COMMISSION_MODE_TOGGLE_INACTIVE
                          } touch-manipulation`}
                        >
                          Product type
                        </button>
                        <button
                          type="button"
                          onClick={() => setInsertMode("tagline")}
                          disabled={isLoading || editingProductIndex !== null}
                          aria-pressed={insertMode === "tagline"}
                          className={`${
                            insertMode === "tagline"
                              ? COMMISSION_MODE_TOGGLE_ACTIVE
                              : COMMISSION_MODE_TOGGLE_INACTIVE
                          } touch-manipulation`}
                        >
                          Tagline
                        </button>
                      </div>
                      {insertMode === "product" ? (
                        <>
                          {/* 1st line: product type name (full width) */}
                          <div>
                            <label
                              htmlFor="offer-pt-draft-name"
                              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                              Product type name
                            </label>
                            <Input
                              id="offer-pt-draft-name"
                              type="text"
                              placeholder="e.g. Electronics"
                              value={productTypeDraft.name}
                              onChange={(e) =>
                                setProductTypeDraft((d) => ({
                                  ...d,
                                  name: e.target.value,
                                }))
                              }
                              disabled={isLoading}
                              autoComplete="off"
                              className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor="offer-pt-draft-description"
                              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                              Product description
                            </label>
                            <Input
                              id="offer-pt-draft-description"
                              type="text"
                              placeholder="e.g. Phones, laptops & accessories"
                              value={productTypeDraft.description}
                              onChange={(e) =>
                                setProductTypeDraft((d) => ({
                                  ...d,
                                  description: e.target.value,
                                }))
                              }
                              disabled={isLoading}
                              autoComplete="off"
                              className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                            />
                          </div>

                          {/* 2nd line: "Pay in :" toggle group + inputs group (24px between the two groups) */}
                          <div className="flex flex-wrap items-center gap-6">
                            {/* Pay-in toggle group — wrapped for selection (no visual change) */}
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Pay in :
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setProductTypeDraft((d) => ({
                                    ...d,
                                    pay_in: "cashback",
                                  }))
                                }
                                disabled={isLoading}
                                aria-pressed={
                                  productTypeDraft.pay_in === "cashback"
                                }
                                className={`${
                                  productTypeDraft.pay_in === "cashback"
                                    ? COMMISSION_MODE_TOGGLE_ACTIVE
                                    : COMMISSION_MODE_TOGGLE_INACTIVE
                                } touch-manipulation`}
                              >
                                Cashback %
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setProductTypeDraft((d) => ({
                                    ...d,
                                    pay_in: "cash",
                                  }))
                                }
                                disabled={isLoading}
                                aria-pressed={
                                  productTypeDraft.pay_in === "cash"
                                }
                                className={`${
                                  productTypeDraft.pay_in === "cash"
                                    ? COMMISSION_MODE_TOGGLE_ACTIVE
                                    : COMMISSION_MODE_TOGGLE_INACTIVE
                                } touch-manipulation`}
                              >
                                Cash
                              </button>
                            </div>
                            {/* inputs group — fills the leftover row space; the two inputs split it */}
                            <div className="flex flex-1 items-center gap-3">
                              {productTypeDraft.pay_in === "cashback" ? (
                                <>
                                  <div className="min-w-0 flex-1">
                                    <Input
                                      id="offer-pt-draft-raw"
                                      type="text"
                                      placeholder="Raw %"
                                      ariaLabel="Raw %"
                                      title="Raw %"
                                      value={productTypeDraft.commission_raw}
                                      onChange={(e) =>
                                        setProductTypeDraft((d) => ({
                                          ...d,
                                          commission_raw: e.target.value,
                                        }))
                                      }
                                      disabled={isLoading}
                                      autoComplete="off"
                                      className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <Input
                                      id="offer-pt-draft-net"
                                      type="text"
                                      placeholder={`% after ${feePercent}% fee`}
                                      ariaLabel={`% after ${feePercent}% fee`}
                                      title={`% after ${feePercent}% fee`}
                                      value={netCommissionFromRaw(
                                        productTypeDraft.commission_raw,
                                        feePercent,
                                      )}
                                      disabled
                                      className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                                    />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="min-w-0 flex-1">
                                    <Input
                                      id="offer-pt-draft-amount"
                                      type="text"
                                      placeholder="Amount"
                                      ariaLabel="Amount"
                                      title="Amount"
                                      value={productTypeDraft.amount}
                                      onChange={(e) =>
                                        setProductTypeDraft((d) => ({
                                          ...d,
                                          amount: e.target.value,
                                        }))
                                      }
                                      disabled={isLoading}
                                      autoComplete="off"
                                      className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <select
                                      id="offer-pt-draft-currency"
                                      value={productTypeDraft.currency}
                                      onChange={(e) =>
                                        setProductTypeDraft((d) => ({
                                          ...d,
                                          currency: e.target.value,
                                        }))
                                      }
                                      disabled={isLoading}
                                      aria-label="Currency"
                                      title="Currency"
                                      className="focus:border-brand-300 focus:ring-brand-500/10 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:ring-3 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                    >
                                      <option value="THB">THB</option>
                                      <option value="USD">USD</option>
                                    </select>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div>
                          <label
                            htmlFor="offer-pt-draft-tagline"
                            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                          >
                            Tagline (group heading)
                          </label>
                          <Input
                            id="offer-pt-draft-tagline"
                            type="text"
                            placeholder="e.g. Cashback list that excludes China & Japan"
                            value={productTypeDraft.name}
                            onChange={(e) =>
                              setProductTypeDraft((d) => ({
                                ...d,
                                name: e.target.value,
                              }))
                            }
                            disabled={isLoading}
                            autoComplete="off"
                            className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                          />
                        </div>
                      )}

                      {/* 3rd line: Cancel / Add|Update (bottom right) */}
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelProductTypeDraft}
                          disabled={isLoading}
                          className={`${SUPPORT_BUTTON_DEFAULT_CLASS} touch-manipulation`}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={addProductTypeDraft}
                          disabled={
                            isLoading || productTypeDraft.name.trim() === ""
                          }
                          className={`${SUPPORT_BUTTON_BLUE_CLASS} touch-manipulation`}
                        >
                          {editingProductIndex !== null
                            ? "Update"
                            : insertMode === "tagline"
                              ? "Add tagline"
                              : "Add"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <ProductTypeTable
                    title="Added product type list"
                    rows={form.product_types ?? []}
                    editingIndex={editingProductIndex}
                    disabled={isLoading}
                    onReorder={reorderProductTypeRow}
                    onEdit={editProductTypeRow}
                    onDelete={deleteProductTypeRow}
                  />
                </section>
              )}
            </fieldset>
          </section>
        </div>

        {/* Upsize event — its own section, separate from Cashback Management */}
        <section
          id="offer-section-upsize"
          className={`border-brand-200/80 bg-brand-50/50 dark:border-brand-800/60 dark:bg-brand-950/25 relative rounded-xl border border-dashed p-4 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
        >
          {/* Section actions — Edit unlocks the fields; Save locks (changes
          persist via the form-wide "Save changes"); Cancel reverts. */}
          <div className="absolute top-4 right-4 z-10">
            {!editingUpsize ? (
              <SecondaryButton onClick={beginEditUpsize} disabled={!offer}>
                Edit
              </SecondaryButton>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEditUpsize}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUpsize(false)}
                  className="border-brand-600 bg-brand-600 hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500 rounded-lg border px-3 py-1.5 text-sm font-medium text-white"
                >
                  Save
                </button>
              </div>
            )}
          </div>
          <fieldset
            key={upsizeEditKey}
            disabled={!editingUpsize || isLoading}
            className="min-w-0"
          >
            <div>
              <div className="space-y-5">
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                    Upsize event
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Special-period promotion — temporarily overrides the default
                    cashback above with a higher commission and max cap for a
                    set window.
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-14">
                    <PrimaryButton
                      variant={upsizeLaunched ? "blue" : "default"}
                      onClick={() => {
                        const next = !upsizeLaunched;
                        setUpsizeLaunched(next);
                        if (next)
                          setForm((prev) => ({
                            ...prev,
                            upsize_all_product_types: true,
                          }));
                      }}
                    >
                      Launch Upsize Event
                    </PrimaryButton>
                    {upsizeLaunched ? (
                      <div className="flex min-w-0 items-start gap-3 sm:max-w-md">
                        <Switch
                          key={`${form.id}-upsize-all-product-types`}
                          label=""
                          onChange={(e) =>
                            setForm({ ...form, upsize_all_product_types: e })
                          }
                          defaultChecked={form.upsize_all_product_types}
                          disabled={isLoading || !editingUpsize}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            All product types
                          </p>
                          <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                            Apply this upsize to all products with one rate.
                            Turn off to set per-product-type upsize lines.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {upsizeLaunched ? (
                    <>
                      <div className="mt-3">
                        <p className="mb-1.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                          Upsize period
                        </p>
                        {editingUpsize ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex flex-1 items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <Input
                                  id="offer-upsize-start"
                                  type={startDateType}
                                  placeholder="Start Date"
                                  ariaLabel="Start Date"
                                  onFocus={(e) => {
                                    const el = e.currentTarget;
                                    setStartDateType("date");
                                    requestAnimationFrame(() => {
                                      try {
                                        el.showPicker?.();
                                      } catch {
                                        /* showPicker needs a user gesture; ignore if blocked */
                                      }
                                    });
                                  }}
                                  onBlur={(e) => {
                                    if (!e.currentTarget.value)
                                      setStartDateType("text");
                                  }}
                                  name="upsize_start_date"
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      upsize_start_date: e.target.value || null,
                                    })
                                  }
                                  defaultValue={form.upsize_start_date ?? ""}
                                  disabled={isLoading}
                                />
                              </div>
                              <TimeFieldHM
                                ariaLabel="Start time"
                                value={form.upsize_start_time ?? ""}
                                onChange={(next) =>
                                  setForm({
                                    ...form,
                                    upsize_start_time: next || null,
                                  })
                                }
                                disabled={isLoading}
                              />
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              to
                            </span>
                            <div className="flex flex-1 items-center gap-2">
                              <div className="min-w-0 flex-1">
                                <Input
                                  id="offer-upsize-end"
                                  type={endDateType}
                                  placeholder="End Date"
                                  ariaLabel="End Date"
                                  onFocus={(e) => {
                                    const el = e.currentTarget;
                                    setEndDateType("date");
                                    requestAnimationFrame(() => {
                                      try {
                                        el.showPicker?.();
                                      } catch {
                                        /* showPicker needs a user gesture; ignore if blocked */
                                      }
                                    });
                                  }}
                                  onBlur={(e) => {
                                    if (!e.currentTarget.value)
                                      setEndDateType("text");
                                  }}
                                  name="upsize_end_date"
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      upsize_end_date: e.target.value || null,
                                    })
                                  }
                                  defaultValue={form.upsize_end_date ?? ""}
                                  disabled={isLoading}
                                />
                              </div>
                              <TimeFieldHM
                                ariaLabel="End time"
                                value={form.upsize_end_time ?? ""}
                                onChange={(next) =>
                                  setForm({
                                    ...form,
                                    upsize_end_time: next || null,
                                  })
                                }
                                disabled={isLoading}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className={CASHBACK_READONLY_VALUE}>
                            {formatUpsizePeriod(
                              form.upsize_start_date,
                              form.upsize_start_time,
                              form.upsize_end_date,
                              form.upsize_end_time,
                            )}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 flex flex-col gap-4 rounded-xl border border-gray-300 bg-gray-50/50 p-4 dark:border-gray-600 dark:bg-gray-800/30">
                        {!form.upsize_all_product_types ? (
                          <>
                            <ul className="space-y-4">
                              {[upsizeDraft].map((row, i) => {
                                const baseId = `offer-upsize-draft-${form.id || "new"}-${i}`;
                                return (
                                  <li
                                    key={i}
                                    className="flex flex-col gap-4 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-gray-200 [&:not(:first-child)]:pt-4 dark:[&:not(:first-child)]:border-gray-700"
                                  >
                                    <div className="flex flex-wrap items-center gap-3">
                                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Insert :
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateUpsizeDraft({
                                            is_tagline: false,
                                          })
                                        }
                                        disabled={isLoading}
                                        aria-pressed={!row.is_tagline}
                                        className={`${
                                          !row.is_tagline
                                            ? COMMISSION_MODE_TOGGLE_ACTIVE
                                            : COMMISSION_MODE_TOGGLE_INACTIVE
                                        } touch-manipulation`}
                                      >
                                        Product type
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateUpsizeDraft({
                                            is_tagline: true,
                                          })
                                        }
                                        disabled={isLoading}
                                        aria-pressed={!!row.is_tagline}
                                        className={`${
                                          row.is_tagline
                                            ? COMMISSION_MODE_TOGGLE_ACTIVE
                                            : COMMISSION_MODE_TOGGLE_INACTIVE
                                        } touch-manipulation`}
                                      >
                                        Tagline
                                      </button>
                                    </div>
                                    {row.is_tagline ? (
                                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
                                        <div className="min-w-0 flex-1">
                                          <label
                                            htmlFor={`${baseId}-tagline`}
                                            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                                          >
                                            Tagline (group heading)
                                          </label>
                                          <Input
                                            id={`${baseId}-tagline`}
                                            type="text"
                                            placeholder="e.g. Cashback list that excludes China & Japan"
                                            ariaLabel="Upsize tagline group heading"
                                            value={row.name}
                                            onChange={(e) =>
                                              updateUpsizeDraft({
                                                name: e.target.value,
                                              })
                                            }
                                            disabled={isLoading}
                                            autoComplete="off"
                                            className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
                                          <div className="min-w-0 flex-1">
                                            <label
                                              htmlFor={`${baseId}-name`}
                                              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                                            >
                                              Product type name
                                            </label>
                                            <select
                                              id={`${baseId}-name`}
                                              className="shadow-theme-xs min-h-11 w-full min-w-0 touch-manipulation rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 sm:text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                                              value={
                                                row.is_others
                                                  ? "__others__"
                                                  : row.name
                                              }
                                              onChange={(e) =>
                                                e.target.value === "__others__"
                                                  ? updateUpsizeDraft({
                                                      is_others: true,
                                                      name: "",
                                                      // No product type to supply a
                                                      // default description → force Re-write.
                                                      description_rewrite: true,
                                                    })
                                                  : updateUpsizeDraft({
                                                      is_others: false,
                                                      name: e.target.value,
                                                      description_rewrite: false,
                                                    })
                                              }
                                              disabled={isLoading}
                                            >
                                              <option value="">
                                                Select product type…
                                              </option>
                                              {upsizeProductTypeNameOptions.map(
                                                (name) => (
                                                  <option
                                                    key={name}
                                                    value={name}
                                                  >
                                                    {name}
                                                  </option>
                                                ),
                                              )}
                                              {!row.is_others &&
                                              row.name.trim() &&
                                              !upsizeProductTypeNameOptions.includes(
                                                row.name.trim(),
                                              ) ? (
                                                <option value={row.name.trim()}>
                                                  {row.name.trim()} (saved — add
                                                  under Product Type to pick)
                                                </option>
                                              ) : null}
                                              <option value="__others__">
                                                Others (custom)
                                              </option>
                                            </select>
                                            {!row.is_others &&
                                            upsizeProductTypeNameOptions.length ===
                                              0 ? (
                                              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                                Add named lines under{" "}
                                                <span className="font-medium">
                                                  Brand Info → Product Type
                                                </span>{" "}
                                                first, or turn off{" "}
                                                <span className="font-medium">
                                                  all product types
                                                </span>{" "}
                                                if those rows are hidden.
                                              </p>
                                            ) : null}
                                            {row.is_others ? (
                                              <Input
                                                type="text"
                                                placeholder="e.g. Electronics"
                                                ariaLabel="Custom product type name"
                                                value={row.name}
                                                onChange={(e) =>
                                                  updateUpsizeDraft({
                                                    name: e.target.value,
                                                  })
                                                }
                                                disabled={isLoading}
                                                autoComplete="off"
                                                className="mt-2 min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                                              />
                                            ) : null}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="mb-1.5 flex flex-wrap items-center gap-3">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                              Product description
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateUpsizeDraft({
                                                  description_rewrite: false,
                                                  description: "",
                                                })
                                              }
                                              disabled={
                                                isLoading || row.is_others
                                              }
                                              aria-pressed={
                                                !row.description_rewrite
                                              }
                                              className={`${
                                                !row.description_rewrite
                                                  ? COMMISSION_MODE_TOGGLE_ACTIVE
                                                  : COMMISSION_MODE_TOGGLE_INACTIVE
                                              } touch-manipulation`}
                                            >
                                              Default
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateUpsizeDraft({
                                                  description_rewrite: true,
                                                  description:
                                                    row.description?.trim()
                                                      ? row.description
                                                      : (productTypeDescByName.get(
                                                          row.name.trim(),
                                                        ) ?? ""),
                                                })
                                              }
                                              disabled={isLoading}
                                              aria-pressed={
                                                !!row.description_rewrite
                                              }
                                              className={`${
                                                row.description_rewrite
                                                  ? COMMISSION_MODE_TOGGLE_ACTIVE
                                                  : COMMISSION_MODE_TOGGLE_INACTIVE
                                              } touch-manipulation`}
                                            >
                                              Re-write
                                            </button>
                                          </div>
                                          {row.description_rewrite ? (
                                            <Input
                                              type="text"
                                              placeholder="Re-write the description for this promo"
                                              ariaLabel={`Re-written description for ${row.name.trim()}`}
                                              value={row.description ?? ""}
                                              onChange={(e) =>
                                                updateUpsizeDraft({
                                                  description: e.target.value,
                                                })
                                              }
                                              disabled={isLoading}
                                              autoComplete="off"
                                              className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                                            />
                                          ) : (
                                            <Input
                                              type="text"
                                              placeholder="(uses the product type's description)"
                                              ariaLabel={`Default description for ${row.name.trim()}`}
                                              value={
                                                productTypeDescByName.get(
                                                  row.name.trim(),
                                                ) ?? ""
                                              }
                                              disabled
                                              className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                                            />
                                          )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-6">
                                          <div className="flex flex-wrap items-center gap-3">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                              Pay in :
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateUpsizeDraft({
                                                  pay_in: "cashback",
                                                })
                                              }
                                              disabled={isLoading}
                                              aria-pressed={
                                                (row.pay_in ?? "cashback") ===
                                                "cashback"
                                              }
                                              className={`${
                                                (row.pay_in ?? "cashback") ===
                                                "cashback"
                                                  ? COMMISSION_MODE_TOGGLE_ACTIVE
                                                  : COMMISSION_MODE_TOGGLE_INACTIVE
                                              } touch-manipulation`}
                                            >
                                              Cashback %
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                updateUpsizeDraft({
                                                  pay_in: "cash",
                                                })
                                              }
                                              disabled={isLoading}
                                              aria-pressed={
                                                row.pay_in === "cash"
                                              }
                                              className={`${
                                                row.pay_in === "cash"
                                                  ? COMMISSION_MODE_TOGGLE_ACTIVE
                                                  : COMMISSION_MODE_TOGGLE_INACTIVE
                                              } touch-manipulation`}
                                            >
                                              Cash
                                            </button>
                                          </div>
                                          <div className="flex flex-1 items-center gap-3">
                                            {(row.pay_in ?? "cashback") ===
                                            "cashback" ? (
                                              <>
                                                <div className="min-w-0 flex-1">
                                                  <Input
                                                    type="text"
                                                    placeholder="Raw %"
                                                    ariaLabel={`Raw % for ${row.name.trim()}`}
                                                    value={
                                                      row.commission_raw ?? ""
                                                    }
                                                    onChange={(e) =>
                                                      updateUpsizeDraft({
                                                        commission_raw:
                                                          e.target.value,
                                                        commission_info:
                                                          netCommissionFromRaw(
                                                            e.target.value,
                                                            feePercent,
                                                          ),
                                                      })
                                                    }
                                                    disabled={isLoading}
                                                    autoComplete="off"
                                                    className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                                                  />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                  <Input
                                                    type="text"
                                                    placeholder={`% after ${feePercent}% fee`}
                                                    ariaLabel={`% after ${feePercent}% fee for ${row.name.trim()}`}
                                                    value={netCommissionFromRaw(
                                                      row.commission_raw ?? "",
                                                      feePercent,
                                                    )}
                                                    disabled
                                                    className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                                                  />
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <div className="min-w-0 flex-1">
                                                  <Input
                                                    type="text"
                                                    placeholder="Amount"
                                                    ariaLabel={`Amount for ${row.name.trim()}`}
                                                    value={row.amount ?? ""}
                                                    onChange={(e) =>
                                                      updateUpsizeDraft({
                                                        amount:
                                                          e.target.value === ""
                                                            ? null
                                                            : Number(
                                                                e.target.value,
                                                              ),
                                                      })
                                                    }
                                                    disabled={isLoading}
                                                    autoComplete="off"
                                                    className="min-h-11 w-full touch-manipulation !text-base sm:!text-sm"
                                                  />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                  <select
                                                    value={
                                                      row.currency ?? "THB"
                                                    }
                                                    onChange={(e) =>
                                                      updateUpsizeDraft({
                                                        currency:
                                                          e.target.value,
                                                      })
                                                    }
                                                    disabled={isLoading}
                                                    aria-label={`Currency for ${row.name.trim()}`}
                                                    className="focus:border-brand-300 focus:ring-brand-500/10 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:ring-3 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                                  >
                                                    <option value="THB">
                                                      THB
                                                    </option>
                                                    <option value="USD">
                                                      USD
                                                    </option>
                                                  </select>
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </>
                        ) : null}
                        {form.upsize_all_product_types ? (
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {form.upsize_all_product_types ? (
                              <>
                                <div className="sm:col-span-2">
                                  <FieldLabel
                                    label="Upsize commission (%)"
                                    description="Commission during the promo."
                                  />
                                  <div className="mb-2 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setUpsizeCommissionMode("auto")
                                      }
                                      disabled={isLoading}
                                      aria-pressed={
                                        upsizeCommissionMode === "auto"
                                      }
                                      className={`${
                                        upsizeCommissionMode === "auto"
                                          ? COMMISSION_MODE_TOGGLE_ACTIVE
                                          : COMMISSION_MODE_TOGGLE_INACTIVE
                                      } touch-manipulation`}
                                    >
                                      {`Auto applying with ${feePercent}% fee`}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setUpsizeCommissionMode("manual")
                                      }
                                      disabled={isLoading}
                                      aria-pressed={
                                        upsizeCommissionMode === "manual"
                                      }
                                      className={`${
                                        upsizeCommissionMode === "manual"
                                          ? COMMISSION_MODE_TOGGLE_ACTIVE
                                          : COMMISSION_MODE_TOGGLE_INACTIVE
                                      } touch-manipulation`}
                                    >
                                      Manual
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2">
                                    {upsizeCommissionMode === "auto" ? (
                                      <>
                                        <div className="min-w-0">
                                          <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                                            Raw %
                                          </p>
                                          {editingUpsize ? (
                                            <Input
                                              type="text"
                                              name="upsize_commission_raw"
                                              value={upsizeCommissionRaw}
                                              onChange={(e) => {
                                                const v = e.target.value;
                                                upsizeCommissionRawEditedRef.current =
                                                  true;
                                                setUpsizeCommissionRaw(v);
                                                const n = Number(v);
                                                setForm((prev) => ({
                                                  ...prev,
                                                  upsize_special_commission:
                                                    v.trim() === "" ||
                                                    Number.isNaN(n)
                                                      ? null
                                                      : applyPlatformFee(
                                                          n,
                                                          feePercent,
                                                        ),
                                                }));
                                              }}
                                              disabled={isLoading}
                                            />
                                          ) : (
                                            <p
                                              className={
                                                CASHBACK_READONLY_VALUE
                                              }
                                            >
                                              {upsizeCommissionRaw.trim()
                                                ? upsizeCommissionRaw
                                                : "—"}
                                            </p>
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                                            % after {feePercent}% fee
                                          </p>
                                          {editingUpsize ? (
                                            <Input
                                              type="text"
                                              name="upsize_special_commission"
                                              value={
                                                form.upsize_special_commission ??
                                                ""
                                              }
                                              disabled
                                            />
                                          ) : (
                                            <p
                                              className={
                                                CASHBACK_READONLY_VALUE
                                              }
                                            >
                                              {form.upsize_special_commission !=
                                              null
                                                ? form.upsize_special_commission
                                                : "—"}
                                            </p>
                                          )}
                                        </div>
                                      </>
                                    ) : (
                                      <div className="min-w-0">
                                        {editingUpsize ? (
                                          <Input
                                            type="text"
                                            name="upsize_special_commission"
                                            value={
                                              form.upsize_special_commission ??
                                              ""
                                            }
                                            onChange={(e) => {
                                              const v = e.target.value;
                                              const n = Number(v);
                                              setForm((prev) => ({
                                                ...prev,
                                                upsize_special_commission:
                                                  v.trim() === "" ||
                                                  !Number.isFinite(n)
                                                    ? null
                                                    : n,
                                              }));
                                            }}
                                            disabled={isLoading}
                                          />
                                        ) : (
                                          <p
                                            className={CASHBACK_READONLY_VALUE}
                                          >
                                            {form.upsize_special_commission !=
                                            null
                                              ? form.upsize_special_commission
                                              : "—"}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="sm:col-span-2">
                                  <FieldLabel
                                    label="Max cap for upsize"
                                    description={`Maximum cap offered to users during the promo. Enter the value already reduced by ${feePercent}% from the affiliate partner cap.`}
                                  />
                                  {editingUpsize ? (
                                    <Input
                                      type="number"
                                      name="upsize_max_cap"
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          upsize_max_cap:
                                            e.target.value === ""
                                              ? null
                                              : Number(e.target.value),
                                        })
                                      }
                                      defaultValue={form.upsize_max_cap ?? ""}
                                      disabled={isLoading}
                                    />
                                  ) : (
                                    <p className={CASHBACK_READONLY_VALUE}>
                                      {form.upsize_max_cap != null
                                        ? form.upsize_max_cap
                                        : "—"}
                                    </p>
                                  )}
                                </div>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                        {!form.upsize_all_product_types ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={cancelUpsizeDraft}
                              disabled={isLoading}
                              className={`${COMMISSION_MODE_TOGGLE_INACTIVE} touch-manipulation`}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={addUpsizeDraft}
                              disabled={isLoading || !upsizeDraft.name.trim()}
                              className={`${COMMISSION_MODE_TOGGLE_ACTIVE} touch-manipulation`}
                            >
                              {editingUpsizeIndex !== null ? "Update" : "Add"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {!form.upsize_all_product_types ? (
                        <ProductTypeTable
                          title="Added upsize lines"
                          rows={form.upsize_product_types ?? []}
                          editingIndex={editingUpsizeIndex}
                          disabled={isLoading}
                          onReorder={reorderUpsizeRow}
                          onEdit={editUpsizeRow}
                          onDelete={deleteUpsizeRow}
                        />
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </fieldset>
        </section>

        {/* Logos & media */}
        <section
          id="offer-section-media"
          className={`space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-800/30 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              Logos & media
            </h4>
            {!editingMedia ? (
              <SecondaryButton onClick={beginEditMedia} disabled={!offer}>
                Edit
              </SecondaryButton>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <SecondaryButton
                  onClick={cancelEditMedia}
                  disabled={savingMedia}
                >
                  Cancel
                </SecondaryButton>
                <SecondaryButton
                  variant="blue"
                  onClick={() => void saveMediaEdit()}
                  disabled={savingMedia}
                >
                  {savingMedia ? "Saving…" : "Save"}
                </SecondaryButton>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {editingMedia
              ? "Upload one square logo and one wide banner. Each asset is reused on desktop, mobile, and legacy surfaces."
              : "Current images. Click Edit to replace them."}
          </p>

          <div>
            <FieldLabel
              label="Logo"
              description="Square (1:1) logo — used on both desktop and mobile."
            />
            <div className="flex flex-wrap items-start gap-4">
              {editingMedia && (
                <div className="w-[320px] max-w-full shrink-0">
                  <Input
                    type="file"
                    name="logo_desktop"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setForm((prev) => ({
                        ...prev,
                        logo_desktop: file,
                        logo_mobile: null,
                      }));
                    }}
                  />
                </div>
              )}
              {(form.logo_desktop || resolveAdminOfferLogoPath(openModal as Offer)) && (
                <RemoteOrBlobImage
                  src={
                    logoDesktopUrl ??
                    pathImage(resolveAdminOfferLogoPath(openModal as Offer))
                  }
                  alt="Preview"
                  width={256}
                  height={256}
                  className="h-32 w-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
                />
              )}
            </div>
          </div>

          <div>
            <FieldLabel
              label="Banner"
              description="Hero / banner image — used on both desktop and mobile."
            />
            <div className="flex flex-wrap items-start gap-4">
              {editingMedia && (
                <div className="w-[320px] max-w-full shrink-0">
                  <Input
                    type="file"
                    name="banner"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setForm((prev) => ({
                        ...prev,
                        banner: file,
                        banner_mobile: null,
                        logo_circle: null,
                      }));
                    }}
                  />
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Requested size: 800 × 450 px (W × H).
                  </p>
                </div>
              )}
              {(form.banner || persistedBannerPath) && (
                <RemoteOrBlobImage
                  src={bannerUrl ?? pathImage(persistedBannerPath)}
                  alt="Preview"
                  width={256}
                  height={256}
                  className="aspect-[800/450] h-auto w-[250px] shrink-0 rounded-lg border border-gray-200 object-cover dark:border-gray-600"
                />
              )}
            </div>
          </div>
        </section>

        {/* Policy (T&C source) — read-only by default; per-section Edit/Save. */}
        <section
          id="offer-section-policy"
          className={`space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/40 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              Terms &amp; conditions (policy)
            </h4>
            {!editingPolicy ? (
              <SecondaryButton onClick={beginEditPolicy} disabled={!offer}>
                Edit
              </SecondaryButton>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEditPolicy}
                  disabled={savingPolicy}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void savePolicyEdit()}
                  disabled={savingPolicy}
                  className="border-brand-600 bg-brand-600 hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500 rounded-lg border px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingPolicy ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}
          </div>

          {policySaveError && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {policySaveError}
            </p>
          )}

          {!editingPolicy ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {form.policy_category_id === "custom"
                  ? "Custom T&Cs for specific shop"
                  : form.policy_category_id
                    ? (policyCategories.find(
                        (c) => c._id === form.policy_category_id,
                      )?.name ?? form.policy_category_id)
                    : `Automatic — use offer category (${offer?.categories ?? "—"})`}
              </p>
              {policyPreviewBox("Terms & Conditions", policyPreviewText)}
              {form.note_to_user?.trim()
                ? policyPreviewBox(
                    "Note to users",
                    form.note_to_user,
                    "h-[88px]",
                  )
                : null}
            </div>
          ) : (
            <>
              <OfferPolicyModeSwitch
                aria-label="Policy authoring mode"
                templateLabel="Provided Template"
                customLabel="Custom Writing"
                mode={policyMode}
                onChange={changePolicyMode}
                disabled={savingPolicy}
              />

              {policyMode === "template" ? (
                <div className="space-y-3 border-t border-gray-200 pt-3 dark:border-gray-600">
                  <FieldLabel
                    label="Terms template"
                    description="Pick a configured category policy and review its editable preview."
                  />
                  <select
                    id="offer-policy-category"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    value={form.policy_category_id}
                    onChange={(e) =>
                      changeTemplatePolicyCategory(e.target.value)
                    }
                  >
                    <option value="">
                      Automatic — use offer category ({offer?.categories ?? "—"})
                    </option>
                    {policyCategories.map((cat) => {
                      const hasPolicy = Boolean(policiesList[cat._id]?.trim());
                      return (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                          {hasPolicy ? " — T&C configured" : " — no T&C yet"}
                        </option>
                      );
                    })}
                  </select>

                  {!configuredTemplateTerms ? (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                      No T&amp;C configured for this category yet — edit it under
                      Policy Management, or switch to Custom Writing.
                    </p>
                  ) : (
                    <div>
                      <FieldLabel
                        label="Template preview (editable)"
                        description="This exact text is shown to users after you save."
                      />
                      <TextArea
                        rows={12}
                        value={form.custom_terms}
                        onChange={changeActivePolicyTerms}
                        disabled={savingPolicy}
                        className="h-36 resize-none overflow-y-auto !text-xs !leading-relaxed !text-gray-700 placeholder:text-gray-400 dark:!text-gray-300"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="border-t border-gray-200 pt-3 dark:border-gray-600">
                  <FieldLabel
                    label="Custom terms"
                    description="Write the complete Terms & Conditions shown for this brand."
                  />
                  <TextArea
                    rows={12}
                    placeholder="Write the complete Terms & Conditions for this brand…"
                    value={form.custom_terms}
                    onChange={changeActivePolicyTerms}
                    disabled={savingPolicy}
                    className="h-36 resize-none overflow-y-auto !text-xs !leading-relaxed !text-gray-700 placeholder:text-gray-400 dark:!text-gray-300"
                  />
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 dark:border-gray-600">
                <div className="flex min-w-0 items-start gap-3 sm:max-w-md">
                  <Switch
                    key={`${form.id}-policy-note`}
                    label=""
                    defaultChecked={showNoteToUser}
                    onChange={(on) => {
                      setShowNoteToUser(on);
                      if (!on)
                        setForm((prev) => ({ ...prev, note_to_user: "" }));
                    }}
                    disabled={savingPolicy}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      Add note to users
                    </p>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                      Show a short message to customers alongside the T&amp;Cs
                      for this offer.
                    </p>
                  </div>
                </div>
                {showNoteToUser ? (
                  <TextArea
                    rows={3}
                    placeholder="e.g. Bonus cashback until 31 Dec · new users only"
                    value={form.note_to_user}
                    onChange={(v) => setForm({ ...form, note_to_user: v })}
                    disabled={savingPolicy}
                    className="mt-2 min-h-[5.5rem] resize-y !text-xs !leading-relaxed !text-gray-700 placeholder:text-gray-400 dark:!text-gray-300"
                  />
                ) : null}
              </div>
            </>
          )}
        </section>

        {/* Tracking links — one per product-type row (brand / line), or single offer row */}
        <div
          id="offer-section-tracking"
          className={`relative rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-800/30 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
        >
          {/* Section actions — pinned top-right, out of normal flow (ignores auto layout) */}
          <div className="absolute top-4 right-4 z-10 sm:top-5 sm:right-5">
            {!editingTracking ? (
              <SecondaryButton onClick={beginEditTracking} disabled={!offer}>
                Edit
              </SecondaryButton>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEditTracking}
                  disabled={savingTracking}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveTrackingEdit()}
                  disabled={savingTracking}
                  className="border-brand-600 bg-brand-600 hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500 rounded-lg border px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingTracking ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}
          </div>
          <div>
            <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              Info from partner
            </h4>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Choose network and advertiser, then set the app URL users open
              from this offer. Per–product-type URLs appear when you add product
              lines below and turn off{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                all product types
              </span>
              .
            </p>
          </div>
          {trackingSaveError && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {trackingSaveError}
            </p>
          )}
          {/* Commission info from partner — read-only partner/network feed (moved from the tags card) */}
          <div className="mt-5 border-y border-gray-200 py-5 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Commission info from partner
            </h4>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Structured terms as supplied by the partner or affiliate network.
              This does not change when you edit “Commission (%)” or “Max cap”
              above — partner max cap is separate and read-only here.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Tracking model
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {offer?.commission_tracking?.trim()
                    ? offer.commission_tracking
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Min / Max
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {formatPartnerRatesMinMax(offer)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Max cap (partner)
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {formatPartnerMaxCap(offer)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Currency (partner)
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {offer?.currency?.trim() ? offer.currency : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Payment terms
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {typeof offer?.payment_terms === "number"
                    ? `${offer.payment_terms} days`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                  Validation terms
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {typeof offer?.validation_terms === "number"
                    ? `${offer.validation_terms} days`
                    : "—"}
                </dd>
              </div>
            </dl>
            {Array.isArray(offer?.special_commissions) &&
            offer.special_commissions.length > 0 ? (
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Special commissions:{" "}
                </span>
                {offer.special_commissions.length} tier(s) — see partner portal
                for full rules.
              </p>
            ) : null}
          </div>

          {editingTracking ? (
            <>
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
                <div className="min-w-0">
                  <FieldLabel
                    label="Affiliate partner"
                    description="Network that supplies rates and tracking."
                  />
                  <select
                    id="offer-affiliate-network"
                    name="offer-affiliate-network"
                    className="shadow-theme-xs w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    value={form.affiliate_network_id}
                    onChange={(e) =>
                      setForm({ ...form, affiliate_network_id: e.target.value })
                    }
                    disabled={isLoading}
                  >
                    {affiliateSelectOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <FieldLabel
                    label="Affiliate brand name"
                    description="Store on the network; sets store= in the tracking link."
                  />
                  <select
                    id="offer-deeplink-advertiser"
                    name="offer-deeplink-advertiser"
                    className="shadow-theme-xs w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                    value={form.deeplink_store_id}
                    onChange={(e) =>
                      setForm({ ...form, deeplink_store_id: e.target.value })
                    }
                    disabled={isLoading}
                  >
                    {advertiserSelectOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {usePerProductTrackingLinks ? (
                <ul className="mt-4 space-y-4">
                  {(form.product_types ?? []).map((row, i) => {
                    if (row.is_tagline) return null;
                    const label =
                      row.name.trim() || `Brand / product line ${i + 1}`;
                    return (
                      <li key={i}>
                        <FieldLabel
                          label={`Tracking link — ${label}`}
                          description="URL opened in the app for this product type (e.g. gogocash.app/...)."
                        />
                        <Input
                          type="url"
                          name={`product_type_deeplink_${i}`}
                          placeholder="https://gogocash.app/open/offer/..."
                          value={row.deeplink ?? ""}
                          onChange={(e) => {
                            const next = [...(form.product_types ?? [])];
                            next[i] = { ...next[i], deeplink: e.target.value };
                            setForm({ ...form, product_types: next });
                          }}
                          disabled={isLoading}
                          autoComplete="off"
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-4">
                  <FieldLabel
                    label="Tracking link"
                    description="Prefilled from partner data (rate, currency, affiliate network); you can edit before save. If you previously saved a custom URL, that value is shown instead."
                  />
                  <Input
                    type="url"
                    name="offer_deeplink"
                    placeholder="https://gogocash.app/open/offer/..."
                    value={offerDeeplinkDraft}
                    onChange={(e) =>
                      setDeeplinkOverride(
                        offer
                          ? { offerId: offer._id, value: e.target.value }
                          : null,
                      )
                    }
                    disabled={isLoading || saveOfferDeeplink.isPending}
                    autoComplete="off"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="mt-5 space-y-4">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    Affiliate partner
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                    {affiliateSelectOptions.find(
                      (o) => o.id === form.affiliate_network_id,
                    )?.label ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    Affiliate brand name
                  </dt>
                  <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                    {advertiserSelectOptions.find(
                      (o) => o.id === form.deeplink_store_id,
                    )?.label ?? "—"}
                  </dd>
                </div>
              </dl>
              {usePerProductTrackingLinks ? (
                <ul className="space-y-3">
                  {(form.product_types ?? []).map((row, i) => {
                    if (row.is_tagline) return null;
                    const label =
                      row.name.trim() || `Brand / product line ${i + 1}`;
                    return (
                      <li key={i}>
                        <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          Tracking link — {label}
                        </p>
                        <p className="mt-0.5 text-sm break-all text-gray-900 dark:text-gray-100">
                          {row.deeplink?.trim() ? row.deeplink : "—"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div>
                  <p className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                    Tracking link
                  </p>
                  <div className="mt-0.5 flex items-start">
                    <p className="text-sm break-all text-gray-900 dark:text-gray-100">
                      {offerDeeplinkDraft.trim() ? offerDeeplinkDraft : "—"}
                    </p>
                    <CopyButton
                      value={offerDeeplinkDraft}
                      title="Copy tracking link"
                      iconClassName="h-3.5 w-3.5"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          id="offer-section-tracking-period"
          className={`relative rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-800/30 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
        >
          <div className="absolute top-4 right-4 z-10 sm:top-5 sm:right-5">
            {!editingTrackingPeriod ? (
              <SecondaryButton onClick={beginEditTrackingPeriod} disabled={!offer}>
                Edit
              </SecondaryButton>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={cancelEditTrackingPeriod}
                  disabled={savingTrackingPeriod}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveTrackingPeriodEdit()}
                  disabled={savingTrackingPeriod}
                  className="border-brand-600 bg-brand-600 hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500 rounded-lg border px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingTrackingPeriod ? "Saving…" : "Save changes"}
                </button>
              </div>
            )}
          </div>
          <div>
            <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              Cashback tracking period
            </h4>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              The Purchase → Tracking → Confirm steps customers see on this
              brand&apos;s shop page.{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Auto
              </span>{" "}
              follows the affiliate partner&apos;s validation terms;{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Manual
              </span>{" "}
              sets the windows for this brand.
            </p>
          </div>
          {trackingPeriodSaveError && (
            <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {trackingPeriodSaveError}
            </p>
          )}
          {(() => {
            const preview = resolveTrackingPeriodPreview(
              {
                tracking_period_mode: form.tracking_period_mode,
                tracking_days: form.tracking_days,
                confirm_days: form.confirm_days,
                validation_terms: offer?.validation_terms ?? null,
                flow_type: form.flow_type,
                tracking_subtitle: form.tracking_subtitle,
                confirm_subtitle: form.confirm_subtitle,
              },
              offer?.tracking_period ?? null,
            );
            const sourceLabel =
              preview.source === "manual"
                ? "Manual — set for this brand"
                : preview.source === "partner"
                  ? "Auto — from partner validation terms"
                  : "Auto — platform default (no partner terms on file)";
            return (
              <>
                <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                      Purchase
                    </dt>
                    <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                      with GoGoCash
                    </dd>
                  </div>
                  {preview.flow_type === "two_step" ? (
                    <div>
                      <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                        Tracking and confirm
                      </dt>
                      <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                        {formatTrackingDays(preview.confirm_days)}
                      </dd>
                      <dd className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {preview.confirm_subtitle}
                      </dd>
                    </div>
                  ) : (
                    <>
                      <div>
                        <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          Tracking
                        </dt>
                        <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                          {formatTrackingDays(preview.tracking_days)}
                        </dd>
                        <dd className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {preview.tracking_subtitle}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          Confirm
                        </dt>
                        <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                          {formatTrackingDays(preview.confirm_days)}
                        </dd>
                        <dd className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          {preview.confirm_subtitle}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  {sourceLabel} · Partner reference:{" "}
                  {typeof offer?.validation_terms === "number" && offer.validation_terms > 0
                    ? `validation ${offer.validation_terms} days`
                    : "validation —"}
                  {typeof offer?.payment_terms === "number" && offer.payment_terms > 0
                    ? `, payment ${offer.payment_terms} days`
                    : ""}
                </p>
              </>
            );
          })()}
          {editingTrackingPeriod && (
            <div className="mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-gray-700">
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="radio"
                    name="tracking_period_mode"
                    className="text-brand-600 focus:ring-brand-500 h-4 w-4 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                    checked={form.tracking_period_mode === "auto"}
                    onChange={() =>
                      setForm((prev) => ({ ...prev, tracking_period_mode: "auto" }))
                    }
                  />
                  Auto — fetch from affiliate partner
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="radio"
                    name="tracking_period_mode"
                    className="text-brand-600 focus:ring-brand-500 h-4 w-4 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                    checked={form.tracking_period_mode === "manual"}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        tracking_period_mode: "manual",
                      }))
                    }
                  />
                  Manual
                </label>
              </div>
              <Switch
                label="Combined 2-step flow (Tracking and confirm)"
                checked={form.flow_type === "two_step"}
                onChange={(checked) =>
                  setForm((prev) => ({
                    ...prev,
                    flow_type: checked ? "two_step" : "three_step",
                  }))
                }
              />
              {form.tracking_period_mode === "manual" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Tracking window (days)
                    </label>
                    <input
                      type="number"
                      min={MIN_TRACKING_PERIOD_DAYS}
                      max={MAX_TRACKING_PERIOD_DAYS}
                      value={form.tracking_days ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          tracking_days: e.target.value
                            ? Number(e.target.value)
                            : null,
                        }))
                      }
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Confirm window (days)
                    </label>
                    <input
                      type="number"
                      min={MIN_TRACKING_PERIOD_DAYS}
                      max={MAX_TRACKING_PERIOD_DAYS}
                      value={form.confirm_days ?? ""}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          confirm_days: e.target.value
                            ? Number(e.target.value)
                            : null,
                        }))
                      }
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </div>
              )}
              {/* Step subtitles: empty = the placeholder default copy. */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Tracking subtitle
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="from the following month"
                    value={form.tracking_subtitle ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        tracking_subtitle: e.target.value || null,
                      }))
                    }
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Confirm subtitle
                  </label>
                  <input
                    type="text"
                    maxLength={200}
                    placeholder="after validation"
                    value={form.confirm_subtitle ?? ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        confirm_subtitle: e.target.value || null,
                      }))
                    }
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    </OfferFullscreenCardShell>
  );
};

export default FormOffer;
