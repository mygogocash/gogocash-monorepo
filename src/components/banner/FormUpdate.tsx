/* eslint-disable @next/next/no-img-element */
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { useSession } from "next-auth/react";
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
      .catch((err) => {
        console.log("err", err);
        setIsLoading(false);
        // console.error("Failed to update withdraw request:", err);
        // toast.error(err?.data?.message || "updated error");
      });
  };
  console.log(
    "form[`image_${form.id}` as keyof BannerRequestForm] ",
    form[`image_${form.id}` as keyof BannerRequestForm],
  );

  return (
    <Modal
      isOpen={Boolean(openModal)}
      onClose={function (): void {
        setOpenModal(false);
      }}
      className="max-w-[600px] p-5 lg:p-10"
    >
      <div className="max-h-[400px] overflow-auto">
        <div className="mb-5 flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Upload image_{form.id}:
            </p>
            <Input
              type="file"
              name={`image_${form.id}`}
              onChange={(event) => handleFileChange(event, `image_${form.id}`)}
            />
            {form.image_1 && (
              <div className="mt-4 mb-4">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview Banner {form.id}:
                </p>
                <img
                  src={
                    form[
                      `image_${form.id}` as keyof BannerRequestForm
                    ] instanceof File
                      ? URL.createObjectURL(
                          form[
                            `image_${form.id}` as keyof BannerRequestForm
                          ] as File,
                        )
                      : `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${form[`image_${form.id}` as keyof BannerRequestForm]}`
                  }
                  alt="Preview"
                  className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
                />
              </div>
            )}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Link {form.id}:
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

export default FormUpdate;
