import {
  BANNER_SLOT_IDS,
  type BannerData,
  type BannerRequestForm,
  type BannerSlotId,
} from "@/types/banner";

function emptyBannerRequestForm(slot: BannerSlotId): BannerRequestForm {
  return {
    image_1: null,
    image_2: null,
    image_3: null,
    image_4: null,
    image_5: null,
    link_1: "",
    link_2: "",
    link_3: "",
    link_4: "",
    link_5: "",
    enabled_1: true,
    enabled_2: true,
    enabled_3: true,
    enabled_4: true,
    enabled_5: true,
    start_date_1: "",
    start_date_2: "",
    start_date_3: "",
    start_date_4: "",
    start_date_5: "",
    end_date_1: "",
    end_date_2: "",
    end_date_3: "",
    end_date_4: "",
    end_date_5: "",
    end_forever_1: true,
    end_forever_2: true,
    end_forever_3: true,
    end_forever_4: true,
    end_forever_5: true,
    id: String(slot),
  };
}

/** Hydrate the edit modal for one slot; works when GET returns null (no doc yet). */
export function buildBannerSlotFormState(
  bannerData: BannerData | undefined | null,
  slot: BannerSlotId,
): BannerRequestForm {
  if (!bannerData) {
    return emptyBannerRequestForm(slot);
  }

  return {
    image_1: bannerData.image_1 || null,
    image_2: bannerData.image_2 || null,
    image_3: bannerData.image_3 || null,
    image_4: bannerData.image_4 || null,
    image_5: bannerData.image_5 || null,
    link_1: bannerData.link_1 || "",
    link_2: bannerData.link_2 || "",
    link_3: bannerData.link_3 || "",
    link_4: bannerData.link_4 || "",
    link_5: bannerData.link_5 || "",
    enabled_1:
      typeof bannerData.enabled_1 === "boolean" ? bannerData.enabled_1 : true,
    enabled_2:
      typeof bannerData.enabled_2 === "boolean" ? bannerData.enabled_2 : true,
    enabled_3:
      typeof bannerData.enabled_3 === "boolean" ? bannerData.enabled_3 : true,
    enabled_4:
      typeof bannerData.enabled_4 === "boolean" ? bannerData.enabled_4 : true,
    enabled_5:
      typeof bannerData.enabled_5 === "boolean" ? bannerData.enabled_5 : true,
    start_date_1: bannerData.start_date_1 || "",
    start_date_2: bannerData.start_date_2 || "",
    start_date_3: bannerData.start_date_3 || "",
    start_date_4: bannerData.start_date_4 || "",
    start_date_5: bannerData.start_date_5 || "",
    end_date_1: bannerData.end_date_1 || "",
    end_date_2: bannerData.end_date_2 || "",
    end_date_3: bannerData.end_date_3 || "",
    end_date_4: bannerData.end_date_4 || "",
    end_date_5: bannerData.end_date_5 || "",
    end_forever_1: !Boolean(String(bannerData.end_date_1 || "").trim()),
    end_forever_2: !Boolean(String(bannerData.end_date_2 || "").trim()),
    end_forever_3: !Boolean(String(bannerData.end_date_3 || "").trim()),
    end_forever_4: !Boolean(String(bannerData.end_date_4 || "").trim()),
    end_forever_5: !Boolean(String(bannerData.end_date_5 || "").trim()),
    id: String(slot),
  };
}

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

/** Empty a single slot (image, link, schedule) without touching other slots. */
export function buildBannerClearSlotFormData(
  slot: BannerSlotId,
): FormData {
  const formData = new FormData();
  formData.append(`link_${slot}`, "");
  formData.append(`enabled_${slot}`, "false");
  formData.append(`start_date_${slot}`, "");
  formData.append(`end_date_${slot}`, "");
  formData.append(`clear_image_${slot}`, "true");
  return formData;
}
