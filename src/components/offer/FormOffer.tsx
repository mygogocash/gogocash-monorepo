import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import client, { fetcher } from "@/lib/axios/client";
import { devError } from "@/lib/devConsole";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import Switch from "../form/switch/Switch";
import { Offer, OfferRequestForm } from "@/types/api";
import { pathImage } from "@/utils/helper";
import { useDataSession } from "@/hooks/useDataSession";
import { useQuery } from "@tanstack/react-query";
import type { ResCategoryList } from "@/types/category";

function FieldLabel({ label, description }: { label: string; description: string }) {
  return (
    <div className="mb-1.5">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

interface IProp {
  fetchOffers: () => void;
  openModal: boolean | Offer;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean | Offer>>;
  form: OfferRequestForm;
  setForm: React.Dispatch<React.SetStateAction<OfferRequestForm>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}
const FormOffer = ({
  fetchOffers,
  openModal,
  setOpenModal,
  form,
  setForm,
  isLoading,
  setIsLoading,
}: IProp) => {
  const session = useDataSession();
  const offer = openModal && typeof openModal === "object" ? openModal : null;

  const { data: policyCategories = [] } = useQuery<ResCategoryList[]>({
    queryKey: ["getCategory", "form-offer-policy"],
    queryFn: () => fetcher("/offer/get-category/list"),
    staleTime: 60_000,
  });

  const { data: policiesList = {} } = useQuery<Record<string, string>>({
    queryKey: ["policyList"],
    queryFn: () => fetcher("/policy/list"),
    staleTime: 30_000,
  });

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
    if (form.logo_desktop) {
      formData.append("logo_desktop", form.logo_desktop);
    }
    if (form.logo_mobile) {
      formData.append("logo_mobile", form.logo_mobile);
    }

    if (form.logo_circle) {
      formData.append("logo_circle", form.logo_circle);
    }

    if (form.banner) {
      formData.append("banner", form.banner);
    }

    if (form.banner_mobile) {
      formData.append("banner_mobile", form.banner_mobile);
    }
    formData.append("offer_name_display", form.offer_name_display);
    formData.append("disabled", String(form.disabled));
    formData.append("commission_store", String(form.commission_store));
    formData.append("max_cap", String(form.max_cap));
    formData.append("extra_store", String(form.extra_store));
    if (form.upsize_start_date) {
      formData.append("upsize_start_date", form.upsize_start_date);
    }
    if (form.upsize_end_date) {
      formData.append("upsize_end_date", form.upsize_end_date);
    }
    if (form.upsize_special_commission != null) {
      formData.append("upsize_special_commission", String(form.upsize_special_commission));
    }
    if (form.upsize_max_cap != null) {
      formData.append("upsize_max_cap", String(form.upsize_max_cap));
    }
    const productTypeRows = (form.product_types ?? [])
      .map((row) => ({
        name: row.name.trim(),
        commission_info: row.commission_info.trim(),
      }))
      .filter((row) => row.name.length > 0 || row.commission_info.length > 0);
    formData.append("product_types", JSON.stringify(productTypeRows));
    formData.append(
      "admin_commission_info",
      JSON.stringify(
        (form.admin_commission_info ?? []).map((s) => s.trim()).filter(Boolean),
      ),
    );
    formData.append("policy_category_id", form.policy_category_id ?? "");
    setIsLoading(true);
    client
      .patch(`/admin/update-offer/${form.id}`, formData, {
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "multipart/form-data",
        },
      })
      .then(() => {
        setOpenModal(false);
        fetchOffers();
        setIsLoading(false);
        toast.success("Offer updated successfully");
      })
      .catch((err) => {
        setIsLoading(false);
        devError("Failed to update offer:", err);
        toast.error("Offer updated error");
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
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 sm:p-6 md:p-8">
        <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit offer
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Update basic info, policy source, promo period, and media. Partner commission details below are read-only (from the network).
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
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-600" />
                ) : null
              }
            >
              Save changes
            </Button>
          </div>
        </div>
        <div className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pb-4 pr-1">
        {/* Basic info */}
        <section className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Basic info
          </h4>
          <div>
            <FieldLabel
              label="Name of offer"
              description="Display name shown to users in the app."
            />
            <Input
              type="text"
              name="offer_name_display"
              onChange={(e) => setForm({ ...form, offer_name_display: e.target.value })}
              defaultValue={form.offer_name_display}
            />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <Switch
                label="Disabled offer"
                onChange={(e) => setForm({ ...form, disabled: e })}
                defaultChecked={form.disabled}
              />
              <p className="ml-6 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Hide this offer from users.
              </p>
            </div>
            <div>
              <Switch
                label="Top Brands"
                onChange={(e) => setForm({ ...form, extra_store: e })}
                defaultChecked={form.extra_store}
              />
              <p className="ml-6 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Highlight this offer in top-brand placements in the app.
              </p>
            </div>
          </div>
          <div>
            <FieldLabel
              label="Commission (%)"
              description="Your configured commission rate for this offer in the admin (store / user payout)."
            />
            <Input
              type="text"
              name="commission_store"
              onChange={(e) => setForm({ ...form, commission_store: Number(e.target.value) })}
              defaultValue={form.commission_store || ""}
            />
          </div>
          <div>
            <FieldLabel
              label="Max cap"
              description="Maximum conversions or payout cap for this offer."
            />
            <Input
              type="text"
              name="max_cap"
              onChange={(e) => setForm({ ...form, max_cap: Number(e.target.value) })}
              defaultValue={form.max_cap || ""}
            />
          </div>

          {/* Read-only: from partner / network feed */}
          <div className="rounded-xl border border-dashed border-brand-200/80 bg-brand-50/50 p-4 dark:border-brand-800/60 dark:bg-brand-950/25">
            <h4 className="text-sm font-semibold text-brand-900 dark:text-brand-100">
              Commission info from partner
            </h4>
            <p className="mt-1 text-xs text-brand-800/80 dark:text-brand-200/80">
              Structured terms as supplied by the partner or affiliate network. This does not change when you edit “Commission (%)” above.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Tracking model
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {offer?.commission_tracking?.trim() ? offer.commission_tracking : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Partner rates
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {offer?.commissions?.length
                    ? offer.commissions.join(" · ")
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Currency (partner)
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {offer?.currency?.trim() ? offer.currency : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Payment terms
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {typeof offer?.payment_terms === "number" ? `${offer.payment_terms} days` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Validation terms
                </dt>
                <dd className="mt-0.5 text-sm text-gray-900 dark:text-gray-100">
                  {typeof offer?.validation_terms === "number" ? `${offer.validation_terms} days` : "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Tracking link (partner)
                </dt>
                <dd className="mt-0.5 break-all text-sm text-gray-900 dark:text-gray-100">
                  {offer?.tracking_link?.trim() ? (
                    <a
                      href={offer.tracking_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 underline hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                    >
                      {offer.tracking_link}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
            {Array.isArray(offer?.special_commissions) && offer.special_commissions.length > 0 ? (
              <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-700 dark:text-gray-300">Special commissions: </span>
                {offer.special_commissions.length} tier(s) — see partner portal for full rules.
              </p>
            ) : null}
          </div>

          {/* Admin commission lines (editable) */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
            <div className="mb-2 flex w-full flex-wrap items-center gap-3">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Commission info (admin)
              </h4>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    admin_commission_info: [...(form.admin_commission_info ?? []), ""],
                  })
                }
                disabled={isLoading}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add internal commission notes, negotiated tiers, or overrides. Shown only from admin data — partner terms stay in the block above.
            </p>
            {(form.admin_commission_info ?? []).length > 0 ? (
              <ul className="mt-3 space-y-2">
                {(form.admin_commission_info ?? []).map((value, i) => (
                  <li key={i} className="flex w-full items-center gap-3">
                    <Input
                      type="text"
                      placeholder="e.g. Q1 promo: 7% CPA · cap ฿50k"
                      value={value}
                      onChange={(e) => {
                        const next = [...(form.admin_commission_info ?? [])];
                        next[i] = e.target.value;
                        setForm({ ...form, admin_commission_info: next });
                      }}
                      className="min-w-0 flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => {
                        const next = (form.admin_commission_info ?? []).filter((_, j) => j !== i);
                        setForm({
                          ...form,
                          admin_commission_info: next.length ? next : [],
                        });
                      }}
                      disabled={isLoading}
                      className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">
                No admin lines yet. Click <strong>Add</strong> to record commission info.
              </p>
            )}
          </div>
        </section>

        {/* Policy (T&C source) */}
        <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/40">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Terms &amp; conditions (policy)
          </h4>
          <FieldLabel
            label="Which category policy applies"
            description="Pick the category whose terms you configured under Policy Management. “Automatic” uses this offer’s own category label to resolve T&C in the app."
          />
          <select
            id="offer-policy-category"
            className="w-full max-w-xl rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            value={form.policy_category_id}
            onChange={(e) => setForm({ ...form, policy_category_id: e.target.value })}
          >
            <option value="">
              Automatic — use offer category ({offer?.categories ?? "—"})
            </option>
            {policyCategories.map((cat) => {
              const policyText = policiesList[cat._id] ?? "";
              const hasPolicy = policyText.trim().length > 0;
              return (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                  {hasPolicy ? " — T&C configured" : " — no T&C yet"}
                </option>
              );
            })}
          </select>
          {form.policy_category_id ? (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Saving will pin this offer to the selected category’s policy text. Users should see that category’s terms when engaging with this offer (per your app implementation).
            </p>
          ) : (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              No override: the app can match <span className="font-medium">{offer?.categories ?? "—"}</span> to a category and load its policy.
            </p>
          )}
        </section>

        {/* Product Type — stacked on small screens; 44px+ touch targets; 16px text on mobile avoids iOS input zoom */}
        <section className="space-y-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Product Type
            </h4>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  product_types: [
                    ...(form.product_types ?? []),
                    { name: "", commission_info: "" },
                  ],
                })
              }
              disabled={isLoading}
              className="min-h-11 w-full touch-manipulation sm:w-auto sm:shrink-0"
            >
              Add
            </Button>
          </div>
          <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Add a row for each product type with its name and commission info, then use{" "}
            <span className="font-medium">Save changes</span> at the bottom to persist.
          </p>
          {(form.product_types ?? []).length > 0 && (
            <ul className="space-y-4">
              {(form.product_types ?? []).map((row, i) => {
                const baseId = `offer-pt-${form.id || "new"}-${i}`;
                return (
                  <li
                    key={i}
                    className="flex flex-col gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-800/30 sm:flex-row sm:items-stretch sm:gap-3 sm:p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`${baseId}-name`}
                        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Product type name
                      </label>
                      <Input
                        id={`${baseId}-name`}
                        type="text"
                        placeholder="e.g. Electronics"
                        value={row.name}
                        onChange={(e) => {
                          const next = [...(form.product_types ?? [])];
                          next[i] = { ...next[i], name: e.target.value };
                          setForm({ ...form, product_types: next });
                        }}
                        disabled={isLoading}
                        autoComplete="off"
                        enterKeyHint="next"
                        className="min-h-11 min-w-0 w-full touch-manipulation !text-base sm:!text-sm"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`${baseId}-commission`}
                        className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Commission info
                      </label>
                      <TextArea
                        id={`${baseId}-commission`}
                        rows={3}
                        placeholder="e.g. 5% on new customers"
                        value={row.commission_info}
                        onChange={(v) => {
                          const next = [...(form.product_types ?? [])];
                          next[i] = { ...next[i], commission_info: v };
                          setForm({ ...form, product_types: next });
                        }}
                        disabled={isLoading}
                        className="min-h-[5.5rem] resize-y touch-manipulation !text-base !text-gray-800 placeholder:text-gray-400 dark:!text-white/90 sm:!text-sm"
                      />
                    </div>
                    <div className="flex shrink-0 sm:items-end sm:pb-0.5">
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        onClick={() => {
                          const next = (form.product_types ?? []).filter((_, j) => j !== i);
                          setForm({ ...form, product_types: next.length ? next : undefined });
                        }}
                        disabled={isLoading}
                        className="min-h-11 w-full touch-manipulation text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 sm:w-auto"
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Upsize event */}
        <section className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-600 dark:bg-gray-800/40">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Upsize event
          </h4>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Optional period with special commission and max cap.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel label="Start date" description="When the promo starts." />
              <Input
                type="date"
                name="upsize_start_date"
                onChange={(e) => setForm({ ...form, upsize_start_date: e.target.value || null })}
                defaultValue={form.upsize_start_date ?? ""}
              />
            </div>
            <div>
              <FieldLabel label="End date" description="When the promo ends." />
              <Input
                type="date"
                name="upsize_end_date"
                onChange={(e) => setForm({ ...form, upsize_end_date: e.target.value || null })}
                defaultValue={form.upsize_end_date ?? ""}
              />
            </div>
            <div>
              <FieldLabel label="Special commission (%)" description="Commission during the promo." />
              <Input
                type="number"
                name="upsize_special_commission"
                placeholder="e.g. 10"
                onChange={(e) =>
                  setForm({
                    ...form,
                    upsize_special_commission: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                defaultValue={form.upsize_special_commission ?? ""}
              />
            </div>
            <div>
              <FieldLabel label="Max cap (upsize)" description="Cap during the promo." />
              <Input
                type="number"
                name="upsize_max_cap"
                placeholder="e.g. 1000"
                onChange={(e) =>
                  setForm({
                    ...form,
                    upsize_max_cap: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                defaultValue={form.upsize_max_cap ?? ""}
              />
            </div>
          </div>
        </section>

        {/* Logos & media */}
        <section className="space-y-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Logos & media
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Upload images for desktop, mobile, and banners. Leave empty to keep current.
          </p>

          <div>
            <FieldLabel label="Logo (desktop)" description="Main logo for desktop layout." />
            <Input
              type="file"
              name="logo_desktop"
              onChange={(e) => handleFileChange(e, "logo_desktop")}
            />
            {(form.logo_desktop || (openModal as Offer).logo_desktop) && (
              <RemoteOrBlobImage
                src={
                  form.logo_desktop
                    ? URL.createObjectURL(form.logo_desktop)
                    : pathImage((openModal as Offer).logo_desktop)
                }
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            )}
          </div>

          <div>
            <FieldLabel label="Logo (mobile)" description="Logo for mobile layout." />
            <Input
              type="file"
              name="logo_mobile"
              onChange={(e) => handleFileChange(e, "logo_mobile")}
            />
            {(form.logo_mobile || (openModal as Offer).logo_mobile) && (
              <RemoteOrBlobImage
                src={
                  form.logo_mobile
                    ? URL.createObjectURL(form.logo_mobile)
                    : pathImage((openModal as Offer).logo_mobile)
                }
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            )}
          </div>

          <div>
            <FieldLabel label="Banner (desktop)" description="Hero or banner image on desktop." />
            <Input
              type="file"
              name="banner"
              onChange={(e) => handleFileChange(e, "banner")}
            />
            {(form.banner || (openModal as Offer).banner) && (
              <RemoteOrBlobImage
                src={
                  form.banner
                    ? URL.createObjectURL(form.banner)
                    : pathImage((openModal as Offer).banner)
                }
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            )}
          </div>

          <div>
            <FieldLabel label="Banner (mobile)" description="Banner image on mobile." />
            <Input
              type="file"
              name="banner_mobile"
              onChange={(e) => handleFileChange(e, "banner_mobile")}
            />
            {(form.banner_mobile || (openModal as Offer).banner_mobile) && (
              <RemoteOrBlobImage
                src={
                  form.banner_mobile
                    ? URL.createObjectURL(form.banner_mobile)
                    : pathImage((openModal as Offer).banner_mobile)
                }
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            )}
          </div>

          <div>
            <FieldLabel label="Logo (circle)" description="Circular or avatar-style logo." />
            <Input
              type="file"
              name="logo_circle"
              onChange={(e) => handleFileChange(e, "logo_circle")}
            />
            {(form.logo_circle || (openModal as Offer).logo_circle) && (
              <RemoteOrBlobImage
                src={
                  form.logo_circle
                    ? URL.createObjectURL(form.logo_circle)
                    : pathImage((openModal as Offer).logo_circle)
                }
                alt="Preview"
                width={256}
                height={256}
                className="mt-2 max-h-32 rounded-lg border border-gray-200 object-contain dark:border-gray-600"
              />
            )}
          </div>
        </section>
        </div>
      </div>
    </Modal>
  );
};

export default FormOffer;
