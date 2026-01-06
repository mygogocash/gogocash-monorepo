import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { Offer } from "@/types/api";
import { useSession } from "next-auth/react";
import { UserForm } from "@/types/user";
import { formatPhone, validatePhone } from "@/utils/helper";
interface IProp {
  fetchData: () => void;
  openModal: boolean | Offer;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean | Offer>>;
  form: UserForm;
  setForm: React.Dispatch<React.SetStateAction<UserForm>>;
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
  const formatted = formatPhone(form.mobile, "TH");
  const isValid = validatePhone(formatted, "TH");
  // Handle file change
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, [key]: file }));
  };

  const handleSave = () => {
    if (!isValid) {
      toast.error("Invalid phone number");
      return;
    }
    const formData = new FormData();

    formData.append("mobile", String(form.mobile));

    setIsLoading(true);
    client
      .post(`/admin/update-user/${form.id}`, formData, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          // "Content-Type": "multipart/form-data",
        },
      })
      .then(() => {
        setOpenModal(false);
        fetchData();
        setIsLoading(false);
        toast.success("updated successfully");
      })
      .catch((err) => {
        console.log("err", err);
        setIsLoading(false);
        console.error("Failed to update withdraw request:", err);
        toast.error(err?.data?.message || "updated error");
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
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Mobile:
      </p>
      <Input
        type="text"
        name="mobile"
        onChange={(event) => setForm({ ...form, mobile: event.target.value })}
        defaultValue={form.mobile || ""}
        className={`${isValid ? "border-green-500" : "border-red-500"}`}
      />
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
