/* eslint-disable @next/next/no-img-element */
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import Switch from "../form/switch/Switch";
import { Offer, OfferRequestForm } from "@/types/api";
import { useSession } from "next-auth/react";
interface IProp {
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
}: IProp) => {
  const { data } = useSession();
  const session = data as { accessToken?: string };
  // Handle file change
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, [key]: file }));
  };

  const handleSave = () => {
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
    setIsLoading(true);
    client
      .patch(`/admin/update-offer/${form.id}`, formData, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then(() => {
        setOpenModal(false);
        fetchOffers();
        setIsLoading(false);
        toast.success("Offer updated successfully");
      })
      .catch((err) => {
        setIsLoading(false);
        console.error("Failed to update withdraw request:", err);
        toast.error("Offer updated error");
      });
  };
  return (
    <Modal
      isOpen={Boolean(openModal)}
      onClose={function (): void {
        setOpenModal(false);
      }}
      className="max-w-[600px] p-5 lg:p-10"
    >
      <h4 className="text-title-sm mb-7 font-semibold text-gray-800 dark:text-white/90">
        Upload Logo
      </h4>
      <div className="max-h-[500px] space-y-6 overflow-y-auto">
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Name of Offer:
        </p>
        <Input
          type="text"
          name="offer_name_display"
          onChange={(event) =>
            setForm({ ...form, offer_name_display: event.target.value })
          }
          defaultValue={form.offer_name_display}
        />

        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Commission:
        </p>
        <Input
          type="text"
          name="commission_store"
          onChange={(event) =>
            setForm({ ...form, commission_store: Number(event.target.value) })
          }
          defaultValue={form.commission_store || ""}
        />

        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Max Cap:
        </p>
        <Input
          type="text"
          name="max_cap"
          onChange={(event) =>
            setForm({ ...form, max_cap: Number(event.target.value) })
          }
          defaultValue={form.max_cap || ""}
        />

        <Switch
          label={"Disabled offer"}
          onChange={(e) => {
            setForm({ ...form, disabled: e });
          }}
          defaultChecked={form.disabled}
        />

        <Switch
          label={"Extra Store"}
          onChange={(e) => {
            setForm({ ...form, extra_store: e });
          }}
          defaultChecked={form.extra_store}
        />

        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Upload logo_desktop:
        </p>
        <Input
          type="file"
          name="logo_desktop"
          onChange={(event) => handleFileChange(event, "logo_desktop")}
        />
        {(form.logo_desktop || (openModal as Offer).logo_desktop) && (
          <div className="mt-4 mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview logo_desktop:
            </p>
            <img
              src={
                form.logo_desktop
                  ? URL.createObjectURL(form.logo_desktop)
                  : `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${(openModal as Offer).logo_desktop}`
              }
              alt="Preview"
              className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
            />
          </div>
        )}
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Upload logo_mobile:
        </p>
        <Input
          type="file"
          name="logo_mobile"
          onChange={(event) => handleFileChange(event, "logo_mobile")}
        />
        {(form.logo_mobile || (openModal as Offer).logo_mobile) && (
          <div className="mt-4 mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview logo_mobile:
            </p>
            <img
              src={
                form.logo_mobile
                  ? URL.createObjectURL(form.logo_mobile)
                  : `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${(openModal as Offer).logo_mobile}`
              }
              alt="Preview"
              className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
            />
          </div>
        )}
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Upload banner desktop:
        </p>
        <Input
          type="file"
          name="banner"
          onChange={(event) => handleFileChange(event, "banner")}
        />
        {(form.banner || (openModal as Offer).banner) && (
          <div className="mt-4 mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview banner desktop:
            </p>
            <img
              src={
                form.banner
                  ? URL.createObjectURL(form.banner)
                  : `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${(openModal as Offer).banner}`
              }
              alt="Preview"
              className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
            />
          </div>
        )}

        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Upload banner mobile:
        </p>
        <Input
          type="file"
          name="banner_mobile"
          onChange={(event) => handleFileChange(event, "banner_mobile")}
        />
        {(form.banner_mobile || (openModal as Offer).banner_mobile) && (
          <div className="mt-4 mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview banner mobile:
            </p>
            <img
              src={
                form.banner_mobile
                  ? URL.createObjectURL(form.banner_mobile)
                  : `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${(openModal as Offer).banner_mobile}`
              }
              alt="Preview"
              className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
            />
          </div>
        )}

        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Upload logo_circle:
        </p>
        <Input
          type="file"
          name="logo_circle"
          onChange={(event) => handleFileChange(event, "logo_circle")}
        />
        {(form.logo_circle || (openModal as Offer).logo_circle) && (
          <div className="mt-4 mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview logo_circle:
            </p>
            <img
              src={
                form.logo_circle
                  ? URL.createObjectURL(form.logo_circle)
                  : `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${(openModal as Offer).logo_circle}`
              }
              alt="Preview"
              className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
            />
          </div>
        )}
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
  );
};

export default FormOffer;
