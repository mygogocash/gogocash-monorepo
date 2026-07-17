"use client";

import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { usePermissions } from "@/hooks/usePermissions";
import { pathImage } from "@/utils/helper";
import { useObjectUrl } from "@/hooks/useObjectUrl";
import { BannerRequestForm } from "@/types/banner";
import { devApiError } from "@/lib/devConsole";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { isDirty } from "@/lib/isDirty";
import { multipartPostConfig } from "@/lib/multipartFormHeaders";
import Switch from "../form/switch/Switch";
import { startTransition, useEffect, useMemo, useState } from "react";
import { buildBannerSlotFormData } from "./bannerFormPayload";
import ConfirmDialog from "@/components/common/ConfirmDialog";
interface IProp {
  fetchData: () => void | Promise<unknown>;
  openModal: boolean;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
  form: BannerRequestForm;
  setForm: React.Dispatch<React.SetStateAction<BannerRequestForm>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  /** Live API POST target for the selected home or specific-page banner surface. */
  savePath?: string;
  headerTitle?: string;
  headerDescription?: string;
  uploadImageHint?: string;
  surfaceLabel?: string;
}
const FormUpdate = ({
  fetchData,
  openModal,
  setOpenModal,
  form,
  setForm,
  isLoading,
  setIsLoading,
  savePath = "/admin/banner-home",
  headerTitle = "Banner Home",
  headerDescription = "Edit homepage banner slot {slot}: upload an image, set the link and optional start/end dates. The banner is shown to users on the app homepage.",
  uploadImageHint = "Choose a banner image (e.g. PNG, JPG). Recommended size: 1920×1080 (16:9). Non-16:9 uploads are center-cropped to fill the hero frame.",
  surfaceLabel = "Home Page Banner",
}: IProp) => {
  const { can } = usePermissions();
  const canManageBanners = can("banner:manage");

  // Snapshot of the loaded values, captured when the modal opens, so we can
  // disable "Save Changes" until the user actually edits something. File fields
  // are normalized to a stable identity marker so picking a new file is seen as
  // a change while deepEqual stays reliable (it can't structurally diff File).
  const snapshotForm = (f: BannerRequestForm) => ({
    image_1:
      f.image_1 instanceof File
        ? f.image_1.name + ":" + f.image_1.size
        : f.image_1,
    image_2:
      f.image_2 instanceof File
        ? f.image_2.name + ":" + f.image_2.size
        : f.image_2,
    image_3:
      f.image_3 instanceof File
        ? f.image_3.name + ":" + f.image_3.size
        : f.image_3,
    image_4:
      f.image_4 instanceof File
        ? f.image_4.name + ":" + f.image_4.size
        : f.image_4,
    image_5:
      f.image_5 instanceof File
        ? f.image_5.name + ":" + f.image_5.size
        : f.image_5,
    link_1: f.link_1,
    link_2: f.link_2,
    link_3: f.link_3,
    link_4: f.link_4,
    link_5: f.link_5,
    enabled_1: f.enabled_1,
    enabled_2: f.enabled_2,
    enabled_3: f.enabled_3,
    enabled_4: f.enabled_4,
    enabled_5: f.enabled_5,
    start_date_1: f.start_date_1,
    start_date_2: f.start_date_2,
    start_date_3: f.start_date_3,
    start_date_4: f.start_date_4,
    start_date_5: f.start_date_5,
    end_date_1: f.end_date_1,
    end_date_2: f.end_date_2,
    end_date_3: f.end_date_3,
    end_date_4: f.end_date_4,
    end_date_5: f.end_date_5,
    end_forever_1: f.end_forever_1,
    end_forever_2: f.end_forever_2,
    end_forever_3: f.end_forever_3,
    end_forever_4: f.end_forever_4,
    end_forever_5: f.end_forever_5,
    id: f.id,
  });
  const [initialSnapshot, setInitialSnapshot] = useState<ReturnType<
    typeof snapshotForm
  > | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  useEffect(() => {
    if (!openModal) return;
    startTransition(() => {
      setInitialSnapshot(snapshotForm(form));
    });
    // Re-snapshot only when the modal open state changes; `form` is populated
    // synchronously alongside `openModal` by the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openModal]);
  const dirty = useMemo(
    () =>
      openModal &&
      initialSnapshot != null &&
      isDirty(snapshotForm(form), initialSnapshot),
    [openModal, form, initialSnapshot],
  );

  const setSlotField = <K extends keyof BannerRequestForm>(
    key: K,
    value: BannerRequestForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Handle file change
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) => {
    if (!canManageBanners) return;
    const file = e.target.files?.[0] || null;
    if (
      file &&
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ) {
      toast.error("Choose a PNG, JPG, or WebP banner image.");
      e.target.value = "";
      return;
    }
    setForm((prev) => ({ ...prev, [key]: file }));
  };

  const handleSave = async () => {
    if (!canManageBanners) return;
    const formData = buildBannerSlotFormData(form);
    if (!formData) return;

    setIsLoading(true);
    try {
      await client.post(savePath, formData, multipartPostConfig());
      await Promise.resolve(fetchData());
      setOpenModal(false);
      toast.success("Banner saved successfully");
    } catch (err: unknown) {
      devApiError("Banner update failed:", err, "Update failed");
      toast.error(
        getApiErrorMessage(
          err,
          "Couldn't update the banner. Please try again, or contact an administrator if it continues.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };
  const slotImage = form[`image_${form.id}` as keyof BannerRequestForm];
  const slotEnabledKey = `enabled_${form.id}` as keyof BannerRequestForm;
  const slotStartDateKey = `start_date_${form.id}` as keyof BannerRequestForm;
  const slotEndDateKey = `end_date_${form.id}` as keyof BannerRequestForm;
  const slotEndForeverKey = `end_forever_${form.id}` as keyof BannerRequestForm;
  const slotImageUrl = useObjectUrl(
    slotImage instanceof File ? slotImage : null,
  );
  const slotEnabled = Boolean(form[slotEnabledKey]);
  const slotStartDate = String(form[slotStartDateKey] || "");
  const slotEndDate = String(form[slotEndDateKey] || "");
  const slotEndForever = Boolean(form[slotEndForeverKey]);
  const slotDesc = headerDescription.replace(/\{slot\}/g, String(form.id));
  const slotTitle = headerTitle.replace(/\{slot\}/g, String(form.id));

  const closeWithoutSaving = () => {
    setDiscardConfirmOpen(false);
    setOpenModal(false);
  };

  const requestClose = () => {
    if (isLoading) return;
    if (dirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    closeWithoutSaving();
  };

  return (
    <Modal
      isOpen={Boolean(openModal)}
      onClose={requestClose}
      showCloseButton={false}
      className="max-w-6xl p-0 sm:max-w-6xl"
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <div className="min-w-0">
            <h4 className="text-title-sm mb-1 font-semibold text-gray-800 dark:text-white/90">
              {slotTitle}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {slotDesc}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={requestClose}
              disabled={isLoading}
            >
              Close
            </Button>
            <Button
              size="sm"
              disabled={isLoading || !dirty || !canManageBanners}
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
        {!canManageBanners ? (
          <p className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            You have read-only access. Ask an admin with Banner Management
            permission to update this banner.
          </p>
        ) : null}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-5 dark:border-gray-700 dark:bg-white/[0.03]">
            <h5 className="text-base font-semibold text-gray-900 dark:text-white">
              Creative
            </h5>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
              {uploadImageHint}
            </p>
            <div className="mt-4">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                name={`image_${form.id}`}
                disabled={!canManageBanners}
                onChange={(event) =>
                  handleFileChange(event, `image_${form.id}`)
                }
              />
            </div>
            {slotImage ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                  Current preview
                </p>
                <RemoteOrBlobImage
                  src={
                    slotImageUrl ??
                    pathImage(typeof slotImage === "string" ? slotImage : null)
                  }
                  alt={`${surfaceLabel} slide ${form.id} preview`}
                  width={960}
                  height={540}
                  className="aspect-video h-auto w-full rounded-xl border border-gray-200 object-cover dark:border-gray-600"
                />
              </div>
            ) : (
              <div className="mt-4 flex aspect-video items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400">
                No image selected for this slide.
              </div>
            )}
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-gray-200 p-4 sm:p-5 dark:border-gray-700">
              <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                Destination
              </h5>
              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                URL or customer-app path to open when users select this banner.
              </p>
              <div className="mt-4">
                <Input
                  type="text"
                  name={`link_${form.id}`}
                  placeholder="/quest or https://example.com/promo"
                  disabled={!canManageBanners}
                  onChange={(event) =>
                    setSlotField(
                      `link_${form.id}` as keyof BannerRequestForm,
                      event.target.value,
                    )
                  }
                  value={
                    (form[
                      `link_${form.id}` as keyof BannerRequestForm
                    ] as string) || ""
                  }
                />
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 p-4 sm:p-5 dark:border-gray-700">
              <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                Visibility &amp; schedule
              </h5>
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Slot enabled
                </p>
                <Switch
                  label="Enabled"
                  checked={slotEnabled}
                  disabled={!canManageBanners}
                  onChange={(checked) => setSlotField(slotEnabledKey, checked)}
                />
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Disable the slide to hide it without deleting its content.
                </p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start date
                  </p>
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    Optional. Leave blank to start immediately.
                  </p>
                  <Input
                    type="date"
                    name={slotStartDateKey as string}
                    value={slotStartDate}
                    disabled={!canManageBanners}
                    onChange={(e) =>
                      setSlotField(slotStartDateKey, e.target.value)
                    }
                  />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    End date
                  </p>
                  <label className="mb-2 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={slotEndForever}
                      disabled={!canManageBanners}
                      onChange={(e) => {
                        const forever = e.target.checked;
                        setSlotField(slotEndForeverKey, forever);
                        setSlotField(
                          slotEndDateKey,
                          forever
                            ? ""
                            : slotEndDate ||
                                slotStartDate ||
                                new Date().toISOString().slice(0, 10),
                        );
                      }}
                      className="text-brand-500 h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                    />
                    Forever (no end date)
                  </label>
                  <Input
                    type="date"
                    name={slotEndDateKey as string}
                    value={slotEndDate}
                    min={slotStartDate || undefined}
                    disabled={!canManageBanners || slotEndForever}
                    onChange={(e) => {
                      setSlotField(slotEndDateKey, e.target.value);
                      setSlotField(slotEndForeverKey, false);
                    }}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
      <ConfirmDialog
        isOpen={discardConfirmOpen}
        title="Discard unsaved banner changes?"
        description={`Your edits to ${surfaceLabel} slide ${form.id} have not been saved.`}
        confirmLabel="Discard changes"
        onConfirm={closeWithoutSaving}
        onCancel={() => setDiscardConfirmOpen(false)}
      />
    </Modal>
  );
};

export default FormUpdate;
