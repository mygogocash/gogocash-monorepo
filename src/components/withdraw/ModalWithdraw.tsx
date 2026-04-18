import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { Modal } from "../ui/modal";
import Select from "../form/Select";
import Input from "../form/input/InputField";
import { formatPrice, pathImage } from "@/utils/helper";
import { WithdrawRequestForm } from "./WithdrawTable";
import { DataWithdrawsList } from "@/types/api";
import { useDataSession } from "@/hooks/useDataSession";
import { ManualWithdrawMarkPaid } from "./ManualWithdrawMarkPaid";
import type { WithdrawList } from "@/types/withdraw";
import { useState } from "react";
import client from "@/lib/axios/client";
import { devError } from "@/lib/devConsole";
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
  const session = useDataSession();
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
        devError("Failed to update withdraw request:", err);
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
              Check Request Withdraw
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review this withdrawal request, set the status, and optionally attach a payment slip. Save to update the request.
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
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4">
        {/* MiniPay / manual-payout admin action. Renders only when the row is
            `withdraw_mode === "manual"` and `status === "pending"`. */}
        {session?.accessToken ? (
          <ManualWithdrawMarkPaid
            withdraw={openModal as unknown as WithdrawList}
            token={session.accessToken}
            onMarkedPaid={() => {
              setOpenModal(false);
              fetchData();
            }}
          />
        ) : null}
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
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Total Payout
          </p>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Amount to be paid for this withdrawal request.
          </p>
          <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {(openModal as DataWithdrawsList).currency !== "USDC" &&
            (openModal as DataWithdrawsList).currency !== "USDT"
              ? formatPrice((openModal as DataWithdrawsList)?.amount_net)
              : (openModal as DataWithdrawsList)?.amount_net +
                " " +
                (openModal as DataWithdrawsList)?.currency}
          </p>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Payment slip (optional)
          </p>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Upload proof of payment if you have already processed this withdrawal.
          </p>
          <Input type="file" name="file" onChange={handleFileChange} />
        </div>
        {(form.file || (openModal as DataWithdrawsList).slip_file) && (
          <div className="mt-4 mb-4">
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Preview
            </p>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              Uploaded or existing slip image.
            </p>
            <RemoteOrBlobImage
              src={
                form.file
                  ? URL.createObjectURL(form.file)
                  : pathImage((openModal as DataWithdrawsList).slip_file)
              }
              alt="Preview"
              width={800}
              height={512}
              className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
              style={{ width: "auto", height: "auto" }}
            />
          </div>
        )}
        <div>
          <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
            Status
          </p>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Set the request status: Approve when paid, Reject to decline, or leave Pending.
          </p>
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
        </div>
      </div>
    </Modal>
  );
};

export default ModalWithdraw;
