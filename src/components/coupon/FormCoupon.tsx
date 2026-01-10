import { CouponRequestForm } from "@/types/coupon";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client, { fetcher } from "@/lib/axios/client";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { useApi } from "@/hooks/useApi";
import { useState } from "react";
import { Offer, OffersQuery } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import DatePicker from "../form/date-picker";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

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
  const { data } = useSession();
  const session = data as { accessToken?: string };
  const [query, setQuery] = useState<OffersQuery>({
    search: "",
    limit: 10,
    page: 1,
  });

  const { getOffers } = useApi();
  const { data: offer } = useQuery({
    queryKey: ["get-offer", query],
    queryFn: () => {
      return getOffers({
        search: query.search,
        limit: query.limit,
        page: query.page,
      });
    },
    staleTime: 0,
  });

  const { data: offerDetail } = useQuery<Offer>({
    queryKey: ["getOffersDetailData", form],
    queryFn: () => fetcher(`/offer/${form?.offer_id}`),
    staleTime: 0,
    enabled: !!form?.offer_id,
    // refetchOnWindowFocus: true,
    // refetchOnMount: true,
    // refetchOnReconnect: true,
  });

  // Handle file change
  const handleSave = () => {
    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("code", form.code);
    formData.append("offer_id", form.offer_id);
    formData.append("start_date", form.start_date);
    formData.append("end_date", form.end_date);
    formData.append("eligibility", form.eligibility);
    formData.append("min_spend", form.min_spend);
    formData.append("quantity", form.quantity?.toString() || "0");
    formData.append("discount", form.discount?.toString());
    formData.append("id", form.id || "");
    formData.append("disabled", form.disabled?.toString() || "false");
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
        console.error("Failed to update category:", err);
        toast.error("updated error");
      });
  };

  const dataForm = [
    {
      filedName: "name",
      type: "text",
    },
    {
      filedName: "description",
      type: "textarea",
    },
    {
      filedName: "code",
      type: "text",
    },
    {
      filedName: "offer_id",
      type: "option",
    },
    {
      filedName: "start_date",
      type: "text",
      placeholder: "YYYY-MM-DD",
    },
    {
      filedName: "end_date",
      type: "text",
      placeholder: "YYYY-MM-DD",
    },
    {
      filedName: "eligibility",
      type: "text",
    },
    {
      filedName: "min_spend",
      type: "text",
    },
    {
      filedName: "discount",
      type: "number",
    },
    {
      filedName: "quantity",
      type: "number",
    },
  ];

  const option = () => {
    if (showOfferField) {
      return (
        <Autocomplete
          options={
            offer?.data.map((item) => ({
              label: item.offer_name,
              value: item._id,
            })) || []
          }
          sx={{ width: "100%", borderRadius: "0.5rem" }}
          renderInput={(params) => <TextField {...params} />}
          // getOptionLabel={(option) => option.label?.toString() || ""}
          defaultValue={{
            label: offerDetail?.offer_name || "",
            value: form.offer_id,
          }}
          onChange={function (event, value): void {
            //   console.log("v", value);
            setForm({
              ...form,
              offer_id: (value?.value as string) || "",
            });
          }}
          onInputChange={function (event, value): void {
            setQuery({
              ...query,
              search: value,
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
        onClose={function (): void {
          setOpenModal(false);
        }}
        className="max-w-[600px] p-5 lg:p-10"
      >
        <h4 className="text-title-sm mb-7 font-semibold text-gray-800 dark:text-white/90">
          Coupon
        </h4>
        <div className="max-h-[500px] space-y-6 overflow-y-auto">
          {dataForm.map((formItem) => (
            <div key={formItem.filedName} className="w-full">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {formItem.filedName.toUpperCase()}:
              </p>
              {formItem.type === "option" ? (
                <>
                  {option()}
                  <p className="text-black">{offerDetail?.offer_name || "-"}</p>
                </>
              ) : formItem.type === "dates" ? (
                <DatePicker
                  id={formItem.filedName}
                  mode="single"
                  onChange={(e) => {
                    console.log("e", e);
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

        <div className="mt-8 flex w-full items-center justify-end gap-3">
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
            disabled={isLoading}
            onClick={() => {
              handleSave();
            }}
            startIcon={
              isLoading ? (
                <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-blue-600"></div>
              ) : null
            }
          >
            Save Changes
          </Button>
        </div>
      </Modal>
    </>
  );
};
export default FormCoupon;
