/* eslint-disable @next/next/no-img-element */
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Select from "../form/Select";
import Input from "../form/input/InputField";
import { formatPrice } from "@/utils/helper";
import { WithdrawRequestForm } from "./WithdrawTable";
import { DataWithdrawsList } from "@/types/api";
import { useSession } from "next-auth/react";
import { useState } from "react";
import client from "@/lib/axios/client";
interface DataWithdrawsModal {
  openModal: DataWithdrawsList | boolean;
  setOpenModal: React.Dispatch<
    React.SetStateAction<boolean | DataWithdrawsList>
  >;
  form: WithdrawRequestForm;
  setForm: React.Dispatch<React.SetStateAction<WithdrawRequestForm>>;
  fetchData: () => void;
}
const ModalWithdraw = ({
  openModal,
  setOpenModal,
  fetchData,
  form,
  setForm,
}: DataWithdrawsModal) => {
  const { data } = useSession();
  const session = data as { accessToken?: string };
  const [isLoading, setIsLoading] = useState(false);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, file }));
  };

  const handleSave = () => {
    const formData = new FormData();
    formData.append("id", form.id);
    formData.append("status", form.status);
    if (form.file) {
      formData.append("file", form.file);
    }
    setIsLoading(true);
    client
      .patch(`/admin/update-request-withdraw`, formData, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then(() => {
        setOpenModal(false);
        fetchData();
        setIsLoading(false);
      })
      .catch((err) => {
        setIsLoading(false);
        console.error("Failed to update withdraw request:", err);
      });
  };

  return (
    <Modal
      isOpen={Boolean(openModal)}
      onClose={function (): void {
        setOpenModal(false);
      }}
      className="max-h-[400px] max-w-[600px] overflow-auto p-5 lg:p-10"
    >
      <div className="space-y-6">
        <h4 className="text-title-sm mb-7 font-semibold text-gray-800 dark:text-white/90">
          Check Request Withdraw
        </h4>
        {/* <div className="overflow-auto">
              <table>
                <thead>
                  <tr>
                    <th className="border px-4 py-2 text-left">
                      Conversion ID
                    </th>
                    <th className="border px-4 py-2 text-left">Detail</th>
                    <th className="border px-4 py-2 text-left">Sale Amount</th>
                    <th className="border px-4 py-2 text-left">Payout</th>
                    <th className="border px-4 py-2 text-left">Status</th>
                    <th className="border px-4 py-2 text-left">Currency</th>
                  </tr>
                </thead>
                <tbody>
                  {getDetailConversionWithdraw?.map(
                    (item: {
                      conversion_id: number;
                      sale_amount: string;
                      currency: string;
                      payout: string;
                      adv_sub2: string;
                      conversion_status: string;
                    }) => (
                      <tr key={item.conversion_id}>
                        <td className="border px-4 py-2">
                          {item.conversion_id}
                        </td>
                        <td className="max-w-[200px] overflow-auto border px-4 py-2">
                          <p className="text-nowrap">{item.adv_sub2}</p>
                        </td>

                        <td className="border px-4 py-2">
                          {item.currency !== "USDC" && item.currency !== "USDT"
                            ? formatPrice(Number(item.sale_amount))
                            : item.payout + " " + item.currency}
                        </td>
                        <td className="border px-4 py-2">
                          {item.currency !== "USDC" && item.currency !== "USDT"
                            ? formatPrice(Number(item.payout))
                            : item.payout + " " + item.currency}
                        </td>
                        <td className="border px-4 py-2">
                          {item.conversion_status}
                        </td>
                        <td className="border px-4 py-2">{item.currency}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div> */}
        <h1 className="text-title-sm mb-7 font-semibold text-gray-800 dark:text-white/90">
          Total Payout:{" "}
          {(openModal as DataWithdrawsList).currency !== "USDC" &&
          (openModal as DataWithdrawsList).currency !== "USDT"
            ? formatPrice((openModal as DataWithdrawsList)?.amount_net)
            : (openModal as DataWithdrawsList)?.amount_net +
              " " +
              (openModal as DataWithdrawsList)?.currency}
        </h1>
        <Input type="file" name="file" onChange={handleFileChange} />
        {(form.file || (openModal as DataWithdrawsList).slip_file) && (
          <div className="mt-4 mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview:
            </p>
            <img
              src={
                form.file
                  ? URL.createObjectURL(form.file)
                  : `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${(openModal as DataWithdrawsList).slip_file}`
              }
              alt="Preview"
              className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
            />
          </div>
        )}
        <Select
          options={[
            { label: "Approve", value: "approved" },
            { label: "Reject", value: "rejected" },
            { label: "Pending", value: "pending" },
          ]}
          onChange={(e) => {
            setForm((prev) => ({
              ...prev,
              status: e,
            }));
          }}
          defaultValue={
            form.status ||
            ((openModal && (openModal as DataWithdrawsList).status) as string)
          }
          placeholder="Select Status"
        />
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
            if (
              (openModal && (openModal as DataWithdrawsList).method) ===
              "bank_transfer"
            ) {
              handleSave();
            } else {
              toast.error("Only bank transfer method can be updated.");
            }
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

export default ModalWithdraw;
