import { CouponRequestForm } from "@/types/coupon";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import TimeFieldHM from "../form/input/TimeFieldHM";
import Switch from "../form/switch/Switch";
import client, { fetcher } from "@/lib/axios/client";
import { useDataSession } from "@/hooks/useDataSession";
import { fetchOffersList, offersListQueryKey } from "@/lib/query/offersQueries";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { Fragment, useMemo, useState } from "react";
import { Offer, OffersQuery } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { devError } from "@/lib/devConsole";
import {
  brandSearchOptionLabel,
  formatOfferCountries,
  getOfferDisplayName,
} from "@/lib/offerDisplay";
import { parseAmount, validateOptionalAmount } from "@/lib/formValidation";
import { buildCouponSubmitPayload } from "@/lib/couponSubmitPayload";
import { isDirty } from "@/lib/isDirty";
import { toDateInputValue } from "@/lib/dateFormat";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { OFFER_THUMB_SIZES } from "@/components/offer/offerMedia";
import { TrashBinIcon } from "@/icons";
import { pathImage } from "@/utils/helper";
import { SUPPORT_BUTTON_CLASS } from "@/components/ui/button/SupportButton";

const COUPON_FIELD_INPUT_WIDTH = "w-[316px] shrink-0";
const DISCOUNT_MODE_TOGGLE_ACTIVE =
  "inline-flex h-7 items-center justify-center rounded-lg border border-brand-500 bg-brand-500 px-3 text-xs font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-300";
const DISCOUNT_MODE_TOGGLE_INACTIVE = `${SUPPORT_BUTTON_CLASS} transition disabled:cursor-not-allowed disabled:opacity-50`;

type BrandSelectOption = {
  id: string;
  label: string;
  offer: Offer;
};

type CouponSelectedBrand = {
  id: string;
  name: string;
  category: string;
  country: string;
  logo: string;
};

const BRAND_AUTOCOMPLETE_POPPER_Z = 100002;

function offerToSelectedBrand(offer: Offer): CouponSelectedBrand {
  return {
    id: offer._id,
    name: getOfferDisplayName(offer),
    category: offer.categories || "Uncategorized",
    country: formatOfferCountries(offer.countries),
    logo: offer.logo_desktop ?? "",
  };
}

function brandIdsEqual(a: CouponSelectedBrand[], b: CouponSelectedBrand[]) {
  if (a.length !== b.length) return false;
  return a.every((brand, index) => brand.id === b[index]?.id);
}

