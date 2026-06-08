"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import NoData from "@/components/common/NoData";
import CopyButton from "@/components/ui/CopyButton";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import client, { fetcher } from "@/lib/axios/client";
import { devError } from "@/lib/devConsole";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import SecondaryButton from "../ui/button/SecondaryButton";
import { SUPPORT_BUTTON_CLASS } from "../ui/button/SupportButton";
import {
  OFFER_MOCK_TERMS,
  resolveOfferPolicyBaseTerms,
} from "@/lib/offerPolicyTerms";
import Switch from "../form/switch/Switch";
import { Offer, OfferRequestForm, type OfferDisplayTags } from "@/types/api";
import { pathImage } from "@/utils/helper";
import { useDataSession } from "@/hooks/useDataSession";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ResCategoryList } from "@/types/category";
import { DEEPLINK_STORE_OPTIONS } from "@/data/deeplinkStores";
import {
  AFFILIATE_NETWORKS,
  affiliateNetworkIdForOfferId,
} from "@/data/affiliateNetworks";
import { buildSuggestedAppDeeplink } from "@/lib/offerDeeplink";
import { isDirty } from "@/lib/isDirty";
import { defaultLookupFromBrandAndCountry } from "@/lib/createBrandLookupSlug";
import {
  applyThirtyPercentFee,
  reverseThirtyPercentFee,
} from "@/lib/commissionFee";
import { netCommissionFromRaw } from "@/lib/productTypeCommission";
import {
  EMPTY_PRODUCT_TYPE_DRAFT,
  productTypeDraftToEntry,
  productTypeEntryToDraft,
} from "@/lib/productTypeDraft";
import { reorder } from "@/lib/reorder";
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

/** Parse a percentage from partner rate lines like "5%" or "3% CPA". */
function parsePercentFromPartnerRateString(s: string): number | null {
  const m = s.trim().match(/([\d.]+)\s*%/);
  if (m) return parseFloat(m[1]);
  return null;
}

/** Min / max % across partner rate strings (read-only summary). */
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

