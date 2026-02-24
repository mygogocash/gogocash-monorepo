import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { useSession } from "next-auth/react";
import { ResponseQuestCreateForm, ResponseQuestDate } from "@/types/quest";
interface IProp {
  fetchData: () => void;
  openModal: boolean | ResponseQuestDate;
  setOpenModal: React.Dispatch<
    React.SetStateAction<boolean | ResponseQuestDate>
  >;
  form: ResponseQuestCreateForm;
  setForm: React.Dispatch<React.SetStateAction<ResponseQuestCreateForm>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}
const FormQuest = ({
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, [key]: file }));
  };

  const handleSave = () => {
    // const formData = new FormData();

    // formData.append("mobile", String(form.start_date));

    setIsLoading(true);
    client
      .post(`/point/create-quest`, form, {
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
      <h4 className="text-title-sm mb-7 font-semibold text-gray-800 dark:text-white/90">
        Create Quest
      </h4>
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        Start Date: Ex.(2026-02-01)
      </p>
      <Input
        type="text"
        name="start_date"
        onChange={(event) =>
          setForm({ ...form, start_date: event.target.value })
        }
        defaultValue={form.start_date || ""}
      />
      <p className="mt-3 mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        End Date: Ex.(2026-02-28)
      </p>
      <Input
        type="text"
        name="end_date"
        onChange={(event) => setForm({ ...form, end_date: event.target.value })}
        defaultValue={form.end_date || ""}
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

export default FormQuest;