interface IProp {
  fetchData: () => void;
  openModal: boolean | CouponRequestForm;
  setOpenModal: React.Dispatch<
    React.SetStateAction<boolean | CouponRequestForm>
  >;
  form: CouponRequestForm;
  setForm: React.Dispatch<React.SetStateAction<CouponRequestForm>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  showOfferField?: boolean;
}
const FormCoupon = ({
  showOfferField,
  fetchData,
  openModal,
  setOpenModal,
  form,
  setForm,
  isLoading,
  setIsLoading,
}: IProp) => {
  const session = useDataSession();
  const [brandSearch, setBrandSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<BrandSelectOption | null>(
    null,
  );
  const [selectedBrands, setSelectedBrands] = useState<CouponSelectedBrand[]>(
    [],
  );
  const [startDateType, setStartDateType] = useState<"date" | "text">(() =>
    form.start_date ? "date" : "text",
  );
  const [endDateType, setEndDateType] = useState<"date" | "text">(() =>
    form.end_date ? "date" : "text",
  );

  const couponModalOpen = Boolean(openModal);

  const brandListQuery = useMemo<OffersQuery>(
    () => ({
      search: brandSearch.trim(),
      limit: 100,
      page: 1,
      country: "",
    }),
    [brandSearch],
  );

  const { data: brandOffers, isFetching: isFetchingBrands } = useQuery({
    queryKey: offersListQueryKey(brandListQuery),
    queryFn: () => fetchOffersList(brandListQuery),
    enabled: couponModalOpen && Boolean(showOfferField),
    staleTime: 30_000,
  });

  const { data: offerDetail } = useQuery<Offer>({
    queryKey: ["getOffersDetailData", form?.offer_id],
    queryFn: () => fetcher(`/offer/${form?.offer_id}`),
    enabled: !!form?.offer_id,
    // refetchOnWindowFocus: true,
    // refetchOnMount: true,
    // refetchOnReconnect: true,
  });

  // Re-baseline the form on each open/close transition (captures the loaded
  // coupon when the modal opens, or the empty defaults for a create) using
  // React's "adjust state during render" pattern — runs at most once per
  // transition, so Save stays disabled until the user actually changes a field.
  const [baseline, setBaseline] = useState<{
    open: boolean;
    form: CouponRequestForm;
    brands: CouponSelectedBrand[];
  }>(() => ({ open: couponModalOpen, form, brands: [] }));
  if (baseline.open !== couponModalOpen) {
    setBaseline({ open: couponModalOpen, form, brands: selectedBrands });
  }

  const hasUnsavedChanges =
    isDirty(form, baseline.form) ||
    !brandIdsEqual(selectedBrands, baseline.brands);

  const brandOptions = useMemo(() => {
    const byId = new Map<string, BrandSelectOption>();
    for (const offer of brandOffers?.data ?? []) {
      byId.set(offer._id, {
        id: offer._id,
        label: brandSearchOptionLabel(offer),
        offer,
      });
    }
    if (offerDetail?._id && !byId.has(offerDetail._id)) {
      byId.set(offerDetail._id, {
        id: offerDetail._id,
        label: brandSearchOptionLabel(offerDetail),
        offer: offerDetail,
      });
    }
    return Array.from(byId.values());
  }, [brandOffers?.data, offerDetail]);

  function syncPrimaryOfferId(brands: CouponSelectedBrand[]) {
    setForm((current) => ({
      ...current,
      offer_id: brands[0]?.id ?? "",
    }));
  }

  function addSelectedBrand(offer: Offer) {
    const brand = offerToSelectedBrand(offer);
    setSelectedBrands((current) => {
      if (current.some((item) => item.id === brand.id)) {
        toast.error("This brand is already in the list.");
        return current;
      }
      const next = [...current, brand];
      syncPrimaryOfferId(next);
      return next;
    });
    setSelectedBrand(null);
    setBrandSearch("");
  }

  function removeSelectedBrand(id: string) {
    setSelectedBrands((current) => {
      const next = current.filter((brand) => brand.id !== id);
      syncPrimaryOfferId(next);
      return next;
    });
  }

  function closeModal() {
    setOpenModal(false);
  }

  const [modalOpenSync, setModalOpenSync] = useState(couponModalOpen);
  if (modalOpenSync !== couponModalOpen) {
    setModalOpenSync(couponModalOpen);
    if (couponModalOpen) {
      setStartDateType(form.start_date ? "date" : "text");
      setEndDateType(form.end_date ? "date" : "text");
    } else {
      setBrandSearch("");
      setSelectedBrand(null);
      setSelectedBrands([]);
      setStartDateType("text");
      setEndDateType("text");
    }
  }

  const [brandSyncOfferId, setBrandSyncOfferId] = useState<string | null>(null);
  const shouldSyncBrand =
    couponModalOpen &&
    Boolean(offerDetail?._id) &&
    form.offer_id === offerDetail?._id;
  if (shouldSyncBrand && brandSyncOfferId !== offerDetail!._id) {
    const brand = offerToSelectedBrand(offerDetail!);
    setSelectedBrands([brand]);
    setBaseline((current) =>
      current.open === couponModalOpen ? { ...current, brands: [brand] } : current,
    );
    setBrandSyncOfferId(offerDetail!._id);
  }
  if (!shouldSyncBrand && brandSyncOfferId !== null) {
    setBrandSyncOfferId(null);
  }

  // Save handler
  const handleSave = () => {
    const discount = parseAmount(form.discount);
    if (discount == null || discount < 0) {
      toast.error("Discount must be a number (0 or greater).");
      return;
    }
    const quantity = form.unlimited_amount_enabled
      ? 0
      : parseAmount(form.available_code_amount);
    if (
      !form.unlimited_amount_enabled &&
      !String(form.available_code_amount ?? "").trim()
    ) {
      toast.error("Enter the available code amount.");
      return;
    }
    if (
      !form.unlimited_amount_enabled &&
      (quantity == null || quantity < 1 || !Number.isInteger(quantity))
    ) {
      toast.error("Available code amount must be a whole number (1 or greater).");
      return;
    }
    if (form.min_spend_enabled && !String(form.min_spend).trim()) {
      toast.error("Enter a minimum spend amount.");
      return;
    }
    const minSpendError = form.min_spend_enabled
      ? validateOptionalAmount(form.min_spend, "Minimum spend", false)
      : null;
    if (minSpendError) {
      toast.error(minSpendError);
      return;
    }
    if (form.max_cap_enabled && !String(form.max_cap ?? "").trim()) {
      toast.error("Enter a max cap amount.");
      return;
    }
    const maxCapError = form.max_cap_enabled
      ? validateOptionalAmount(form.max_cap, "Max cap", false)
      : null;
    if (maxCapError) {
      toast.error(maxCapError);
      return;
    }
    if (form.code_enabled && !String(form.code).trim()) {
      toast.error("Enter a coupon code.");
      return;
    }
    if (
      !form.one_time_use_enabled &&
      !String(form.usage_per_user ?? "").trim()
    ) {
      toast.error("Enter how many times each user can use this code.");
      return;
    }
    const usagePerUser = !form.one_time_use_enabled
      ? parseAmount(form.usage_per_user)
      : 1;
    if (
      !form.one_time_use_enabled &&
      (usagePerUser == null ||
        usagePerUser < 1 ||
        !Number.isInteger(usagePerUser))
    ) {
      toast.error("Usage per user must be a whole number (1 or greater).");
      return;
    }
    if (showOfferField && selectedBrands.length === 0) {
      toast.error("Add at least one brand for this coupon.");
      return;
    }

    const payload = buildCouponSubmitPayload(form, { discount, quantity });

    setIsLoading(true);
    client
      .post(`/offer/update-coupon`, payload, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      })
      .then(() => {
        fetchData();
        closeModal();
        setIsLoading(false);
        toast.success("Coupon saved successfully");
      })
      .catch((err) => {
        setIsLoading(false);
        devError("Failed to save coupon:", err);
        const message =
          err?.response?.data?.message ??
          (Array.isArray(err?.response?.data?.message)
            ? err.response.data.message.join(", ")
            : null);
        toast.error(
          typeof message === "string" && message.trim()
            ? message
            : "Could not save coupon. Please try again.",
        );
      });
  };

  const dataForm: {
    filedName: string;
    type: string;
    label?: string;
    placeholder?: string;
    description?: string;
  }[] = [
    {
      filedName: "name",
      type: "text",
      description: "Display name of the coupon shown to users in the app.",
    },
    {
      filedName: "link",
      type: "text",
      placeholder: "https://example.com/promo",
      description:
        "Optional URL where users go when they open this coupon in the app (e.g. a brand promo or terms page).",
    },
    {
      filedName: "eligibility",
      type: "text",
      description:
        "Who can use it (e.g. new users, all users, first order only).",
    },
    {
      filedName: "description",
      type: "textarea",
      description:
        "Short text explaining the coupon terms, conditions or offer details.",
    },
  ];

  const brandPickerFields = showOfferField ? (
    <div className="w-full space-y-4">
      <div>
        <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          BRAND NAME
        </p>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Search and add brands available for this coupon setup.
        </p>
        <Autocomplete
          options={brandOptions}
          value={selectedBrand}
          inputValue={brandSearch}
          loading={isFetchingBrands}
          openOnFocus
          filterOptions={(options) => options}
          getOptionLabel={(opt) => opt.label}
          getOptionKey={(opt) => opt.id}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          renderOption={(props, option) => {
            const { key: _key, ...optionProps } = props;
            return (
              <li {...optionProps} key={option.id}>
                {option.label}
              </li>
            );
          }}
          noOptionsText={
            isFetchingBrands ? "Loading brands…" : "No brands found"
          }
          slotProps={{
            popper: {
              sx: { zIndex: BRAND_AUTOCOMPLETE_POPPER_Z },
            },
          }}
          sx={{ width: "100%", borderRadius: "0.5rem" }}
          renderInput={(params) => (
            <TextField {...params} placeholder="Search brand name…" />
          )}
          onInputChange={(_event, value, reason) => {
            if (reason === "input") setBrandSearch(value);
            if (reason === "clear") {
              setBrandSearch("");
              setSelectedBrand(null);
            }
          }}
          onChange={(_event, value) => {
            if (!value) return;
            addSelectedBrand(value.offer);
          }}
        />
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
          SELECTED BRANDS
        </p>
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Brands included in this coupon setup.
        </p>
        {selectedBrands.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No brands selected yet. Use the search field above to add one.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                  >
                    #
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                  >
                    Offer
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                  >
                    Country
                  </th>
                  <th
                    scope="col"
                    className="w-16 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {selectedBrands.map((brand, index) => {
                  const logoSrc = pathImage(brand.logo);
                  return (
                    <tr
                      key={brand.id}
                      className="bg-white dark:bg-gray-900"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-gray-100">
                        {index + 1}
                      </td>
                      <td className="min-w-0 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12">
                            {logoSrc ? (
                              <RemoteOrBlobImage
                                className="h-10 w-10 rounded-lg object-cover sm:h-12 sm:w-12"
                                src={logoSrc}
                                alt={brand.name}
                                width={48}
                                height={48}
                                sizes={OFFER_THUMB_SIZES}
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500 sm:h-12 sm:w-12 dark:bg-gray-600 dark:text-gray-400">
                                —
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {brand.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {brand.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="min-w-0 px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {brand.country}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => removeSelectedBrand(brand.id)}
                          className="text-gray-400 transition hover:text-red-600 dark:hover:text-red-400"
                          aria-label={`Remove ${brand.name}`}
                        >
                          <TrashBinIcon
                            className="h-4 w-4"
                            viewBox="0 0 20 20"
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  ) : null;

  const validPeriodFields = (
    <div className="w-full">
      <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        VALID PERIOD
      </p>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        When the coupon becomes valid and when it expires.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2">
          <div className="min-w-0 flex-1">
            <Input
              id="coupon-valid-start"
              type={startDateType}
              placeholder="Start Date"
              ariaLabel="Start Date"
              value={toDateInputValue(form.start_date)}
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
                if (!e.currentTarget.value) setStartDateType("text");
              }}
              name="start_date"
              onChange={(e) =>
                setForm({
                  ...form,
                  start_date: e.target.value || "",
                })
              }
              disabled={isLoading}
            />
          </div>
          <TimeFieldHM
            ariaLabel="Start time"
            value={form.start_time ?? ""}
            onChange={(next) =>
              setForm({
                ...form,
                start_time: next || "",
              })
            }
            disabled={isLoading}
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">to</span>
        <div className="flex flex-1 items-center gap-2">
          <div className="min-w-0 flex-1">
            <Input
              id="coupon-valid-end"
              type={endDateType}
              placeholder="End Date"
              ariaLabel="End Date"
              value={toDateInputValue(form.end_date)}
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
                if (!e.currentTarget.value) setEndDateType("text");
              }}
              name="end_date"
              onChange={(e) =>
                setForm({
                  ...form,
                  end_date: e.target.value || "",
                })
              }
              disabled={isLoading}
            />
          </div>
          <TimeFieldHM
            ariaLabel="End time"
            value={form.end_time ?? ""}
            onChange={(next) =>
              setForm({
                ...form,
                end_time: next || "",
              })
            }
            disabled={isLoading}
          />
        </div>
      </div>
    </div>
  );

  const discountFields = (
    <div className="w-full">
      <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
        DISCOUNT
      </p>
      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
        Enter the discount value for the selected type.
      </p>
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Discount in :
          </span>
          <button
            type="button"
            onClick={() =>
              setForm({ ...form, discount_type: "percent" })
            }
            disabled={isLoading}
            aria-pressed={(form.discount_type ?? "percent") === "percent"}
            className={`${
              (form.discount_type ?? "percent") === "percent"
                ? DISCOUNT_MODE_TOGGLE_ACTIVE
                : DISCOUNT_MODE_TOGGLE_INACTIVE
            } touch-manipulation`}
          >
            Percent %
          </button>
          <button
            type="button"
            onClick={() =>
              setForm({
                ...form,
                discount_type: "cash",
                discount_currency: form.discount_currency || "THB",
              })
            }
            disabled={isLoading}
            aria-pressed={form.discount_type === "cash"}
            className={`${
              form.discount_type === "cash"
                ? DISCOUNT_MODE_TOGGLE_ACTIVE
                : DISCOUNT_MODE_TOGGLE_INACTIVE
            } touch-manipulation`}
          >
            Cash
          </button>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          {(form.discount_type ?? "percent") === "percent" ? (
            <div className="min-w-0 flex-1">
              <Input
                type="number"
                name="discount"
                value={form.discount}
                onChange={(event) => {
                  const next = parseAmount(event.target.value);
                  setForm({
                    ...form,
                    discount: next ?? 0,
                  });
                }}
                placeholder="e.g. 10"
                ariaLabel="Discount percent"
                disabled={isLoading}
                min="0"
              />
            </div>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <Input
                  type="number"
                  name="discount"
                  value={form.discount}
                  onChange={(event) => {
                    const next = parseAmount(event.target.value);
                    setForm({
                      ...form,
                      discount: next ?? 0,
                    });
                  }}
                  placeholder="Amount"
                  ariaLabel="Discount amount"
                  disabled={isLoading}
                  min="0"
                />
              </div>
              <div className="min-w-0 flex-1">
                <select
                  id="coupon-discount-currency"
                  value={form.discount_currency || "THB"}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      discount_currency: event.target.value,
                    })
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
    </div>
  );

  const minSpendFields = (
    <div className="min-w-0 w-full">
      <div
        className={`grid min-w-0 gap-3 ${
          form.min_spend_enabled
            ? "grid-cols-[320px_1fr] items-center"
            : "grid-cols-1"
        }`}
      >
        <div className="flex w-[320px] shrink-0 items-start gap-3">
          <Switch
            key={`${form.id ?? "new"}-min-spend`}
            label=""
            ariaLabel="Min spend"
            checked={Boolean(form.min_spend_enabled)}
            onChange={(enabled) =>
              setForm({
                ...form,
                min_spend_enabled: enabled,
                min_spend: enabled ? form.min_spend : "",
              })
            }
            disabled={isLoading}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Min spend
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              Require a minimum purchase to redeem this coupon.
            </p>
          </div>
        </div>
        {form.min_spend_enabled ? (
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 flex-1">
              <Input
                type="number"
                name="min_spend"
                value={form.min_spend}
                onChange={(event) =>
                  setForm({
                    ...form,
                    min_spend: event.target.value,
                  })
                }
                placeholder="Amount"
                ariaLabel="Minimum spend amount"
                disabled={isLoading}
                min="0"
              />
            </div>
            <div className="min-w-0 flex-1">
              <select
                id="coupon-min-spend-currency"
                value={form.min_spend_currency || "THB"}
                onChange={(event) =>
                  setForm({
                    ...form,
                    min_spend_currency: event.target.value,
                  })
                }
                disabled={isLoading}
                aria-label="Minimum spend currency"
                title="Currency"
                className="focus:border-brand-300 focus:ring-brand-500/10 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:ring-3 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="THB">THB</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const maxCapFields = (
    <div className="min-w-0 w-full">
      <div
        className={`grid min-w-0 gap-3 ${
          form.max_cap_enabled
            ? "grid-cols-[320px_1fr] items-center"
            : "grid-cols-1"
        }`}
      >
        <div className="flex w-[320px] shrink-0 items-start gap-3">
          <Switch
            key={`${form.id ?? "new"}-max-cap`}
            label=""
            ariaLabel="Max cap"
            checked={Boolean(form.max_cap_enabled)}
            onChange={(enabled) =>
              setForm({
                ...form,
                max_cap_enabled: enabled,
                max_cap: enabled ? form.max_cap || "" : "",
              })
            }
            disabled={isLoading}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Max cap
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              Limit the maximum discount from this coupon.
            </p>
          </div>
        </div>
        {form.max_cap_enabled ? (
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 flex-1">
              <Input
                type="number"
                name="max_cap"
                value={form.max_cap ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    max_cap: event.target.value,
                  })
                }
                placeholder="Amount"
                ariaLabel="Max cap amount"
                disabled={isLoading}
                min="0"
              />
            </div>
            <div className="min-w-0 flex-1">
              <select
                id="coupon-max-cap-currency"
                value={form.max_cap_currency || "THB"}
                onChange={(event) =>
                  setForm({
                    ...form,
                    max_cap_currency: event.target.value,
                  })
                }
                disabled={isLoading}
                aria-label="Max cap currency"
                title="Currency"
                className="focus:border-brand-300 focus:ring-brand-500/10 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:ring-3 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="THB">THB</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const codeFields = (
    <div className="min-w-0 w-full">
      <div
        className={`grid min-w-0 gap-3 ${
          form.code_enabled
            ? "grid-cols-[320px_1fr] items-center"
            : "grid-cols-1"
        }`}
      >
        <div className="flex w-[320px] shrink-0 items-start gap-3">
          <Switch
            key={`${form.id ?? "new"}-code`}
            label=""
            ariaLabel="Coupon code"
            checked={Boolean(form.code_enabled)}
            onChange={(enabled) =>
              setForm({
                ...form,
                code_enabled: enabled,
                code: enabled ? form.code : "",
              })
            }
            disabled={isLoading}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Code
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              The code users enter to redeem (e.g. WELCOME10). Must be unique.
            </p>
          </div>
        </div>
        {form.code_enabled ? (
          <div className={COUPON_FIELD_INPUT_WIDTH}>
            <Input
              type="text"
              name="code"
              value={form.code}
              onChange={(event) =>
                setForm({
                  ...form,
                  code: event.target.value,
                })
              }
              placeholder="WELCOME10"
              ariaLabel="Coupon code"
              disabled={isLoading}
            />
          </div>
        ) : null}
      </div>
    </div>
  );

  const oneTimeUseFields = (
    <div className="min-w-0 w-full">
      <div
        className={`grid min-w-0 gap-3 ${
          !form.one_time_use_enabled
            ? "grid-cols-[320px_1fr] items-center"
            : "grid-cols-1"
        }`}
      >
        <div className="flex w-[320px] shrink-0 items-start gap-3">
          <Switch
            key={`${form.id ?? "new"}-one-time-use`}
            label=""
            ariaLabel="One time use per user"
            checked={Boolean(form.one_time_use_enabled)}
            onChange={(enabled) =>
              setForm({
                ...form,
                one_time_use_enabled: enabled,
                usage_per_user: enabled ? "" : form.usage_per_user || "",
              })
            }
            disabled={isLoading}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              One time use
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              One code is available for one-time use per user.
            </p>
          </div>
        </div>
        {!form.one_time_use_enabled ? (
          <div className="flex min-w-0 items-center gap-3">
            <div className={COUPON_FIELD_INPUT_WIDTH}>
              <Input
                type="number"
                name="usage_per_user"
                value={form.usage_per_user ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    usage_per_user: event.target.value,
                  })
                }
                placeholder="2"
                ariaLabel="Usage times per user"
                disabled={isLoading}
                min="1"
              />
            </div>
            <span className="text-theme-xs shrink-0 text-gray-500 dark:text-gray-400">
              times per user
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );

  const unlimitedAmountFields = (
    <div className="min-w-0 w-full">
      <div
        className={`grid min-w-0 gap-3 ${
          !form.unlimited_amount_enabled
            ? "grid-cols-[320px_1fr] items-center"
            : "grid-cols-1"
        }`}
      >
        <div className="flex w-[320px] shrink-0 items-start gap-3">
          <Switch
            key={`${form.id ?? "new"}-unlimited-amount`}
            label=""
            ariaLabel="Unlimited redemption amount"
            checked={Boolean(form.unlimited_amount_enabled)}
            onChange={(enabled) =>
              setForm({
                ...form,
                unlimited_amount_enabled: enabled,
                available_code_amount: enabled
                  ? ""
                  : form.available_code_amount || "",
              })
            }
            disabled={isLoading}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Unlimited amount
            </p>
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              No limit on how many times this code can be redeemed in total.
            </p>
          </div>
        </div>
        {!form.unlimited_amount_enabled ? (
          <div className="flex min-w-0 items-center gap-3">
            <div className={COUPON_FIELD_INPUT_WIDTH}>
              <Input
                type="number"
                name="available_code_amount"
                value={form.available_code_amount ?? ""}
                onChange={(event) =>
                  setForm({
                    ...form,
                    available_code_amount: event.target.value,
                  })
                }
                placeholder="100"
                ariaLabel="Available code amount"
                disabled={isLoading}
                min="1"
              />
            </div>
            <span className="text-theme-xs shrink-0 text-gray-500 dark:text-gray-400">
              available code amount
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      <Modal
        isOpen={Boolean(openModal)}
        onClose={closeModal}
        isFullscreen
        showCloseButton={false}
        className="p-0"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 sm:p-6 md:p-8 lg:p-10">
          <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <div className="min-w-0">
              <h4 className="text-title-sm mb-1 font-semibold text-gray-800 dark:text-white/90">
                Coupon
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Create or edit a coupon. Set the code, offer, dates and
                discount. Users can redeem the code in the app for the linked
                offer.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={closeModal}
                disabled={isLoading}
              >
                Close
              </Button>
              <Button
                size="sm"
                disabled={isLoading || !hasUnsavedChanges}
                onClick={() => handleSave()}
                startIcon={
                  isLoading ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  ) : null
                }
              >
                Save Changes
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4">
            {dataForm.map((formItem) => (
              <Fragment key={formItem.filedName}>
                <div className="w-full">
                  <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {(formItem.label ?? formItem.filedName.replace(/_/g, " "))
                      .toUpperCase()}
                  </p>
                  {formItem.description && (
                    <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                      {formItem.description}
                    </p>
                  )}
                  {formItem.type === "textarea" ? (
                    <TextArea
                      id={formItem.filedName}
                      rows={6}
                      placeholder={formItem.placeholder || ""}
                      value={
                        (form?.[
                          formItem.filedName as keyof CouponRequestForm
                        ] as string) ?? ""
                      }
                      onChange={(value) => {
                        setForm({
                          ...form,
                          [formItem.filedName]: value,
                        });
                      }}
                    />
                  ) : (
                    <Input
                      type={formItem.type}
                      name={formItem.filedName}
                      onChange={(event) => {
                        setForm({
                          ...form,
                          [formItem.filedName]: event.target.value,
                        });
                      }}
                      placeholder={formItem.placeholder || ""}
                      value={
                        (form?.[
                          formItem.filedName as keyof CouponRequestForm
                        ] as string | number | undefined) ?? ""
                      }
                    />
                  )}
                </div>
                {formItem.filedName === "name" ? brandPickerFields : null}
                {formItem.filedName === "link" ? (
                  <>
                    {validPeriodFields}
                    {discountFields}
                    <div className="flex flex-col gap-4">
                      {minSpendFields}
                      {maxCapFields}
                      {codeFields}
                      {oneTimeUseFields}
                      {unlimitedAmountFields}
                    </div>
                  </>
                ) : null}
              </Fragment>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
};
export default FormCoupon;
