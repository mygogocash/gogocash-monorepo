export type QuestCampaignBannerDraft = {
  bannerEn: File | null;
  bannerTh: File | null;
  subBannerEn: File | null;
  subBannerTh: File | null;
};

export type QuestCampaignFormInput = QuestCampaignBannerDraft & {
  requestKey: string;
  campaignRevision: number;
  configRevision: number;
  questId?: string | null;
  startDate: string;
  endDate: string;
  status: string;
  facebookPage: string;
  facebookPost: string;
  line: string;
};

export type QuestCampaignRequest = {
  fingerprint: string;
  requestKey: string;
};

const BANNER_FIELDS = [
  { draftKey: "bannerEn", formKey: "banner_en", label: "Banner EN" },
  { draftKey: "bannerTh", formKey: "banner_th", label: "Banner TH" },
  {
    draftKey: "subBannerEn",
    formKey: "sub_banner_en",
    label: "Sub banner EN",
  },
  {
    draftKey: "subBannerTh",
    formKey: "sub_banner_th",
    label: "Sub banner TH",
  },
] as const;

function isBrowserFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

/**
 * Normalize free-text campaign fields (facebook_page/facebook_post/line).
 *
 * Older saves persisted the literal strings "undefined"/"null" (from
 * `String(undefined)` on an empty field). Those flowed back into the editor and
 * re-saved, so the fields showed "undefined". Treat the sentinels — and any
 * non-string / whitespace-only value — as empty, both on load and on save.
 */
export function sanitizeQuestCampaignText(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed === "undefined" || trimmed === "null" ? "" : trimmed;
}

export function hasCompleteQuestBannerSet(
  draft: QuestCampaignBannerDraft,
): boolean {
  return BANNER_FIELDS.every(({ draftKey }) => isBrowserFile(draft[draftKey]));
}

export function questCampaignFingerprint(
  input: Omit<QuestCampaignFormInput, "requestKey">,
): string {
  const files = Object.fromEntries(
    BANNER_FIELDS.map(({ draftKey, formKey }) => {
      const value = input[draftKey];
      return [
        formKey,
        isBrowserFile(value)
          ? {
              name: value.name,
              size: value.size,
              type: value.type,
              lastModified: value.lastModified,
            }
          : value === null
            ? null
            : "invalid",
      ];
    }),
  );
  return JSON.stringify({
    questId: input.questId ?? null,
    campaignRevision: input.campaignRevision,
    configRevision: input.configRevision,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status,
    facebookPage: input.facebookPage,
    facebookPost: input.facebookPost,
    line: input.line,
    files,
  });
}

export function nextQuestCampaignRequest(
  current: QuestCampaignRequest | null,
  fingerprint: string,
  createId: () => string = () => globalThis.crypto.randomUUID(),
): QuestCampaignRequest {
  if (current?.fingerprint === fingerprint) return current;
  return {
    fingerprint,
    requestKey: `quest-media:${createId()}`,
  };
}

export function buildQuestCampaignFormData(
  input: QuestCampaignFormInput,
): FormData {
  const form = new FormData();
  if (input.questId) form.append("_id", input.questId);
  form.append("request_key", input.requestKey);
  form.append("campaign_revision", String(input.campaignRevision));
  form.append("expected_config_revision", String(input.configRevision));
  form.append("start_date", input.startDate);
  form.append("end_date", input.endDate);
  form.append("status", input.status);
  form.append("facebook_page", sanitizeQuestCampaignText(input.facebookPage));
  form.append("facebook_post", sanitizeQuestCampaignText(input.facebookPost));
  form.append("line", sanitizeQuestCampaignText(input.line));

  for (const { draftKey, formKey, label } of BANNER_FIELDS) {
    const value = input[draftKey];
    if (value === null) continue;
    if (!isBrowserFile(value)) {
      throw new Error(`${label} must be a newly selected image file.`);
    }
    form.append(formKey, value);
  }
  return form;
}
