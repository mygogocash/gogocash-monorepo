import { CouponRequestForm } from "@/types/coupon";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client, { fetcher } from "@/lib/axios/client";
import { useDataSession } from "@/hooks/useDataSession";
import { fetchOffersList, offersListQueryKey } from "@/lib/query/offersQueries";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { useState } from "react";
import { Offer, OffersQuery } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import DatePicker from "../form/date-picker";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { devError } from "@/lib/devConsole";
import { parseAmount, validateOptionalAmount } from "@/lib/formValidation";
import { isDirty } from "@/lib/isDirty";

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
  const [query, setQuery] = useState<OffersQuery>({
    search: "",
    limit: 10,
    page: 1,
    country: "",
  });

  const { data: offer } = useQuery({
    queryKey: offersListQueryKey(query),
    queryFn: () => fetchOffersList(query),
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
  const couponModalOpen = Boolean(openModal);
  const [baseline, setBaseline] = useState<{
    open: boolean;
    form: CouponRequestForm;
  }>(() => ({ open: couponModalOpen, form }));
  if (baseline.open !== couponModalOpen) {
    setBaseline({ open: couponModalOpen, form });
  }

  const hasUnsavedChanges = isDirty(form, baseline.form);

  // Handle file change
  const handleSave = () => {
    const discount = parseAmount(form.discount);
    if (discount == null || discount < 0) {
      toast.error("Discount must be a number (0 or greater).");
      return;
    }
    const quantity = parseAmount(form.quantity);
    if (quantity == null || quantity < 0 || !Number.isInteger(quantity)) {
      toast.error("Quantity must be a whole number (0 or greater).");
      return;
    }
    const minSpendError = validateOptionalAmount(
      form.min_spend,
      "Minimum spend",
      true,
    );
    if (minSpendError) {
      toast.error(minSpendError);
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("code", form.code);
    formData.append("offer_id", form.offer_id);
    formData.append("start_date", form.start_date);
    formData.append("end_date", form.end_date);
    formData.append("eligibility", form.eligibility);
    formData.append("min_spend", form.min_spend);
    formData.append("quantity", String(quantity));
    formData.append("discount", String(discount));
    formData.append("id", form.id || "");
    formData.append("disabled", form.disabled?.toString() || "false");
    formData.append("link", form.link || "");

    setIsLoading(true);
    client
      .post(`/offer/update-coupon`, formData, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          //   "Content-Type": "multipart/form-data",
        },
      })
      .then(() => {
        fetchData();
        setOpenModal(false);
        setIsLoading(false);
        toast.success("updated successfully");
      })
      .catch((err) => {
        setIsLoading(false);
        devError("Failed to update coupon:", err);
        toast.error("updated error");
      });
  };

  const dataForm: {
    filedName: string;
    type: string;
    placeholder?: string;
    description?: string;
  }[] = [
    {
      filedName: "name",
      type: "text",
      description: "Display name of the coupon shown to users in the app.",
    },
    {
      filedName: "offer_id",
      type: "option",
      description: "The offer or platform this coupon applies to.",
    },
    {
      filedName: "link",
      type: "text",
      description:
        "Optional URL for the coupon or promo page (e.g. adidas.co.th/promo).",
    },
    {
      filedName: "start_date",
      type: "text",
      placeholder: "YYYY-MM-DD",
      description: "When the coupon becomes valid. Use YYYY-MM-DD.",
    },
    {
      filedName: "end_date",
      type: "text",
      placeholder: "YYYY-MM-DD",
      description: "When the coupon expires. Use YYYY-MM-DD.",
    },
    {
      filedName: "discount",
      type: "number",
      description:
        "Discount value: amount off (e.g. 50) or percentage (e.g. 10 for 10%).",
    },
    {
      filedName: "min_spend",
      type: "text",
      description:
        "Minimum purchase amount required to use the coupon (e.g. 500 THB).",
    },
    {
      filedName: "code",
      type: "text",
      description:
        "The code users enter to redeem (e.g. WELCOME10). Must be unique.",
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
    {
      filedName: "quantity",
      type: "number",
      description: "Total number of redemptions allowed. Use 0 for unlimited.",
    },
  ];

  const offerOptions =
    offer?.data?.map((item) => ({
      label: item.offer_name,
      value: item._id,
    })) ?? [];

  const selectedOfferOption =
    offerOptions.find((o) => o.value === form.offer_id) ?? null;

  const option = () => {
    if (showOfferField) {
      return (
        <Autocomplete
          options={offerOptions}
          value={selectedOfferOption}
          getOptionLabel={(opt) => (opt?.label ?? "").toString()}
          isOptionEqualToValue={(opt, val) => opt?.value === val?.value}
          sx={{ width: "100%", borderRadius: "0.5rem" }}
          renderInput={(params) => <TextField {...params} />}
          onChange={(_event, value) => {
            setForm({
              ...form,
              offer_id: (value?.value as string) ?? "",
            });
          }}
          onInputChange={(_event, value) => {
            setQuery({
              ...query,
              search: value ?? "",
            });
          }}
        />
      );
    }
    return <></>;
  };
  //   }, [offer, offerDetail, form, query, setForm]);
  return (
    <>
      <Modal
        isOpen={Boolean(openModal)}
        onClose={() => setOpenModal(false)}
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
                onClick={() => setOpenModal(false)}
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
              <div key={formItem.filedName} className="w-full">
                <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formItem.filedName.replace(/_/g, " ").toUpperCase()}
                </p>
                {formItem.description && (
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    {formItem.description}
                  </p>
                )}
                {formItem.type === "option" ? (
                  <>
                    {option()}
                    <p className="text-black">
                      {offerDetail?.offer_name || "-"}
                    </p>
                  </>
                ) : formItem.type === "dates" ? (
                  <DatePicker
                    id={formItem.filedName}
                    mode="single"
                    onChange={(e) => {
                      setForm({
                        ...form,
                        [formItem.filedName]: e || "",
                      });
                    }}
                    defaultDate={
                      form?.[
                        formItem.filedName as keyof CouponRequestForm
                      ] as string
                    }
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
                    defaultValue={
                      form?.[
                        formItem.filedName as keyof CouponRequestForm
                      ] as string
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
};
export default FormCoupon;
