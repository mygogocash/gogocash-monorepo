import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { pathImage } from "@/utils/helper";
import { devError } from "@/lib/devConsole";
import { CategoryRequestForm, ResCategoryList } from "@/types/category";
import { useLayoutEffect, useState } from "react";

interface IProp {
  fetchOffers: () => void;
  openModal: boolean | ResCategoryList;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean | ResCategoryList>>;
  form: CategoryRequestForm;
  setForm: React.Dispatch<React.SetStateAction<CategoryRequestForm>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const FormCategory = ({
  fetchOffers,
  openModal,
  setOpenModal,
  form,
  setForm,
  isLoading,
  setIsLoading,
}: IProp) => {
  const category = openModal && typeof openModal === "object" ? openModal : null;
  const [iconObjectUrl, setIconObjectUrl] = useState<string | null>(null);
  const [bannerObjectUrl, setBannerObjectUrl] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!form.image) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync preview URL with File input before paint
      setIconObjectUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(form.image);
    setIconObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.image]);

  useLayoutEffect(() => {
    if (!form.banner) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync preview URL with File input before paint
      setBannerObjectUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(form.banner);
    setBannerObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.banner]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: "image" | "banner",
  ) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, [key]: file }));
  };

  const handleSave = () => {
    if (!category) return;
    if (!form.image && !form.banner) {
      toast.error("Select a new category icon and/or banner to upload.");
      return;
    }

    const formData = new FormData();
    if (form.image) {
      formData.append("image", form.image);
    }
    if (form.banner) {
      formData.append("banner", form.banner);
    }

    setIsLoading(true);
    client
      .patch(`/admin/update-category/${category._id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then(() => {
        setOpenModal(false);
        fetchOffers();
        setIsLoading(false);
        toast.success("Category updated successfully");
      })
      .catch((err) => {
        setIsLoading(false);
        devError("Failed to update category:", err);
        toast.error("Category update failed");
      });
  };

  const iconPreviewSrc = form.image
    ? (iconObjectUrl ?? "")
    : category?.image
      ? pathImage(category.image)
      : "";
  const bannerPreviewSrc = form.banner
    ? (bannerObjectUrl ?? "")
    : category?.banner
      ? pathImage(category.banner, "banner")
      : "";

  return (
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
              Category icon &amp; banner
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload or replace the category icon and optional wide banner. The banner can highlight this category in the app (e.g. category hub or listing header).
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button size="sm" variant="outline" onClick={() => setOpenModal(false)} disabled={isLoading}>
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
              Save changes
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto pb-4">
          <section>
            <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">Category icon</h5>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Square or near-square image (e.g. PNG, JPG). Shown in category lists.
            </p>
            <div className="mt-3">
              <Input type="file" name="image" onChange={(event) => handleFileChange(event, "image")} />
            </div>
            {iconPreviewSrc ? (
              <div className="mt-4">
                <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Icon preview</p>
                <RemoteOrBlobImage
                  src={iconPreviewSrc}
                  alt="Category icon preview"
                  width={160}
                  height={160}
                  className="h-40 w-40 rounded-lg border border-gray-200 object-cover dark:border-gray-600"
                />
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">No icon set yet.</p>
            )}
          </section>

          <section>
            <h5 className="text-sm font-semibold text-gray-800 dark:text-white/90">Category banner</h5>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Wide image for this category (recommended ~3:1 or 16:9). Shown where the app promotes this category.
            </p>
            <div className="mt-3">
              <Input type="file" name="banner" onChange={(event) => handleFileChange(event, "banner")} />
            </div>
            {category?.banner && !form.banner ? (
              <p className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">Current banner</p>
            ) : null}
            {bannerPreviewSrc ? (
              <div className="mt-2">
                {form.banner ? (
                  <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">New banner preview</p>
                ) : (
                  <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Current banner</p>
                )}
                <RemoteOrBlobImage
                  src={bannerPreviewSrc}
                  alt="Category banner preview"
                  width={640}
                  height={200}
                  className="max-h-48 w-full max-w-2xl rounded-lg border border-gray-200 object-cover dark:border-gray-600"
                />
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">No banner set — upload one to show in the app.</p>
            )}
          </section>
        </div>
      </div>
    </Modal>
  );
};

export default FormCategory;
