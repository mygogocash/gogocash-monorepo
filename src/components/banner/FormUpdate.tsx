import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { useSession } from "next-auth/react";
import { pathImage } from "@/utils/helper";
import { BannerRequestForm } from "@/types/banner";
interface IProp {
  fetchData: () => void;
  openModal: boolean;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
  form: BannerRequestForm;
  setForm: React.Dispatch<React.SetStateAction<BannerRequestForm>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}
const FormUpdate = ({
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

    formData.append("link_1", String(form.link_1));
    formData.append("link_2", String(form.link_2));
    formData.append("link_3", String(form.link_3));
    formData.append("link_4", String(form.link_4));
    formData.append("link_5", String(form.link_5));
    if (form.start_date) formData.append("start_date", form.start_date);
    if (form.end_date) formData.append("end_date", form.end_date);

    if (form.image_1) formData.append("image_1", form.image_1);
    if (form.image_2) formData.append("image_2", form.image_2);
    if (form.image_3) formData.append("image_3", form.image_3);
    if (form.image_4) formData.append("image_4", form.image_4);
    if (form.image_5) formData.append("image_5", form.image_5);
    setIsLoading(true);
    client
      .post(`/admin/banner-home`, formData, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then(() => {
        // setOpenModal(false);
        fetchData();
        setIsLoading(false);
        toast.success("updated successfully");
      })
      .catch(() => {
        setIsLoading(false);
        // console.error("Failed to update withdraw request:", err);
        // toast.error(err?.data?.message || "updated error");
      });
  };
  const slotImage = form[`image_${form.id}` as keyof BannerRequestForm];

  return (
    <Modal
      isOpen={Boolean(openModal)}
      onClose={function (): void {
        setOpenModal(false);
      }}
      isFullscreen
      showCloseButton={false}
      className="p-0"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 sm:p-6 md:p-8 lg:p-10">
        <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <div className="min-w-0">
            <h4 className="text-title-sm mb-1 font-semibold text-gray-800 dark:text-white/90">
              Banner Home
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Edit homepage banner slot {form.id}: upload an image, set the link and optional start/end dates. The banner is shown to users on the app homepage.
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
      <div className="min-h-0 flex-1 overflow-auto pb-4">
        <div className="mb-5 flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Upload image {form.id}
            </p>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Choose a banner image (e.g. PNG, JPG). Use a clear, wide image for best display on the homepage.
            </p>
            <Input
              type="file"
              name={`image_${form.id}`}
              onChange={(event) => handleFileChange(event, `image_${form.id}`)}
            />
            {form.image_1 && (
              <div className="mt-4 mb-4">
                <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview Banner {form.id}
                </p>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  How the banner will look after saving.
                </p>
                <RemoteOrBlobImage
                  src={
                    slotImage instanceof File
                      ? URL.createObjectURL(slotImage)
                      : pathImage(
                          typeof slotImage === "string" ? slotImage : null,
                        )
                  }
                  alt="Preview"
                  width={800}
                  height={512}
                  className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
                />
              </div>
            )}
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Link {form.id}
            </p>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              URL to open when users tap this banner (e.g. promo page or deep link).
            </p>
            <Input
              type="text"
              name={`link_${form.id}`}
              onChange={(event) =>
                setForm({ ...form, [`link_${form.id}`]: event.target.value })
              }
              defaultValue={
                (form[
                  `link_${form.id}` as keyof BannerRequestForm
                ] as string) || ""
              }
            />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-6">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Start date
            </p>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Optional. When to start showing this banner. Leave blank for no start limit.
            </p>
            <Input
              type="date"
              name="start_date"
              value={form.start_date ?? ""}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              End date
            </p>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Optional. When to stop showing this banner. Leave blank for no end limit.
            </p>
            <Input
              type="date"
              name="end_date"
              value={form.end_date ?? ""}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
        </div>
      </div>
      </div>
    </Modal>
  );
};

export default FormUpdate;
