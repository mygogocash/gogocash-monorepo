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

  const handleSave = () => {
    if (form.mobile && !isValid) {
      toast.error("Invalid phone number");
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    if (form.mobile !== undefined) formData.append("mobile", form.mobile);
    if (form.username !== undefined) formData.append("username", form.username);
    if (form.email !== undefined) formData.append("email", form.email);
    if (form.address !== undefined) formData.append("address", form.address);
    if (form.birthdate !== undefined) formData.append("birthdate", form.birthdate);
    if (form.country !== undefined) formData.append("country", form.country);
    if (form.gender !== undefined) formData.append("gender", form.gender);
    if (form.bank_account_name !== undefined) formData.append("bank_account_name", form.bank_account_name);
    if (form.bank_name !== undefined) formData.append("bank_name", form.bank_name);
    if (form.bank_account_number !== undefined) formData.append("bank_account_number", form.bank_account_number);
    if (form.wallet_info !== undefined) formData.append("wallet_info", form.wallet_info);

    client
      .post(`/admin/update-user/${form.id}`, formData, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
        },
      })
      .then(() => {
        setOpenModal(false);
        fetchData();
        setIsLoading(false);
        toast.success("User updated successfully");
      })
      .catch((err) => {
        console.error("Failed to update user:", err);
        setIsLoading(false);
        toast.error(err?.response?.data?.message || "Update failed");
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
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit user
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Update user profile data. All fields are optional except where noted.
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
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
                ) : null
              }
            >
              Save Changes
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-4">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Username
              </label>
              <Input
                type="text"
                name="username"
                value={form.username ?? ""}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Username"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <Input
                type="email"
                name="email"
                value={form.email ?? ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mobile
            </label>
            <Input
              type="text"
              name="mobile"
              value={form.mobile ?? ""}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              placeholder="Phone number"
              className={form.mobile ? (isValid ? "border-green-500" : "border-red-500") : ""}
            />
            {form.mobile && !isValid && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">Invalid phone format</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Address
            </label>
            <Input
              type="text"
              name="address"
              value={form.address ?? ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Full address"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Birth date
              </label>
              <Input
                type="date"
                name="birthdate"
                value={form.birthdate ?? ""}
                onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Country
              </label>
              <Input
                type="text"
                name="country"
                value={form.country ?? ""}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="e.g. TH, US"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Gender
              </label>
              <select
                name="gender"
                value={form.gender ?? ""}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-600 dark:bg-gray-800/40">
            <h5 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">
              Bank account & wallet info
            </h5>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bank account name
                </label>
                <Input
                  type="text"
                  name="bank_account_name"
                  value={form.bank_account_name ?? ""}
                  onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                  placeholder="Account holder name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bank name
                </label>
                <Input
                  type="text"
                  name="bank_name"
                  value={form.bank_name ?? ""}
                  onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                  placeholder="e.g. KBANK, SCB"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bank account number
                </label>
                <Input
                  type="text"
                  name="bank_account_number"
                  value={form.bank_account_number ?? ""}
                  onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                  placeholder="Account number"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Wallet info
                </label>
                <Input
                  type="text"
                  name="wallet_info"
                  value={form.wallet_info ?? ""}
                  onChange={(e) => setForm({ ...form, wallet_info: e.target.value })}
                  placeholder="e.g. PromptPay ID, wallet address"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FormUpdate;
