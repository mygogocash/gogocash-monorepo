/* eslint-disable @next/next/no-img-element */
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { useSession } from "next-auth/react";
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
      onClose={function (): void {
        setOpenModal(false);
      }}
      className="max-w-[600px] p-5 lg:p-10"
    >
      <h4 className="text-title-sm mb-7 font-semibold text-gray-800 dark:text-white/90">
        Upload Category Image
      </h4>
      <div className="max-h-[500px] space-y-6 overflow-y-auto">
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Upload Image:
        </p>
        <Input
          type="file"
          name="image"
          onChange={(event) => handleFileChange(event, "image")}
        />
        {(form.image || (openModal as ResCategoryList).image) && (
          <div className="mt-4 mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview image:
            </p>
            <img
              src={
                form.image
                  ? URL.createObjectURL(form.image)
                  : `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${(openModal as ResCategoryList).image}`
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

export default FormCategory;