function FieldLabel({
  label,
  description,
}: {
  label: string;
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

/** Blue (brand-filled) Support button — for the product-type "Add" action. */
const SUPPORT_BUTTON_BLUE_CLASS = COMMISSION_MODE_TOGGLE_ACTIVE;
/** Default (outline) Support button with disabled states — for "Cancel". */
const SUPPORT_BUTTON_DEFAULT_CLASS = `${SUPPORT_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`;

const AUTOCOMPLETE_POPPER_Z = { zIndex: 100002 } as const;

type IdLabelOption = { id: string; label: string };

function OfferFormSectionNav({ showReference }: { showReference: boolean }) {
  const links = useMemo(
    () =>
      [
        ...(showReference
          ? [{ id: "offer-section-reference", label: "Reference" }]
          : []),
        { id: "offer-section-brand", label: "Brand" },
        { id: "offer-section-cashback", label: "Cashback Management" },
        { id: "offer-section-tracking", label: "Tracking" },
        { id: "offer-section-merch", label: "Tags & feed" },
        { id: "offer-section-policy", label: "Policy" },
        { id: "offer-section-media", label: "Media" },
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
  const circlePersisted = (offer.logo_circle || offer.logo || "").trim();
  const circleObjectUrl = useObjectUrl(form.logo_circle);
  const circleSrc = circleObjectUrl ?? pathImage(circlePersisted || null);

  const meta = [
    { label: "Offer ID", value: offer._id },
    { label: "Lookup slug", value: offer.lookup_value?.trim() || "—" },
    { label: "Category", value: offer.categories?.trim() || "—" },
    { label: "Partner offer name", value: offer.offer_name?.trim() || "—" },
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
            {circleSrc.trim() ? (
              <RemoteOrBlobImage
                src={circleSrc}
                alt="Brand logo, circle"
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
  setIsLoading,
}: FormOfferProps) => {
  const session = useDataSession();
  const queryClient = useQueryClient();
  const logoDesktopUrl = useObjectUrl(form.logo_desktop);
  const bannerUrl = useObjectUrl(form.banner);
  const bannerMobileUrl = useObjectUrl(form.banner_mobile);
  const logoCircleUrl = useObjectUrl(form.logo_circle);
  const offer = openModal && typeof openModal === "object" ? openModal : null;
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
    (form.product_types ?? []).length > 0 && !form.all_product_types;

  const affiliateSelectOptions = useMemo<IdLabelOption[]>(
    () => AFFILIATE_NETWORKS.map((n) => ({ id: n.id, label: n.name })),
    [],
  );
  const selectedAffiliateOption = useMemo(
    () =>
      affiliateSelectOptions.find((o) => o.id === form.affiliate_network_id) ??
      null,
    [affiliateSelectOptions, form.affiliate_network_id],
  );

  const advertiserSelectOptions = useMemo<IdLabelOption[]>(
    () => DEEPLINK_STORE_OPTIONS.map((s) => ({ id: s.id, label: s.label })),
    [],
  );
  const selectedAdvertiserOption = useMemo(
    () =>
      advertiserSelectOptions.find((o) => o.id === form.deeplink_store_id) ??
      null,
    [advertiserSelectOptions, form.deeplink_store_id],
  );

  /** Names from Brand Info → Product Type rows, for Upsize line picker. */
  const upsizeProductTypeNameOptions = useMemo(() => {
    const names = (form.product_types ?? [])
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
   * "Auto apply 30% fee": the raw partner number the admin types. The saved
   * commission (`commission_store`) is this minus a 30% fee (raw × 0.7). Held
   * as a string for clean typing; re-derived from the saved net whenever a
   * different offer loads (same `form.id` cadence as the baseline above).
   */
  const [commissionRaw, setCommissionRaw] = useState(() =>
    form.commission_store != null
      ? String(reverseThirtyPercentFee(form.commission_store))
      : "",
  );
  const [commissionRawId, setCommissionRawId] = useState(form.id);
  if (commissionRawId !== form.id) {
    setCommissionRawId(form.id);
    setCommissionRaw(
      form.commission_store != null
        ? String(reverseThirtyPercentFee(form.commission_store))
        : "",
    );
  }

  // Product-type "add" frame: a local draft, committed into form.product_types
  // on Add (the committed lines show in a summary table — a later step). Cancel
  // clears the draft.
  const [productTypeDraft, setProductTypeDraft] = useState(
    EMPTY_PRODUCT_TYPE_DRAFT,
  );
  // Per-row "Action" dropdown (Edit / Delete) in the added-product-type table.
  const [openProductActionIdx, setOpenProductActionIdx] = useState<
    number | null
  >(null);
  const productActionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (openProductActionIdx === null) return;
    const handleClick = (e: MouseEvent) => {
      if (
        productActionsRef.current &&
        !productActionsRef.current.contains(e.target as Node)
      ) {
        setOpenProductActionIdx(null);
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [openProductActionIdx]);

  // Drag-and-drop reorder for the added-product-type table (native HTML5 DnD).
  const [dragSrcIndex, setDragSrcIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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
  // "Add note to users" toggle inside the policy section (note_to_user field).
  const [showNoteToUser, setShowNoteToUser] = useState(() =>
    Boolean(form.note_to_user?.trim()),
  );

  const beginEditPolicy = () => {
    setPolicySnapshot({
      policy_category_id: form.policy_category_id ?? "",
      custom_terms: form.custom_terms ?? "",
      note_to_user: form.note_to_user ?? "",
    });
    setPolicySaveError(null);
    setShowNoteToUser(Boolean(form.note_to_user?.trim()));
    // Seed the editable T&C from the resolved base when the brand has none yet,
    // so admins start from the template and tweak it.
    if (!form.custom_terms?.trim()) {
      setForm((prev) => ({
        ...prev,
        custom_terms: resolveOfferPolicyBaseTerms(
          prev.policy_category_id ?? "",
          offer?.categories,
          policyCategories,
          policiesList,
        ),
      }));
    }
    setEditingPolicy(true);
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
          Authorization: `Bearer ${session?.accessToken}`,
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
      setPolicySaveError("Could not update policy. Please try again.");
    } finally {
      setSavingPolicy(false);
    }
  };
  const baselineSuggestedDeeplink =
    serverSuggestedDeeplink ?? partnerPreviewDeeplink;
  /**
   * The tracking-link field is the only editable value not stored in `form`
   * (it lives in `deeplinkOverride`). A user edit shows up as an override for
   * the current offer whose value differs from the suggested baseline; the
   * suggested baseline can change asynchronously, so we compare against it
   * rather than snapshotting a derived value.
   */
  const deeplinkDirty =
    deeplinkOverride !== null &&
    Boolean(offer) &&
    deeplinkOverride.offerId === offer?._id &&
    deeplinkOverride.value !== baselineSuggestedDeeplink;
  const isFormDirty =
    formBaseline.id === form.id &&
    (isDirty(form, formBaseline.snapshot) || deeplinkDirty);

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

  const { data: policyCategories = [], isPending: policyCategoriesPending } =
    useQuery<ResCategoryList[]>({
      queryKey: ["getCategory", "form-offer-policy"],
      queryFn: () => fetcher("/offer/get-category/list"),
      staleTime: 60_000,
    });

  const categoriesSortedForTags = useMemo(
    () => [...policyCategories].sort((a, b) => a.name.localeCompare(b.name)),
    [policyCategories],
  );

  /** One option per unique category name (duplicate names would break native select value matching). */
  const categoriesForTagSelect = useMemo(() => {
    const seen = new Set<string>();
    const out: ResCategoryList[] = [];
    for (const c of categoriesSortedForTags) {
      const n = c.name.trim();
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(c);
    }
    return out;
  }, [categoriesSortedForTags]);

  const offerTagPreviewChips = useMemo(
    () => buildOfferTagPreviewChips(form.offer_display_tags, offer),
    [form.offer_display_tags, offer],
  );

  const legacyBrandCategoryLabel = useMemo(() => {
    const cur = form.offer_display_tags.brand_category_label.trim();
    if (!cur) return null;
    if (categoriesForTagSelect.some((c) => c.name === cur)) return null;
    return cur;
  }, [form.offer_display_tags.brand_category_label, categoriesForTagSelect]);

  /** Upsize period fields stay hidden until at least one product line exists, or loaded offer already has period data. */
  const showUpsizeEventPeriodFields = useMemo(() => {
    if ((form.upsize_product_types ?? []).length > 0) return true;
    return (
      Boolean(form.upsize_start_date) ||
      Boolean(form.upsize_end_date) ||
      form.upsize_special_commission != null ||
      form.upsize_max_cap != null
    );
  }, [
    form.upsize_product_types,
    form.upsize_start_date,
    form.upsize_end_date,
    form.upsize_special_commission,
    form.upsize_max_cap,
  ]);

  const { data: policiesList = {} } = useQuery<Record<string, string>>({
    queryKey: ["policyList"],
    queryFn: () => fetcher("/policy/list"),
    staleTime: 30_000,
  });

  // Handle file change
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, [key]: file }));
  };

  const handleSave = () => {
    const tags = form.offer_display_tags;
    if (tags.expire_in_days_enabled) {
      const n = tags.expire_in_days;
      if (n == null || Number.isNaN(n) || n < 1) {
        toast.error(
          'Set a positive number of days for "Expire in X days", or turn that tag off.',
        );
        return;
      }
    }
    const formData = new FormData();
    if (form.logo_desktop) {
      formData.append("logo_desktop", form.logo_desktop);
    }
    if (form.logo_mobile) {
      formData.append("logo_mobile", form.logo_mobile);
    }

    if (form.logo_circle) {
      formData.append("logo_circle", form.logo_circle);
    }

    if (form.banner) {
      formData.append("banner", form.banner);
    }

    if (form.banner_mobile) {
      formData.append("banner_mobile", form.banner_mobile);
    }
    formData.append("offer_name_display", form.offer_name_display);
    formData.append("lookup_value", form.lookup_value ?? "");
    formData.append("disabled", String(form.disabled));
    formData.append("commission_store", String(form.commission_store));
    formData.append("max_cap", String(form.max_cap));
    formData.append("extra_store", String(form.extra_store));
    if (form.upsize_start_date) {
      formData.append("upsize_start_date", form.upsize_start_date);
    }
    if (form.upsize_end_date) {
      formData.append("upsize_end_date", form.upsize_end_date);
    }
    if (form.upsize_special_commission != null) {
      formData.append(
        "upsize_special_commission",
        String(form.upsize_special_commission),
      );
    }
    if (form.upsize_max_cap != null) {
      formData.append("upsize_max_cap", String(form.upsize_max_cap));
    }
    const upsizeProductTypeRows = (form.upsize_product_types ?? [])
      .map((row) => ({
        name: row.name.trim(),
        commission_info: row.commission_info.trim(),
        deeplink: (row.deeplink ?? "").trim(),
      }))
      .filter(
        (row) =>
          row.name.length > 0 ||
          row.commission_info.length > 0 ||
          row.deeplink.length > 0,
      );
    formData.append(
      "upsize_product_types",
      JSON.stringify(upsizeProductTypeRows),
    );
    const productTypeRows = form.all_product_types
      ? []
      : (form.product_types ?? [])
          .map((row) => ({
            name: row.name.trim(),
            pay_in: row.pay_in ?? "cashback",
            commission_info: row.commission_info.trim(),
            amount: row.amount ?? null,
            currency: (row.currency ?? "").trim(),
            deeplink: (row.deeplink ?? "").trim(),
          }))
          .filter((row) => row.name.length > 0);
    formData.append("product_types", JSON.stringify(productTypeRows));
    formData.append("all_product_types", String(form.all_product_types));
    formData.append(
      "admin_commission_info",
      JSON.stringify(
        (form.admin_commission_info ?? []).map((s) => s.trim()).filter(Boolean),
      ),
    );
    formData.append("policy_category_id", form.policy_category_id ?? "");
    formData.append("custom_terms", form.custom_terms ?? "");
    formData.append("note_to_user", form.note_to_user ?? "");
    formData.append(
      "affiliate_network_id",
      form.affiliate_network_id.trim() || "involve_asia",
    );
    formData.append(
      "deeplink_store_id",
      form.deeplink_store_id.trim() || "global",
    );
    formData.append(
      "offer_display_tags",
      JSON.stringify(form.offer_display_tags),
    );
    const hasProductTypeRows =
      !form.all_product_types && (form.product_types ?? []).length > 0;

    setIsLoading(true);
    client
      .patch(`/admin/update-offer/${form.id}`, formData, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then(async () => {
        if (!hasProductTypeRows && form.id) {
          const d = offerDeeplinkDraft.trim();
          if (d) {
            try {
              await saveOfferDeeplink.mutateAsync({
                offerId: form.id,
                deeplink: d,
              });
            } catch {
              toast.error(
                "Offer saved, but tracking link could not be synced.",
              );
            }
          }
        }
        setOpenModal(false);
        fetchOffers();
        setIsLoading(false);
        toast.success("Offer updated successfully");
      })
      .catch((err) => {
        setIsLoading(false);
        devError("Failed to update offer:", err);
        toast.error("Could not update offer");
      });
  };

  // The brand's effective Terms & Conditions: the edited text if present, else
  // the resolved base for the selected source (category / automatic / sample).
  const policyBaseTerms = resolveOfferPolicyBaseTerms(
    form.policy_category_id ?? "",
    offer?.categories,
    policyCategories,
    policiesList,
  );
  const policyPreviewText =
    form.custom_terms?.trim() || policyBaseTerms || OFFER_MOCK_TERMS;
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

  const cancelProductTypeDraft = () =>
    setProductTypeDraft(EMPTY_PRODUCT_TYPE_DRAFT);

  // Commit the draft into form.product_types — it appears in the added-list
  // table below and persists on Save changes.
  const addProductTypeDraft = () => {
    if (!productTypeDraft.name.trim()) return;
    const entry = productTypeDraftToEntry(productTypeDraft);
    setForm((prev) => ({
      ...prev,
      product_types: [...(prev.product_types ?? []), entry],
    }));
    setProductTypeDraft(EMPTY_PRODUCT_TYPE_DRAFT);
    toast.success("Product type added");
  };

  // Load a committed row back into the draft frame and remove it from the list,
  // so editing then Add re-commits the updated line.
  const editProductTypeRow = (index: number) => {
    const entry = (form.product_types ?? [])[index];
    if (!entry) return;
    setProductTypeDraft(productTypeEntryToDraft(entry));
    setForm((prev) => ({
      ...prev,
      product_types: (prev.product_types ?? []).filter((_, i) => i !== index),
    }));
    setOpenProductActionIdx(null);
  };

  const deleteProductTypeRow = (index: number) => {
    setForm((prev) => ({
      ...prev,
      product_types: (prev.product_types ?? []).filter((_, i) => i !== index),
    }));
    setOpenProductActionIdx(null);
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
          <>
            <FormOfferBrandReferenceStrip offer={offer} form={form} />
            <div
              className="border-t border-gray-200 dark:border-gray-700"
              aria-hidden="true"
            />
          </>
        ) : null}

        <section
          id="offer-section-brand"
          className={`relative space-y-6 rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-800/30 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
        >
          {/* Section-level save — pinned top-right, out of normal flow (ignores auto layout) */}
          <div className="absolute top-4 right-4 z-10 sm:top-5 sm:right-5">
            <SecondaryButton
              variant="blue"
              disabled={isLoading || !isFormDirty}
              onClick={handleSave}
              className="touch-manipulation"
            >
              {isLoading ? "Saving…" : "Save changes"}
            </SecondaryButton>
          </div>

          {/* Brand info fields — grouped for easier selection */}
          <div>
            <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
              Brand Info
            </h4>
            <div className="mt-2">
              <FieldLabel
                label="Name of offer"
                description="Display name shown to users in the app."
              />
              <Input
                type="text"
                name="offer_name_display"
                onChange={(e) =>
                  setForm({ ...form, offer_name_display: e.target.value })
                }
                defaultValue={form.offer_name_display}
              />
            </div>
            <div className="mt-[18px]">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="offer-lookup"
                  className="text-sm font-medium text-gray-800 dark:text-gray-200"
                >
                  Lookup slug (optional)
                </label>
                <div className="flex flex-wrap items-center gap-3">
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
              <p
                id="offer-lookup-hint"
                className="mt-1 text-xs text-gray-500 dark:text-gray-400"
              >
                With the default option on, the slug stays{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-[0.7rem] dark:bg-gray-800">
                  brandname_countrycode
                </code>{" "}
                (lowercase, non-alphanumeric → underscore) and updates when the
                offer name or country changes.
              </p>
            </div>
            <div className="mt-[18px] flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-start sm:gap-6">
              <div className="flex min-w-0 items-start gap-3 sm:max-w-md">
                <Switch
                  label=""
                  onChange={(e) => setForm({ ...form, disabled: e })}
                  defaultChecked={form.disabled}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                    Disabled offer
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    Hide this offer from users.
                  </p>
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-3 sm:max-w-md">
                <Switch
                  label=""
                  onChange={(e) => setForm({ ...form, extra_store: e })}
                  defaultChecked={form.extra_store}
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
          </div>

          <section
            id="offer-section-cashback"
            className={`space-y-6 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
          >
            {/* Cashback management fields — grouped for easier selection */}
            <div className="space-y-2">
              <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                Cashback Management
              </h4>

              <div className="min-w-0 space-y-[18px]">
                {/* Commission entry — grouped for easier selection */}
                <div>
                  <FieldLabel
                    label="Commission (%)"
                    description={
                      form.commission_entry_mode === "auto"
                        ? "Loads the best partner rate for this merchant on the selected affiliate network (same as Commission Management), then applies −30% for the user-facing %."
                        : "Maximum % offered to users. Enter the value already reduced by 30% from the affiliate partner rate."
                    }
                  />
                  <div className="mb-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          commission_entry_mode: "auto",
                        }))
                      }
                      disabled={isLoading}
                      aria-pressed={form.commission_entry_mode === "auto"}
                      className={`${
                        form.commission_entry_mode === "auto"
                          ? COMMISSION_MODE_TOGGLE_ACTIVE
                          : COMMISSION_MODE_TOGGLE_INACTIVE
                      } touch-manipulation`}
                    >
                      Auto apply 30% fee
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          commission_entry_mode: "manual",
                        }))
                      }
                      disabled={isLoading}
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
                          <Input
                            type="text"
                            name="commission_raw"
                            value={commissionRaw}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCommissionRaw(v);
                              const n = Number(v);
                              setForm((prev) => ({
                                ...prev,
                                commission_store:
                                  v.trim() === "" || Number.isNaN(n)
                                    ? null
                                    : applyThirtyPercentFee(n),
                              }));
                            }}
                            disabled={isLoading}
                            placeholder="e.g. 10"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                            % after 30% fee
                          </p>
                          <Input
                            type="text"
                            name="commission_store"
                            value={form.commission_store ?? ""}
                            disabled
                            placeholder="—"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="min-w-0">
                        <Input
                          type="text"
                          name="commission_store"
                          value={form.commission_store ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((prev) => ({
                              ...prev,
                              commission_store: v === "" ? null : Number(v),
                            }));
                          }}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <FieldLabel
                    label="Max cap"
                    description="Maximum cap offered to users. Enter the value already reduced by 30% from the affiliate partner cap."
                  />
                  <Input
                    type="text"
                    name="max_cap"
                    onChange={(e) =>
                      setForm({ ...form, max_cap: Number(e.target.value) })
                    }
                    defaultValue={form.max_cap || ""}
                  />
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
                <div className="flex min-w-0 items-start gap-3 sm:max-w-md">
                  <Switch
                    key={`${form.id}-all-product-types`}
                    label=""
                    onChange={(e) => setForm({ ...form, all_product_types: e })}
                    defaultChecked={form.all_product_types}
                    disabled={isLoading}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      All product types
                    </p>
                    <p className="text-theme-xs text-gray-500 dark:text-gray-400">
                      Use one commission rate and tracking link for all lines.
                      Turn off to add per-row names and commission.
                    </p>
                  </div>
                </div>
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
                    <span className="font-medium">Save changes</span> at the top
                    of this section.
                  </p>
                </div>
                <div className="flex flex-col gap-4 rounded-xl border border-gray-300 bg-gray-50/50 p-4 dark:border-gray-600 dark:bg-gray-800/30">
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
                        aria-pressed={productTypeDraft.pay_in === "cashback"}
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
                          setProductTypeDraft((d) => ({ ...d, pay_in: "cash" }))
                        }
                        disabled={isLoading}
                        aria-pressed={productTypeDraft.pay_in === "cash"}
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
                              placeholder="% after 30% fee"
                              ariaLabel="% after 30% fee"
                              title="% after 30% fee"
                              value={netCommissionFromRaw(
                                productTypeDraft.commission_raw,
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

                  {/* 3rd line: Cancel + Add (bottom right) */}
                  <div className="flex justify-end gap-2">
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
                      Add
                    </button>
                  </div>
                </div>

                {/* Added product type list — committed rows; Action → Edit (re-loads the draft) / Delete */}
                {(form.product_types ?? []).length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Added product type list
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                      <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                          <tr>
                            <th className="w-8 px-2 py-2.5">
                              <span className="sr-only">Reorder</span>
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                              Name
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                              Pay in
                            </th>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                              Value
                            </th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {(form.product_types ?? []).map((row, i) => {
                            const isCash = row.pay_in === "cash";
                            const value = isCash
                              ? row.amount != null
                                ? `${row.amount} ${row.currency || ""}`.trim()
                                : "—"
                              : row.commission_info
                                ? `${row.commission_info}%`
                                : "—";
                            const isDragSource = dragSrcIndex === i;
                            const isDragTarget =
                              dragSrcIndex !== null &&
                              dragOverIndex === i &&
                              dragSrcIndex !== i;
                            return (
                              <tr
                                key={i}
                                onDragOver={(e) => {
                                  if (dragSrcIndex === null) return;
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                  if (dragOverIndex !== i) setDragOverIndex(i);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (
                                    dragSrcIndex !== null &&
                                    dragSrcIndex !== i
                                  ) {
                                    reorderProductTypeRow(dragSrcIndex, i);
                                  }
                                  setDragSrcIndex(null);
                                  setDragOverIndex(null);
                                }}
                                className={`transition-colors ${
                                  isDragSource
                                    ? "opacity-50"
                                    : isDragTarget
                                      ? "bg-brand-50 dark:bg-brand-500/10"
                                      : "bg-white dark:bg-gray-900"
                                }`}
                              >
                                <td className="w-8 px-2 py-2.5 text-center align-middle">
                                  <button
                                    type="button"
                                    aria-label="Drag to reorder"
                                    title="Drag to reorder"
                                    draggable
                                    onDragStart={(e) => {
                                      setDragSrcIndex(i);
                                      setOpenProductActionIdx(null);
                                      e.dataTransfer.effectAllowed = "move";
                                      e.dataTransfer.setData(
                                        "text/plain",
                                        String(i),
                                      );
                                    }}
                                    onDragEnd={() => {
                                      setDragSrcIndex(null);
                                      setDragOverIndex(null);
                                    }}
                                    disabled={isLoading}
                                    className="cursor-grab leading-none text-gray-400 select-none hover:text-gray-600 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300"
                                  >
                                    <span aria-hidden>⋮⋮</span>
                                  </button>
                                </td>
                                <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">
                                  {row.name || "—"}
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                    {isCash ? "Cash" : "Cashback %"}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">
                                  {value}
                                </td>
                                <td className="relative px-4 py-2.5 text-right">
                                  <div
                                    ref={
                                      openProductActionIdx === i
                                        ? productActionsRef
                                        : undefined
                                    }
                                    className="relative inline-block text-left"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setOpenProductActionIdx((cur) =>
                                          cur === i ? null : i,
                                        )
                                      }
                                      disabled={isLoading}
                                      aria-expanded={openProductActionIdx === i}
                                      aria-haspopup="true"
                                      className="inline-flex min-h-[2rem] items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                    >
                                      Action
                                      <svg
                                        className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        aria-hidden
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M19 9l-7 7-7-7"
                                        />
                                      </svg>
                                    </button>
                                    {openProductActionIdx === i && (
                                      <div
                                        className="absolute top-full right-0 z-50 mt-1 min-w-[8rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
                                        role="menu"
                                      >
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={() => editProductTypeRow(i)}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={() =>
                                            deleteProductTypeRow(i)
                                          }
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            )}
          </section>
        </section>

        <div
          className="border-t border-gray-200 dark:border-gray-700"
          aria-hidden="true"
        />

        {/* Tracking links — one per product-type row (brand / line), or single offer row */}
        <div
          id="offer-section-tracking"
          className={`rounded-xl border border-gray-200 bg-gray-50/50 p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-800/30 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
        >
          <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            Tracking links
          </h4>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Choose network and advertiser, then set the app URL users open from
            this offer. Per–product-type URLs appear when you add product lines
            below and turn off{" "}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              all product types
            </span>
            .
          </p>
          <details className="mt-2 max-w-3xl rounded-lg border border-gray-200/80 bg-white/50 px-3 py-2 text-xs text-gray-600 dark:border-gray-600 dark:bg-gray-900/30 dark:text-gray-400">
            <summary className="cursor-pointer font-medium text-gray-700 select-none dark:text-gray-300">
              How this ties to Commission Management
            </summary>
            <p className="mt-2 leading-relaxed">
              With <span className="font-medium">Product Type</span> rows (and
              without <span className="font-medium">all product types</span>),
              each line can have its own tracking URL. Otherwise the single
              field below follows the same store as Commission Management.
            </p>
          </details>
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
            <div className="min-w-0">
              <FieldLabel
                label="Affiliate partner"
                description="Network that supplies rates and tracking. Type to filter the list."
              />
              <Autocomplete<IdLabelOption, false, false, false>
                id="offer-affiliate-network"
                options={affiliateSelectOptions}
                value={selectedAffiliateOption}
                onChange={(_e, v) =>
                  setForm({ ...form, affiliate_network_id: v?.id ?? "" })
                }
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                disabled={isLoading}
                size="small"
                sx={{ mt: 0.5, width: "100%" }}
                slotProps={{
                  popper: { sx: AUTOCOMPLETE_POPPER_Z },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search network…"
                    variant="outlined"
                  />
                )}
              />
            </div>
            <div className="min-w-0">
              <FieldLabel
                label="Advertiser"
                description="Campaign / store on the network. Type to filter; drives store= when applicable."
              />
              <Autocomplete<IdLabelOption, false, false, false>
                id="offer-deeplink-advertiser"
                options={advertiserSelectOptions}
                value={selectedAdvertiserOption}
                onChange={(_e, v) =>
                  setForm({ ...form, deeplink_store_id: v?.id ?? "" })
                }
                getOptionLabel={(o) => o.label}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                disabled={isLoading}
                size="small"
                sx={{ mt: 0.5, width: "100%" }}
                slotProps={{
                  popper: { sx: AUTOCOMPLETE_POPPER_Z },
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search advertiser…"
                    variant="outlined"
                  />
                )}
              />
            </div>
          </div>
          {usePerProductTrackingLinks ? (
            <ul className="mt-4 space-y-4">
              {(form.product_types ?? []).map((row, i) => {
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
        </div>

        <div
          className="border-t border-gray-200 dark:border-gray-700"
          aria-hidden="true"
        />

        {/* Read-only: from partner / network feed */}
        <div
          id="offer-section-merch"
          className={`border-brand-200/80 bg-brand-50/50 dark:border-brand-800/60 dark:bg-brand-950/25 rounded-xl border border-dashed p-4 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
        >
          <h4 className="text-brand-900 dark:text-brand-100 text-sm font-semibold">
            Commission info from partner
          </h4>
          <p className="text-brand-800/80 dark:text-brand-200/80 mt-1 text-xs">
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

          <div className="border-brand-200/70 dark:border-brand-800/50 mt-6 border-t pt-5">
            <h4 className="text-brand-900 dark:text-brand-100 text-sm font-semibold">
              Offer tags (merchandising)
            </h4>
            <p className="text-brand-800/80 dark:text-brand-200/80 mt-1 text-xs">
              Optional labels for the offer card in the app: category, promos,
              and expiry messaging. Editable here; unrelated to partner rates
              above.
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

            <div className="mt-4 space-y-5">
              <div>
                <Switch
                  key={`${form.id}-odt-brand`}
                  label="Brand category"
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
                <p className="mt-0.5 ml-6 text-xs text-gray-600 dark:text-gray-400">
                  Partner feed category:{" "}
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {offer?.categories?.trim() ? offer.categories : "—"}
                  </span>
                  . Pick a system category below, or leave “Use partner feed” so
                  the tag uses that value.
                </p>
                {form.offer_display_tags.brand_category_enabled ? (
                  <div className="mt-2 ml-6 max-w-xl">
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
                ) : null}
              </div>

              <div>
                <Switch
                  key={`${form.id}-odt-xc`}
                  label="Extra cashback"
                  defaultChecked={form.offer_display_tags.extra_cashback_tag}
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
                <p className="mt-0.5 ml-6 text-xs text-gray-600 dark:text-gray-400">
                  Show an “extra cashback” style promo tag (separate from Upsize
                  fields below).
                </p>
                <div className="border-brand-200/70 dark:border-brand-800/50 mt-4 border-t pt-4">
                  <h5 className="text-brand-900 dark:text-brand-100 text-sm font-semibold">
                    Upsize event
                  </h5>
                  <p className="text-brand-800/80 dark:text-brand-200/80 mt-0.5 text-xs">
                    Optional period with special commission and max cap.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          upsize_product_types: [
                            ...(form.upsize_product_types ?? []),
                            { name: "", commission_info: "", deeplink: "" },
                          ],
                        })
                      }
                      disabled={isLoading}
                      className="touch-manipulation"
                    >
                      Add product line
                    </Button>
                  </div>
                  {(form.upsize_product_types ?? []).length > 0 ? (
                    <ul className="mt-3 space-y-4">
                      {(form.upsize_product_types ?? []).map((row, i) => {
                        const baseId = `offer-upsize-pt-${form.id || "new"}-${i}`;
                        return (
                          <li
                            key={i}
                            className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 sm:flex-row sm:items-stretch sm:gap-3 sm:p-3 dark:border-gray-700 dark:bg-gray-800/30"
                          >
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
                                value={row.name}
                                onChange={(e) => {
                                  const next = [
                                    ...(form.upsize_product_types ?? []),
                                  ];
                                  next[i] = {
                                    ...next[i],
                                    name: e.target.value,
                                  };
                                  setForm({
                                    ...form,
                                    upsize_product_types: next,
                                  });
                                }}
                                disabled={isLoading}
                              >
                                <option value="">Select product type…</option>
                                {upsizeProductTypeNameOptions.map((name) => (
                                  <option key={name} value={name}>
                                    {name}
                                  </option>
                                ))}
                                {row.name.trim() &&
                                !upsizeProductTypeNameOptions.includes(
                                  row.name.trim(),
                                ) ? (
                                  <option value={row.name.trim()}>
                                    {row.name.trim()} (saved — add under Product
                                    Type to pick)
                                  </option>
                                ) : null}
                              </select>
                              {upsizeProductTypeNameOptions.length === 0 ? (
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
                            </div>
                            <div className="flex shrink-0 sm:items-end sm:pb-0.5">
                              <Button
                                size="sm"
                                variant="outline"
                                type="button"
                                onClick={() => {
                                  const next = (
                                    form.upsize_product_types ?? []
                                  ).filter((_, j) => j !== i);
                                  setForm({
                                    ...form,
                                    upsize_product_types: next.length
                                      ? next
                                      : [],
                                  });
                                }}
                                disabled={isLoading}
                                className="min-h-11 w-full touch-manipulation text-red-600 hover:bg-red-50 hover:text-red-700 sm:w-auto dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                Remove
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  {showUpsizeEventPeriodFields ? (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel
                          label="Start date"
                          description="When the promo starts."
                        />
                        <Input
                          type="date"
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
                      <div>
                        <FieldLabel
                          label="End date"
                          description="When the promo ends."
                        />
                        <Input
                          type="date"
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
                      <div>
                        <FieldLabel
                          label="Special commission (%)"
                          description="Commission during the promo."
                        />
                        <Input
                          type="number"
                          name="upsize_special_commission"
                          placeholder="e.g. 10"
                          onChange={(e) =>
                            setForm({
                              ...form,
                              upsize_special_commission:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                          defaultValue={form.upsize_special_commission ?? ""}
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <FieldLabel
                          label="Max cap (upsize)"
                          description="Maximum cap offered to users during the promo. Enter the value already reduced by 30% from the affiliate partner cap."
                        />
                        <Input
                          type="number"
                          name="upsize_max_cap"
                          placeholder="e.g. 1000"
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
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <Switch
                  key={`${form.id}-odt-grab`}
                  label="Grab Coupon"
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
                <p className="mt-0.5 ml-6 text-xs text-gray-600 dark:text-gray-400">
                  Highlight that users can claim a Grab-related coupon for this
                  offer.
                </p>
              </div>

              <div>
                <Switch
                  key={`${form.id}-odt-exp`}
                  label="Expire in X days"
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
                <p className="mt-0.5 ml-6 text-xs text-gray-600 dark:text-gray-400">
                  Shows “Expire in {"{n}"} days” on the card. Set the number
                  when enabled.
                </p>
                {form.offer_display_tags.expire_in_days_enabled ? (
                  <div className="mt-2 ml-6 flex max-w-md flex-wrap items-center gap-2">
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

        <div
          className="border-t border-gray-200 dark:border-gray-700"
          aria-hidden="true"
        />

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
              <FieldLabel
                label="Terms template"
                description="Pick a starting point; edit the terms below to fit this brand."
              />
              <select
                id="offer-policy-category"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                value={form.policy_category_id}
                onChange={(e) => {
                  const v = e.target.value;
                  // Picking a source loads its terms into the editor below.
                  setForm({
                    ...form,
                    policy_category_id: v,
                    custom_terms: resolveOfferPolicyBaseTerms(
                      v,
                      offer?.categories,
                      policyCategories,
                      policiesList,
                    ),
                  });
                }}
              >
                <option value="custom">Custom T&Cs for specific shop</option>
                <option value="">
                  Automatic — use offer category ({offer?.categories ?? "—"})
                </option>
                {policyCategories.map((cat) => {
                  const policyText = policiesList[cat._id] ?? "";
                  const hasPolicy = policyText.trim().length > 0;
                  return (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                      {hasPolicy ? " — T&C configured" : " — no T&C yet"}
                    </option>
                  );
                })}
              </select>
              <div className="mt-1 border-t border-gray-200 pt-3 dark:border-gray-600">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Terms &amp; Conditions
                  </p>
                  <button
                    type="button"
                    title="Reset the editor to the default terms for the selected source"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        custom_terms: resolveOfferPolicyBaseTerms(
                          prev.policy_category_id ?? "",
                          offer?.categories,
                          policyCategories,
                          policiesList,
                        ),
                      }))
                    }
                    disabled={savingPolicy}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Back to default
                  </button>
                </div>
                <p className="text-theme-xs mb-2 text-gray-500 dark:text-gray-400">
                  Pre-filled from the source above. Edit any line to fit this
                  brand’s actual terms — this exact text is shown to users.
                </p>
                <TextArea
                  rows={12}
                  placeholder="Terms & Conditions shown to users for this brand…"
                  value={form.custom_terms}
                  onChange={(v) => setForm({ ...form, custom_terms: v })}
                  disabled={savingPolicy}
                  className="h-36 resize-none overflow-y-auto !text-xs !leading-relaxed !text-gray-700 placeholder:text-gray-400 dark:!text-gray-300"
                />
              </div>
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

        <div
          className="border-t border-gray-200 dark:border-gray-700"
          aria-hidden="true"
        />

        {/* Logos & media */}
        <section
          id="offer-section-media"
          className={`space-y-4 ${OFFER_FORM_SECTION_SCROLL_CLASS}`}
        >
          <h4 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            Logos & media
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload images for desktop, mobile, and banners. Leave empty to keep
            current.
          </p>

          <div>
            <FieldLabel
              label="Logo"
              description="Square (1:1) logo — used on both desktop and mobile."
            />
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-[320px] max-w-full shrink-0">
                <Input
                  type="file"
                  name="logo_desktop"
                  onChange={(e) => {
                    // One 1:1 logo for both surfaces: set desktop + mobile to it.
                    const file = e.target.files?.[0] || null;
                    setForm((prev) => ({
                      ...prev,
                      logo_desktop: file,
                      logo_mobile: file,
                    }));
                  }}
                />
              </div>
              {(form.logo_desktop || (openModal as Offer).logo_desktop) && (
                <RemoteOrBlobImage
                  src={
                    logoDesktopUrl ??
                    pathImage((openModal as Offer).logo_desktop)
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
              label="Brand cover"
              description="Cover image shown on the brand's shop page."
            />
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-[320px] max-w-full shrink-0">
                <Input
                  type="file"
                  name="logo_circle"
                  onChange={(e) => handleFileChange(e, "logo_circle")}
                />
              </div>
              {(form.logo_circle || (openModal as Offer).logo_circle) && (
                <RemoteOrBlobImage
                  src={
                    logoCircleUrl ?? pathImage((openModal as Offer).logo_circle)
                  }
                  alt="Preview"
                  width={256}
                  height={256}
                  className="max-h-32 min-w-0 flex-1 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
                />
              )}
            </div>
          </div>

          <div>
            <FieldLabel
              label="Banner (desktop)"
              description="Hero or banner image on desktop."
            />
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-[320px] max-w-full shrink-0">
                <Input
                  type="file"
                  name="banner"
                  onChange={(e) => handleFileChange(e, "banner")}
                />
              </div>
              {(form.banner || (openModal as Offer).banner) && (
                <RemoteOrBlobImage
                  src={bannerUrl ?? pathImage((openModal as Offer).banner)}
                  alt="Preview"
                  width={256}
                  height={256}
                  className="max-h-32 min-w-0 flex-1 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
                />
              )}
            </div>
          </div>

          <div>
            <FieldLabel
              label="Banner (mobile)"
              description="Banner image on mobile."
            />
            <div className="flex flex-wrap items-start gap-4">
              <div className="w-[320px] max-w-full shrink-0">
                <Input
                  type="file"
                  name="banner_mobile"
                  onChange={(e) => handleFileChange(e, "banner_mobile")}
                />
              </div>
              {(form.banner_mobile || (openModal as Offer).banner_mobile) && (
                <RemoteOrBlobImage
                  src={
                    bannerMobileUrl ??
                    pathImage((openModal as Offer).banner_mobile)
                  }
                  alt="Preview"
                  width={256}
                  height={256}
                  className="max-h-32 min-w-0 flex-1 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
                />
              )}
            </div>
          </div>
        </section>
      </>
    </OfferFullscreenCardShell>
  );
};

export default FormOffer;
