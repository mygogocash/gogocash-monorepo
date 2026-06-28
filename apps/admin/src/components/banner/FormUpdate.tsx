"use client";

import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { Modal } from "../ui/modal";
import Input from "../form/input/InputField";
import client from "@/lib/axios/client";
import toast from "react-hot-toast";
import Button from "../ui/button/Button";
import { useDataSession } from "@/hooks/useDataSession";
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
interface IProp {
  fetchData: () => void | Promise<unknown>;
  openModal: boolean;
  setOpenModal: React.Dispatch<React.SetStateAction<boolean>>;
  form: BannerRequestForm;
  setForm: React.Dispatch<React.SetStateAction<BannerRequestForm>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  /** POST target (mock: `/admin/banner-home` or `/admin/banner-all-brand-page`). */
  savePath?: string;
  headerTitle?: string;
  headerDescription?: string;
  uploadImageHint?: string;
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
  uploadImageHint = "Choose a banner image (e.g. PNG, JPG). Use a clear, wide image for best display on the homepage.",
}: IProp) => {
  const session = useDataSession();
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
  const [initialSnapshot, setInitialSnapshot] = useState<
    ReturnType<typeof snapshotForm> | null
  >(null);
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
    setForm((prev) => ({ ...prev, [key]: file }));
  };

  const handleSave = async () => {
    if (!canManageBanners) return;
    const formData = buildBannerSlotFormData(form);
    if (!formData) return;

    setIsLoading(true);
    try {
      await client.post(
        savePath,
        formData,
        multipartPostConfig(session?.accessToken),
      );
      await Promise.resolve(fetchData());
      setOpenModal(false);
      toast.success("Banner saved successfully");
    } catch (err: unknown) {
      devApiError("Banner update failed:", err, "Update failed");
      toast.error(getApiErrorMessage(err, "Update failed"));
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

  return (
    <Modal
      isOpen={Boolean(openModal)}
      onClose={function (): void {
        setOpenModal(false);
      }}
      isFullscreen
      showCloseButton={false}
      className="p-0"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 sm:p-6 md:p-8 lg:p-10">
        <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <div className="min-w-0">
            <h4 className="text-title-sm mb-1 font-semibold text-gray-800 dark:text-white/90">
              {headerTitle}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {slotDesc}
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
        <div className="min-h-0 flex-1 overflow-auto pb-4">
          <div className="mb-5 flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Upload image {form.id}
              </p>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                {uploadImageHint}
              </p>
              <Input
                type="file"
                name={`image_${form.id}`}
                disabled={!canManageBanners}
                onChange={(event) =>
                  handleFileChange(event, `image_${form.id}`)
                }
              />
              {Boolean(slotImage) && (
                <div className="mt-4 mb-4">
                  <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Preview Banner {form.id}
                  </p>
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    How the banner will look after saving.
                  </p>
                  <RemoteOrBlobImage
                    src={
                      slotImageUrl ??
                      pathImage(
                        typeof slotImage === "string" ? slotImage : null,
                      )
                    }
                    alt="Preview"
                    width={800}
                    height={512}
                    className="h-auto max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Link {form.id}
              </p>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                URL to open when users tap this banner (e.g. promo page or
                tracking link).
              </p>
              <Input
                type="text"
                name={`link_${form.id}`}
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
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:gap-6">
            <div className="min-w-0">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Slot enabled
              </p>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Turn this slot off to hide it without removing the banner content.
              </p>
              <Switch
                label="Enabled"
                checked={slotEnabled}
                disabled={!canManageBanners}
                onChange={(checked) =>
                  setSlotField(slotEnabledKey, checked)
                }
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Start date
              </p>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Optional. When to start showing this banner. Leave blank for no
                start limit.
              </p>
              <Input
                type="date"
                name={slotStartDateKey as string}
                value={slotStartDate}
                disabled={!canManageBanners}
                onChange={(e) =>
                  setSlotField(
                    slotStartDateKey,
                    e.target.value,
                  )
                }
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                End date
              </p>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                Set a last day to show this banner, or choose{" "}
                <strong>Forever</strong> for no end.
              </p>
              <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
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
        </div>
      </div>
    </Modal>
  );
};

export default FormUpdate;
