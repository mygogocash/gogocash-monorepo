/* eslint-disable @next/next/no-img-element */
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { useSession } from "next-auth/react";
import { pathImage } from "@/utils/helper";
import { CategoryRequestForm, ResCategoryList } from "@/types/category";
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
    const categoryId = (openModal as ResCategoryList)?._id;
    if (form.image) {
      formData.append("image", form.image);
    }

    setIsLoading(true);
    client
      .patch(`/admin/update-category/${categoryId}`, formData, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
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
        console.error("Failed to update category:", err);
        toast.error("Category updated error");
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 sm:p-6 md:p-8 lg:p-10">
        <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <div className="min-w-0">
            <h4 className="text-title-sm mb-1 font-semibold text-gray-800 dark:text-white/90">
              Upload Category Image
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload or replace the image for this category. It will be shown to users in the app when they browse categories.
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
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4">
          <div>
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Upload Image
            </p>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Choose an image file (e.g. PNG, JPG). Use a clear, square or landscape image for best display.
            </p>
            <Input
              type="file"
              name="image"
              onChange={(event) => handleFileChange(event, "image")}
            />
          </div>
          {(form.image || (openModal as ResCategoryList).image) && (
            <div className="mt-4 mb-4">
              <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview
              </p>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                How the image will look after saving.
              </p>
              <img
                src={
                  form.image
                    ? URL.createObjectURL(form.image)
                    : pathImage((openModal as ResCategoryList).image)
                }
                alt="Preview"
                className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default FormCategory;
