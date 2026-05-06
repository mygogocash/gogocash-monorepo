import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { Offer } from "@/types/api";
import { useDataSession } from "@/hooks/useDataSession";
import { UserForm } from "@/types/user";
import { formatPhone, validatePhone } from "@/utils/helper";
import { devError } from "@/lib/devConsole";
import { useMemo } from "react";
import { getFeeCountrySelectOptions } from "@/data/feeCountrySelectOptions";

interface IProp {
  fetchData: () => void;
  openModal: boolean | Offer;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean | Offer>>;
  form: UserForm;
  setForm: React.Dispatch<React.SetStateAction<UserForm>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <h5 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h5>
      {description ? (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      ) : null}
    </div>
  );
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
  const session = useDataSession();
  const formatted = formatPhone(form.mobile, "TH");
  const isValid = validatePhone(formatted, "TH");

  // Curated ISO-3166-1 alpha-2 picker — matches the customer-app picker so
  // the storage format stays consistent across all writers. The free-text
  // input we used to have here was the second writer that could leak
  // non-canonical strings; this closes that hole.
  const countryOptions = useMemo(() => getFeeCountrySelectOptions(), []);
  const normaliseCountryToIso2 = (raw: string): string => {
    const trimmed = (raw || "").trim();
    if (trimmed.length === 2) return trimmed.toUpperCase();
    // Legacy users may still hold full English names ("Thailand") until the
    // backend migration runs — match by display name so the picker selects
    // the right row instead of showing blank.
    const match = countryOptions.find(
      (o) => o.name.toLowerCase() === trimmed.toLowerCase(),
    );
    return match?.code ?? trimmed.toUpperCase();
  };
  const currentCountryIso2 = normaliseCountryToIso2(form.country ?? "");

  const handleRequestClose = () => {
    if (!isLoading) setOpenModal(false);
  };

  const handleSave = () => {
    if (form.mobile && !isValid) {
      toast.error("Please fix the mobile number before saving.");
      return;
    }
    setIsLoading(true);
    const formData = new FormData();
    if (form.mobile !== undefined) formData.append("mobile", form.mobile);
    if (form.username !== undefined) formData.append("username", form.username);
    if (form.email !== undefined) formData.append("email", form.email);
    if (form.address !== undefined) formData.append("address", form.address);
    if (form.birthdate !== undefined) formData.append("birthdate", form.birthdate);
    if (form.country !== undefined) {
      // Always ship canonical ISO-2 — even if `form.country` was hydrated
      // from a legacy full-name value, the picker's `value` is already ISO-2;
      // re-normalise here to defend against any hand-edited form state.
      formData.append("country", normaliseCountryToIso2(form.country));
    }
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
        toast.success("Profile saved.");
      })
      .catch((err) => {
        devError("Failed to update user:", err);
        setIsLoading(false);
        toast.error(err?.response?.data?.message || "Could not save changes. Try again.");
      });
  };

  const displayName = (form.username || form.email || "this user").trim();

  return (
    <Modal
      isOpen={Boolean(openModal)}
      onClose={handleRequestClose}
      isFullscreen={false}
      showCloseButton
      className="flex !max-h-[min(92vh,880px)] !max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden !sm:max-w-2xl lg:!max-w-3xl"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-gray-100 px-5 pb-4 pt-12 sm:px-6 sm:pt-14 dark:border-gray-800">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
            User management
          </p>
          <h4 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">
            Edit profile
          </h4>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Update details for <span className="font-medium text-gray-900 dark:text-white">{displayName}</span>
            {form.id ? (
              <span className="mt-1 block font-mono text-xs text-gray-400 dark:text-gray-500">ID: {form.id}</span>
            ) : null}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
          <div className="space-y-8">
            <section className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/40 sm:p-5">
              <SectionTitle
                title="Sign-in & display"
                description="How the user appears in the app and receives account email."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-user-username"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Username
                  </label>
                  <Input
                    id="edit-user-username"
                    type="text"
                    name="username"
                    value={form.username ?? ""}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="Display name"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-user-email"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email
                  </label>
                  <Input
                    id="edit-user-email"
                    type="email"
                    name="email"
                    value={form.email ?? ""}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="name@example.com"
                  />
                </div>
              </div>
            </section>

            <section>
              <SectionTitle
                title="Contact"
                description="Mobile is validated for Thailand (+66) when provided."
              />
              <div>
                <label
                  htmlFor="edit-user-mobile"
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Mobile number
                </label>
                <Input
                  id="edit-user-mobile"
                  type="tel"
                  name="mobile"
                  value={form.mobile ?? ""}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                  placeholder="e.g. 0812345678 or +66812345678"
                  className={form.mobile ? (isValid ? "border-green-500/80" : "border-red-500/80") : ""}
                />
                {form.mobile && !isValid ? (
                  <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    Enter a valid Thai mobile number.
                  </p>
                ) : form.mobile && isValid ? (
                  <p className="mt-1.5 text-xs text-green-600 dark:text-green-400">Looks good.</p>
                ) : (
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Optional — leave blank if unknown.</p>
                )}
              </div>
            </section>

            <section>
              <SectionTitle title="Personal" description="Optional demographic fields." />
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="edit-user-birthdate"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Birth date
                  </label>
                  <Input
                    id="edit-user-birthdate"
                    type="date"
                    name="birthdate"
                    value={form.birthdate ?? ""}
                    onChange={(e) => setForm({ ...form, birthdate: e.target.value })}
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-user-country"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Country
                  </label>
                  <select
                    id="edit-user-country"
                    name="country"
                    value={currentCountryIso2}
                    onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
                  >
                    <option value="">Not specified</option>
                    {countryOptions.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-user-gender"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Gender
                  </label>
                  <select
                    id="edit-user-gender"
                    name="gender"
                    value={form.gender ?? ""}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
                  >
                    <option value="">Not specified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <SectionTitle title="Address" />
              <div>
                <label
                  htmlFor="edit-user-address"
                  className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Street / full address
                </label>
                <Input
                  id="edit-user-address"
                  type="text"
                  name="address"
                  value={form.address ?? ""}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="House number, district, city…"
                />
              </div>
            </section>

            <section className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 sm:p-5">
              <SectionTitle
                title="Payout & wallet"
                description="Used for withdrawals and cashback. Only staff should edit these fields."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="edit-user-bank-account-name"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Account holder name
                  </label>
                  <Input
                    id="edit-user-bank-account-name"
                    type="text"
                    name="bank_account_name"
                    value={form.bank_account_name ?? ""}
                    onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })}
                    placeholder="As on bank book"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-user-bank-name"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Bank name
                  </label>
                  <Input
                    id="edit-user-bank-name"
                    type="text"
                    name="bank_name"
                    value={form.bank_name ?? ""}
                    onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                    placeholder="e.g. Bangkok Bank, SCB"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-user-bank-number"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Account number
                  </label>
                  <Input
                    id="edit-user-bank-number"
                    type="text"
                    name="bank_account_number"
                    value={form.bank_account_number ?? ""}
                    onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
                    placeholder="Bank account number"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-user-wallet"
                    className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Wallet / PromptPay
                  </label>
                  <Input
                    id="edit-user-wallet"
                    type="text"
                    name="wallet_info"
                    value={form.wallet_info ?? ""}
                    onChange={(e) => setForm({ ...form, wallet_info: e.target.value })}
                    placeholder="Wallet address or PromptPay ID"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-100 bg-white px-5 py-4 sm:px-6 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-center text-xs text-gray-500 dark:text-gray-400 sm:text-left">
              Press <kbd className="rounded border border-gray-300 bg-gray-100 px-1 font-mono text-[10px] dark:border-gray-600 dark:bg-gray-800">Esc</kbd>{" "}
              to close without saving.
            </p>
            <div className="flex justify-stretch gap-2 sm:justify-end">
              <Button size="sm" variant="outline" onClick={handleRequestClose} disabled={isLoading} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isLoading}
                onClick={handleSave}
                className="flex-1 sm:flex-none"
                startIcon={
                  isLoading ? (
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : null
                }
              >
                Save changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FormUpdate;
