import {
  BANNER_SLOT_IDS,
  type BannerRequestForm,
  type BannerSlotId,
} from "@/types/banner";

function parseSlotId(value: string): BannerSlotId | null {
  const numeric = Number(value);
  return BANNER_SLOT_IDS.includes(numeric as BannerSlotId)
    ? (numeric as BannerSlotId)
    : null;
}

export function buildBannerSlotFormData(
  form: BannerRequestForm,
): FormData | null {
  const slot = parseSlotId(form.id);
  if (!slot) return null;

  const formData = new FormData();
  const linkKey = `link_${slot}` as const;
  const enabledKey = `enabled_${slot}` as const;
  const startDateKey = `start_date_${slot}` as const;
  const endDateKey = `end_date_${slot}` as const;
  const endForeverKey = `end_forever_${slot}` as const;
  const imageKey = `image_${slot}` as const;

  formData.append(linkKey, String(form[linkKey] ?? ""));
  formData.append(enabledKey, String(form[enabledKey] ?? true));
  formData.append(startDateKey, String(form[startDateKey] ?? ""));
  formData.append(
    endDateKey,
    form[endForeverKey] ? "" : String(form[endDateKey] ?? ""),
  );

  const image = form[imageKey];
  if (image instanceof File) {
    formData.append(imageKey, image);
  }

  return formData;
}
