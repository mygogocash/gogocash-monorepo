import { useMemo, useState } from "react";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import client, { fetcher } from "@/lib/axios/client";
import { devError } from "@/lib/devConsole";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import Switch from "../form/switch/Switch";
import { Offer, OfferRequestForm, type OfferDisplayTags } from "@/types/api";
import { pathImage } from "@/utils/helper";
import { useDataSession } from "@/hooks/useDataSession";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ResCategoryList } from "@/types/category";
import { DEEPLINK_STORE_OPTIONS } from "@/data/deeplinkStores";
import { AFFILIATE_NETWORKS, affiliateNetworkIdForOfferId } from "@/data/affiliateNetworks";
import { buildSuggestedAppDeeplink } from "@/lib/offerDeeplink";
import { COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY } from "@/lib/query/offersQueries";
import { OfferFullscreenCardShell } from "./OfferFullscreenCardShell";

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

function FieldLabel({ label, description }: { label: string; description: string }) {
  return (
    <div className="mb-1.5">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

/** Preview pills for the “Offer tags” block (kept pure for clarity and reuse). */
function buildOfferTagPreviewChips(tags: OfferDisplayTags, offer: Offer | null): string[] {
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
  const circleSrc = form.logo_circle
    ? URL.createObjectURL(form.logo_circle)
    : pathImage(circlePersisted || null);
  const desktopSrc = form.logo_desktop
    ? URL.createObjectURL(form.logo_desktop)
    : pathImage((offer.logo_desktop || "").trim() || null);
  const mobileSrc = form.logo_mobile
    ? URL.createObjectURL(form.logo_mobile)
    : pathImage((offer.logo_mobile || "").trim() || null);

  const meta = [
    { label: "Offer ID", value: offer._id },
    { label: "Lookup slug", value: offer.lookup_value?.trim() || "—" },
    { label: "Category", value: offer.categories?.trim() || "—" },
    { label: "Partner offer name", value: offer.offer_name?.trim() || "—" },
  ] as const;

  return (
    <section className="rounded-xl border border-brand-200/80 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
        Brand reference
      </h4>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
        Logos and feed identifiers so you can confirm the correct brand or branch before editing.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Circle</span>
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-900">
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
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Desktop</span>
          <div className="flex h-16 max-w-[200px] items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white px-2 dark:border-gray-600 dark:bg-gray-900">
            {desktopSrc.trim() ? (
              <RemoteOrBlobImage
                src={desktopSrc}
                alt="Brand logo, desktop"
                width={256}
                height={128}
                className="max-h-14 max-w-full object-contain"
              />
            ) : (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">No image</span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Mobile</span>
          <div className="flex h-16 max-w-[200px] items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white px-2 dark:border-gray-600 dark:bg-gray-900">
            {mobileSrc.trim() ? (
              <RemoteOrBlobImage
                src={mobileSrc}
                alt="Brand logo, mobile"
                width={256}
                height={128}
                className="max-h-14 max-w-full object-contain"
              />
            ) : (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">No image</span>
            )}
          </div>
        </div>
      </div>
      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        {meta.map(({ label, value }) => (
          <div key={label} className="min-w-0">
            <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="mt-0.5 break-all font-medium text-gray-800 dark:text-gray-200">
              {value}
            </dd>
          </div>
        ))}
      </dl>
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
  const offer = openModal && typeof openModal === "object" ? openModal : null;
  const networkId = offer
    ? form.affiliate_network_id.trim() || affiliateNetworkIdForOfferId(offer._id)
    : "";

  const { data: brandsRes } = useQuery({
    queryKey: [...COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY, networkId],
    queryFn: async () => {
      const { data } = await client.get<{ data: { id: string; appDeeplink: string }[] }>(
        "/admin/commission-management/brands",
        { params: { networkId } },
      );
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
      form.affiliate_network_id.trim() || affiliateNetworkIdForOfferId(offer._id);
    return buildSuggestedAppDeeplink(offer, nw, form.commission_store, form.deeplink_store_id);
  }, [offer, form.affiliate_network_id, form.commission_store, form.deeplink_store_id]);

  /** Per-line tracking URLs only when there are product-type rows and “all product types” is off. */
  const usePerProductTrackingLinks =
    (form.product_types ?? []).length > 0 && !form.all_product_types;

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
  }, [deeplinkOverride, offer, serverSuggestedDeeplink, partnerPreviewDeeplink]);

  const saveOfferDeeplink = useMutation({
    mutationFn: async (payload: { offerId: string; deeplink: string }) => {
      const { data } = await client.patch<{ success: boolean }>(
        "/admin/commission-management/deeplink",
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMISSION_MANAGEMENT_BRANDS_ROOT_QUERY_KEY });
    },
  });

  const { data: policyCategories = [], isPending: policyCategoriesPending } = useQuery<
    ResCategoryList[]
  >({
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
      formData.append("upsize_special_commission", String(form.upsize_special_commission));
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
    formData.append("upsize_product_types", JSON.stringify(upsizeProductTypeRows));
    const productTypeRows = form.all_product_types
      ? []
      : (form.product_types ?? [])
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
    formData.append("affiliate_network_id", form.affiliate_network_id.trim() || "involve_asia");
    formData.append("deeplink_store_id", form.deeplink_store_id.trim() || "global");
    formData.append("offer_display_tags", JSON.stringify(form.offer_display_tags));
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
              await saveOfferDeeplink.mutateAsync({ offerId: form.id, deeplink: d });
            } catch {
              toast.error("Offer saved, but tracking link could not be synced.");
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

  return (
    <Modal
      isOpen={Boolean(openModal)}
      onClose={() => setOpenModal(false)}
      isFullscreen
      showCloseButton={false}
      className="p-0"
    >
      <OfferFullscreenCardShell
        header={
          <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit offer
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Update basic info, policy source, promo period, and media. Partner commission details below are read-only (from the network).
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setOpenModal(false)}
                disabled={isLoading}
              >
                Close
              </Button>
              <Button
                size="sm"
                type="button"
                disabled={isLoading}
                onClick={handleSave}
                startIcon={
                  isLoading ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-600" />
                  ) : null
                }
              >
                Save changes
              </Button>
            </div>
          </div>
        }
      >
        {offer ? <FormOfferBrandReferenceStrip offer={offer} form={form} /> : null}

        {/* Tracking links — one per product-type row (brand / line), or single offer row */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Tracking Links
          </h4>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Tracking link for each brand or product line. With{" "}
            <span className="font-medium">Product Type</span> rows below (and without{" "}
            <span className="font-medium">all product types</span>), each line gets its own URL;
            otherwise the default below uses the same store as Commission Management.
          </p>
          <div className="mt-4">
            <FieldLabel
              label="Affiliate partner"
              description="Performance network for this offer (Involve Asia, Optimise, Accesstrade)."
            />
            <select
              id="offer-affiliate-network"
              className="w-full max-w-xl rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              value={form.affiliate_network_id}
              onChange={(e) => setForm({ ...form, affiliate_network_id: e.target.value })}
              disabled={isLoading}
            >
              {AFFILIATE_NETWORKS.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4">
            <FieldLabel
              label="Advertiser"
              description="Campaign-style advertiser (e.g. Banana IT TH CPS). Adds store= to the tracking link unless Default / other."
            />
            <select
              id="offer-deeplink-advertiser"
              className="w-full max-w-xl rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              value={form.deeplink_store_id}
              onChange={(e) => setForm({ ...form, deeplink_store_id: e.target.value })}
              disabled={isLoading}
            >
              {DEEPLINK_STORE_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          {usePerProductTrackingLinks ? (
            <ul className="mt-4 space-y-4">
              {(form.product_types ?? []).map((row, i) => {
                const label = row.name.trim() || `Brand / product line ${i + 1}`;
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
                    offer ? { offerId: offer._id, value: e.target.value } : null,
                  )
                }
                disabled={isLoading || saveOfferDeeplink.isPending}
                autoComplete="off"
              />
            </div>
          )}
        </div>

        {/* Brand info */}
        <section className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Brand Info
          </h4>
          <div>
            <FieldLabel
              label="Name of offer"
              description="Display name shown to users in the app."
            />
            <Input
              type="text"
              name="offer_name_display"
              onChange={(e) => setForm({ ...form, offer_name_display: e.target.value })}
              defaultValue={form.offer_name_display}
            />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <Switch
                label="Disabled offer"
                onChange={(e) => setForm({ ...form, disabled: e })}
                defaultChecked={form.disabled}
              />
              <p className="ml-6 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Hide this offer from users.
              </p>
            </div>
            <div>
              <Switch
                label="Top Brands"
                onChange={(e) => setForm({ ...form, extra_store: e })}
                defaultChecked={form.extra_store}
              />
              <p className="ml-6 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Highlight this offer in top-brand placements in the app.
              </p>
            </div>
          </div>

          <div>
            <FieldLabel
              label="Commission (%)"
              description="Maximum % offered to users. Enter the value already reduced by 30% from the affiliate partner rate."
            />
            <Input
              type="text"
              name="commission_store"
              onChange={(e) => setForm({ ...form, commission_store: Number(e.target.value) })}
              defaultValue={form.commission_store || ""}
            />
            <div className="mt-3">
              <Switch
                key={`${form.id}-all-product-types`}
                label="All product types"
                onChange={(e) => setForm({ ...form, all_product_types: e })}
                defaultChecked={form.all_product_types}
                disabled={isLoading}
              />
              <p className="ml-6 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Use one commission rate and tracking link for all lines. Turn off to add per-row
                names and commission.
              </p>
            </div>
          </div>

        {/* Product Type — stacked on small screens; 44px+ touch targets; 16px text on mobile avoids iOS input zoom */}
        <section className="space-y-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Product Type
            </h4>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              <Button
                size="sm"
                type="button"
                disabled={isLoading}
                onClick={handleSave}
                className="min-h-11 w-full touch-manipulation sm:w-auto sm:shrink-0"
                startIcon={
                  isLoading ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-600" />
                  ) : null
                }
              >
                Save changes
              </Button>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    product_types: [
                      ...(form.product_types ?? []),
                      { name: "", commission_info: "", deeplink: "" },
                    ],
                  })
                }
                disabled={isLoading || form.all_product_types}
                className="min-h-11 w-full touch-manipulation sm:w-auto sm:shrink-0"
              >
                Add
              </Button>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {form.all_product_types
              ? "Turn off all product types under Commission (%) to add per-line names and commission."
              : (
                  <>
                    Add a row for each product type with its name and commission info, then use{" "}
                    <span className="font-medium">Save changes</span> here or in the header to
                    persist.
                  </>
                )}
          </p>
          {!form.all_product_types && (form.product_types ?? []).length > 0 && (
            <ul className="space-y-4">
              {(form.product_types ?? []).map((row, i) => {
                const baseId = `offer-pt-${form.id || "new"}-${i}`;
                return (
                  <li
                    key={i}
                    className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30 sm:flex-row sm:items-stretch sm:gap-3 sm:p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`${baseId}-name`}
                        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Product type name
                      </label>
                      <Input
                        id={`${baseId}-name`}
                        type="text"
                        placeholder="e.g. Electronics"
                        value={row.name}
                        onChange={(e) => {
                          const next = [...(form.product_types ?? [])];
                          next[i] = { ...next[i], name: e.target.value };
                          setForm({ ...form, product_types: next });
                        }}
                        disabled={isLoading}
                        autoComplete="off"
                        enterKeyHint="next"
                        className="min-h-11 min-w-0 w-full touch-manipulation !text-base sm:!text-sm"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`${baseId}-commission`}
                        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Commission info (-30% from affiliate partner)
                      </label>
                      <TextArea
                        id={`${baseId}-commission`}
                        rows={1}
                        placeholder="e.g. 5% on new customers"
                        value={row.commission_info}
                        onChange={(v) => {
                          const next = [...(form.product_types ?? [])];
                          next[i] = { ...next[i], commission_info: v };
                          setForm({ ...form, product_types: next });
                        }}
                        disabled={isLoading}
                        className="h-11 min-h-11 max-h-11 resize-none overflow-y-auto touch-manipulation !text-base !text-gray-800 placeholder:text-gray-400 dark:!text-white/90 sm:!text-sm"
                      />
                    </div>
                    <div className="flex shrink-0 sm:items-end sm:pb-0.5">
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          const next = (form.product_types ?? []).filter((_, j) => j !== i);
                          setForm({ ...form, product_types: next.length ? next : undefined });
                        }}
                        disabled={isLoading}
                        className="min-h-11 w-full touch-manipulation text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 sm:w-auto"
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

          <div>
            <FieldLabel
              label="Max cap"
              description="Maximum cap offered to users. Enter the value already reduced by 30% from the affiliate partner cap."
            />
            <Input
              type="text"
              name="max_cap"
              onChange={(e) => setForm({ ...form, max_cap: Number(e.target.value) })}
              defaultValue={form.max_cap || ""}
            />
          </div>

          <div>
            <FieldLabel
              label="Note to user"
              description="Optional message shown to customers in the app for this offer (e.g. promo timing, eligibility). Leave empty to hide."
            />
            <TextArea
              rows={4}
              placeholder="e.g. Bonus cashback until 31 Dec · new users only"
              value={form.note_to_user}
              onChange={(v) => setForm({ ...form, note_to_user: v })}
              disabled={isLoading}
              className="min-h-[5.5rem] resize-y !text-base !text-gray-800 placeholder:text-gray-400 dark:!text-white/90 sm:!text-sm"
            />
          </div>

          {/* Read-only: from partner / network feed */}
          <div className="rounded-xl border border-dashed border-brand-200/80 bg-brand-50/50 p-4 dark:border-brand-800/60 dark:bg-brand-950/25">
            <h4 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
              Commission info from partner
            </h4>
            <p className="mt-1 text-xs text-brand-800/80 dark:text-brand-200/80">
              Structured terms as supplied by the partner or affiliate network. This does not change when you edit “Commission (%)” or “Max cap” above — partner max cap is separate and read-only here.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Tracking model
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {offer?.commission_tracking?.trim() ? offer.commission_tracking : "—"}
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
                  {offer?.currency?.trim() ? offer.currency : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Payment terms
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {typeof offer?.payment_terms === "number" ? `${offer.payment_terms} days` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Validation terms
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {typeof offer?.validation_terms === "number" ? `${offer.validation_terms} days` : "—"}
                </dd>
              </div>
            </dl>
            {Array.isArray(offer?.special_commissions) && offer.special_commissions.length > 0 ? (
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Special commissions: </span>
                {offer.special_commissions.length} tier(s) — see partner portal for full rules.
              </p>
            ) : null}

            <div className="mt-6 border-t border-brand-200/70 pt-5 dark:border-brand-800/50">
              <h4 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
                Offer tags (merchandising)
              </h4>
              <p className="mt-1 text-xs text-brand-800/80 dark:text-brand-200/80">
                Optional labels for the offer card in the app: category, promos, and expiry messaging. Editable
                here; unrelated to partner rates above.
              </p>
              {offerTagPreviewChips.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {offerTagPreviewChips.map((c, i) => (
                    <span
                      key={`tag-preview-${i}`}
                      className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-brand-900 shadow-sm dark:bg-brand-950/60 dark:text-brand-100"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-brand-800/70 dark:text-brand-200/70">
                  No tags enabled — use the toggles below to show pills in the app.
                </p>
              )}

              <div className="mt-4 space-y-5">
                <div>
                  <Switch
                    key={`${form.id}-odt-brand`}
                    label="Brand category"
                    defaultChecked={form.offer_display_tags.brand_category_enabled}
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
                  <p className="ml-6 mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                    Partner feed category:{" "}
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {offer?.categories?.trim() ? offer.categories : "—"}
                    </span>
                    . Pick a system category below, or leave “Use partner feed” so the tag uses that value.
                  </p>
                  {form.offer_display_tags.brand_category_enabled ? (
                    <div className="ml-6 mt-2 max-w-xl">
                      <label htmlFor="offer_tag_brand_category" className="sr-only">
                        Brand category tag
                      </label>
                      <select
                        id="offer_tag_brand_category"
                        name="offer_tag_brand_category"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-theme-xs dark:border-gray-600 dark:bg-gray-900 dark:text-white"
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
                          {offer?.categories?.trim() ? ` (${offer.categories.trim()})` : ""}
                        </option>
                        {legacyBrandCategoryLabel ? (
                          <option value={legacyBrandCategoryLabel}>
                            {legacyBrandCategoryLabel} (not in category list — choose a listed value to
                            replace)
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
                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                          No categories in the system yet. Add them under Category Management, or use
                          partner feed.
                        </p>
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
                  <p className="ml-6 mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                    Show an “extra cashback” style promo tag (separate from Upsize fields below).
                  </p>
                  <div className="mt-4 border-t border-brand-200/70 pt-4 dark:border-brand-800/50">
                    <h5 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
                      Upsize event
                    </h5>
                    <p className="mt-0.5 text-xs text-brand-800/80 dark:text-brand-200/80">
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
                              className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30 sm:flex-row sm:items-stretch sm:gap-3 sm:p-3"
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
                                  className="min-h-11 w-full min-w-0 touch-manipulation rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 shadow-theme-xs dark:border-gray-600 dark:bg-gray-900 dark:text-white sm:text-sm"
                                  value={row.name}
                                  onChange={(e) => {
                                    const next = [...(form.upsize_product_types ?? [])];
                                    next[i] = { ...next[i], name: e.target.value };
                                    setForm({ ...form, upsize_product_types: next });
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
                                  !upsizeProductTypeNameOptions.includes(row.name.trim()) ? (
                                    <option value={row.name.trim()}>
                                      {row.name.trim()} (saved — add under Product Type to pick)
                                    </option>
                                  ) : null}
                                </select>
                                {upsizeProductTypeNameOptions.length === 0 ? (
                                  <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                    Add named lines under{" "}
                                    <span className="font-medium">Brand Info → Product Type</span>{" "}
                                    first, or turn off{" "}
                                    <span className="font-medium">all product types</span> if those
                                    rows are hidden.
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 sm:items-end sm:pb-0.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  type="button"
                                  onClick={() => {
                                    const next = (form.upsize_product_types ?? []).filter(
                                      (_, j) => j !== i,
                                    );
                                    setForm({
                                      ...form,
                                      upsize_product_types: next.length ? next : [],
                                    });
                                  }}
                                  disabled={isLoading}
                                  className="min-h-11 w-full touch-manipulation text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 sm:w-auto"
                                >
                                  Remove
                                </Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <FieldLabel label="Start date" description="When the promo starts." />
                        <Input
                          type="date"
                          name="upsize_start_date"
                          onChange={(e) =>
                            setForm({ ...form, upsize_start_date: e.target.value || null })
                          }
                          defaultValue={form.upsize_start_date ?? ""}
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <FieldLabel label="End date" description="When the promo ends." />
                        <Input
                          type="date"
                          name="upsize_end_date"
                          onChange={(e) =>
                            setForm({ ...form, upsize_end_date: e.target.value || null })
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
                                e.target.value === "" ? null : Number(e.target.value),
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
                              upsize_max_cap: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                          defaultValue={form.upsize_max_cap ?? ""}
                          disabled={isLoading}
                        />
                      </div>
                    </div>
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
                  <p className="ml-6 mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                    Highlight that users can claim a Grab-related coupon for this offer.
                  </p>
                </div>

                <div>
                  <Switch
                    key={`${form.id}-odt-exp`}
                    label='Expire in X days'
                    defaultChecked={form.offer_display_tags.expire_in_days_enabled}
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
                  <p className="ml-6 mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                    Shows “Expire in {"{n}"} days” on the card. Set the number when enabled.
                  </p>
                  {form.offer_display_tags.expire_in_days_enabled ? (
                    <div className="ml-6 mt-2 flex max-w-md flex-wrap items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Expire in</span>
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
                      <span className="text-sm text-gray-600 dark:text-gray-400">days</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Policy (T&C source) */}
        <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/40">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Terms &amp; conditions (policy)
          </h4>
          <FieldLabel
            label="Which category policy applies"
            description="Pick the category whose terms you configured under Policy Management. “Automatic” uses this offer’s own category label to resolve T&C in the app."
          />
          <select
            id="offer-policy-category"
            className="w-full max-w-xl rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            value={form.policy_category_id}
            onChange={(e) => setForm({ ...form, policy_category_id: e.target.value })}
          >
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
          {form.policy_category_id ? (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Saving will pin this offer to the selected category’s policy text. Users should see that category’s terms when engaging with this offer (per your app implementation).
            </p>
          ) : (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              No override: the app can match <span className="font-medium">{offer?.categories ?? "—"}</span> to a category and load its policy.
            </p>
          )}
          <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-600">
            <FieldLabel
              label="Custom terms (this merchant)"
              description="Optional terms for this offer only, shown in addition to the category policy above. Use for merchant-specific rules or legal supplements; your app should merge or append with Policy Management text."
            />
            <TextArea
              rows={5}
              placeholder="e.g. Brand-specific eligibility · stacked promotions not allowed · see partner site for full rules"
              value={form.custom_terms}
              onChange={(v) => setForm({ ...form, custom_terms: v })}
              disabled={isLoading}
              className="min-h-[6rem] resize-y !text-base !text-gray-800 placeholder:text-gray-400 dark:!text-white/90 sm:!text-sm"
            />
          </div>
        </section>

        {/* Logos & media */}
        <section className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Logos & media
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Upload images for desktop, mobile, and banners. Leave empty to keep current.
          </p>

          <div>
            <FieldLabel label="Logo (desktop)" description="Main logo for desktop layout." />
            <Input
              type="file"
              name="logo_desktop"
              onChange={(e) => handleFileChange(e, "logo_desktop")}
            />
            {(form.logo_desktop || (openModal as Offer).logo_desktop) && (
              <RemoteOrBlobImage
                src={
                  form.logo_desktop
                    ? URL.createObjectURL(form.logo_desktop)
                    : pathImage((openModal as Offer).logo_desktop)
                }
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            )}
          </div>

          <div>
            <FieldLabel label="Logo (mobile)" description="Logo for mobile layout." />
            <Input
              type="file"
              name="logo_mobile"
              onChange={(e) => handleFileChange(e, "logo_mobile")}
            />
            {(form.logo_mobile || (openModal as Offer).logo_mobile) && (
              <RemoteOrBlobImage
                src={
                  form.logo_mobile
                    ? URL.createObjectURL(form.logo_mobile)
                    : pathImage((openModal as Offer).logo_mobile)
                }
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            )}
          </div>

          <div>
            <FieldLabel label="Banner (desktop)" description="Hero or banner image on desktop." />
            <Input
              type="file"
              name="banner"
              onChange={(e) => handleFileChange(e, "banner")}
            />
            {(form.banner || (openModal as Offer).banner) && (
              <RemoteOrBlobImage
                src={
                  form.banner
                    ? URL.createObjectURL(form.banner)
                    : pathImage((openModal as Offer).banner)
                }
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            )}
          </div>

          <div>
            <FieldLabel label="Banner (mobile)" description="Banner image on mobile." />
            <Input
              type="file"
              name="banner_mobile"
              onChange={(e) => handleFileChange(e, "banner_mobile")}
            />
            {(form.banner_mobile || (openModal as Offer).banner_mobile) && (
              <RemoteOrBlobImage
                src={
                  form.banner_mobile
                    ? URL.createObjectURL(form.banner_mobile)
                    : pathImage((openModal as Offer).banner_mobile)
                }
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            )}
          </div>

          <div>
            <FieldLabel label="Logo (circle)" description="Circular or avatar-style logo." />
            <Input
              type="file"
              name="logo_circle"
              onChange={(e) => handleFileChange(e, "logo_circle")}
            />
            {(form.logo_circle || (openModal as Offer).logo_circle) && (
              <RemoteOrBlobImage
                src={
                  form.logo_circle
                    ? URL.createObjectURL(form.logo_circle)
                    : pathImage((openModal as Offer).logo_circle)
                }
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            )}
          </div>
        </section>
      </OfferFullscreenCardShell>
    </Modal>
  );
};

export default FormOffer;
