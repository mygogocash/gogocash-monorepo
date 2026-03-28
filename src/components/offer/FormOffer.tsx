import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import Switch from "../form/switch/Switch";
import { Offer, OfferRequestForm } from "@/types/api";
import { pathImage } from "@/utils/helper";
import { useSession } from "next-auth/react";

function FieldLabel({ label, description }: { label: string; description: string }) {
  return (
    <div className="mb-1.5">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

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
        console.error("Failed to update offer:", err);
        toast.error("Offer updated error");
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 sm:p-6 md:p-8">
        <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit offer
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Update basic info, promo period, and media.
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
        <div className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pb-4 pr-1">
        {/* Basic info */}
        <section className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Basic info
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
          <div>
            <FieldLabel
              label="Commission (%)"
              description="Commission rate paid per conversion."
            />
            <Input
              type="text"
              name="commission_store"
              onChange={(e) => setForm({ ...form, commission_store: Number(e.target.value) })}
              defaultValue={form.commission_store || ""}
            />
          </div>
          <div>
            <FieldLabel
              label="Max cap"
              description="Maximum conversions or payout cap for this offer."
            />
            <Input
              type="text"
              name="max_cap"
              onChange={(e) => setForm({ ...form, max_cap: Number(e.target.value) })}
              defaultValue={form.max_cap || ""}
            />
          </div>
          <div className="flex flex-wrap items-center gap-6 pt-1">
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
                label="Extra store"
                onChange={(e) => setForm({ ...form, extra_store: e })}
                defaultChecked={form.extra_store}
              />
              <p className="ml-6 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Mark as bonus or extra store.
              </p>
            </div>
          </div>
        </section>

        {/* Upsize event */}
        <section className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-600 dark:bg-gray-800/40">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Upsize event
          </h4>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Optional period with special commission and max cap.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label="Start date" description="When the promo starts." />
              <Input
                type="date"
                name="upsize_start_date"
                onChange={(e) => setForm({ ...form, upsize_start_date: e.target.value || null })}
                defaultValue={form.upsize_start_date ?? ""}
              />
            </div>
            <div>
              <FieldLabel label="End date" description="When the promo ends." />
              <Input
                type="date"
                name="upsize_end_date"
                onChange={(e) => setForm({ ...form, upsize_end_date: e.target.value || null })}
                defaultValue={form.upsize_end_date ?? ""}
              />
            </div>
            <div>
              <FieldLabel label="Special commission (%)" description="Commission during the promo." />
              <Input
                type="number"
                name="upsize_special_commission"
                placeholder="e.g. 10"
                onChange={(e) =>
                  setForm({
                    ...form,
                    upsize_special_commission: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                defaultValue={form.upsize_special_commission ?? ""}
              />
            </div>
            <div>
              <FieldLabel label="Max cap (upsize)" description="Cap during the promo." />
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
              />
            </div>
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
        </div>
      </div>
    </Modal>
  );
};

export default FormOffer;
