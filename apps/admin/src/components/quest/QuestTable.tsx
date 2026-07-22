"use client";

import React, { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import {
  ADMIN_DATETIME_ALT_FORMAT,
  ADMIN_DATETIME_VALUE_FORMAT,
} from "@/lib/adminDateTimeFormat";
import { Modal } from "@/components/ui/modal";
import NoData from "@/components/common/NoData";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { appLinks } from "@/lib/appLinks";
import { formatDate } from "@/lib/dateFormat";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { pathImage } from "@/utils/helper";
import { getMembershipTiers } from "@/lib/api/adminModulesApi";
import {
  defaultQuestTaskWording,
  normalizeQuestTaskWordingDraft,
  resolveQuestTaskWording,
  shouldReplaceQuestWording,
} from "@/lib/questTaskWording";
import {
  deriveQuestStatus,
  questStatusBadgeColor,
  questStatusLabel,
} from "@/lib/questStatus";
import { usePermissions } from "@/hooks/usePermissions";
import { fetchOffersList, offersListQueryKey } from "@/lib/query/offersQueries";
import {
  fetchAdminQuests,
  fetchQuestLeaderboard,
  fetchQuestTaskDeeplinkSummary,
  questLeaderboardQueryKey,
  questListQueryKey,
  questTaskDeeplinkSummaryQueryKey,
  saveQuestCampaign,
  saveQuestRewards,
  saveQuestTasks,
} from "@/lib/query/questQueries";
import type { Offer, OffersQuery } from "@/types/api";
import type { MembershipTier } from "@/types/adminModules";
import type {
  QuestAudience,
  QuestReward,
  QuestRewardModel,
  QuestTask,
  QuestTaskConfigSavePayload,
  QuestTaskDeeplinkSummary,
  QuestTaskType,
  ResponseQuestDate,
} from "@/types/quest";
import {
  buildQuestRewardSavePayload,
  type RewardDistributionDraft,
  type RewardDraft,
  validateQuestRewardDistribution,
  validateQuestRewards,
} from "./questRewardEditor";
import {
  bangkokDateTimeInputToISOString,
  BANGKOK_TIMEZONE_LABEL,
  toBangkokDateTimeInput,
} from "./questDateTime";
import {
  buildQuestTaskPayloads,
  sameJson,
  type TaskDraft,
  validateQuestTasks,
  defaultQuestTaskPoints,
  normalizeQuestTaskPoints,
  switchQuestTaskType,
} from "./questTaskEditor";
import { QuestTaskBrandSelect } from "./QuestTaskBrandSelect";
import { QuestTaskTypeSelect } from "./QuestTaskTypeSelect";
import { QuestTaskWordingFields } from "./QuestTaskWordingFields";
import {
  buildQuestCampaignFormData,
  hasCompleteQuestBannerSet,
  nextQuestCampaignRequest,
  questCampaignFingerprint,
  sanitizeQuestCampaignText,
  type QuestCampaignRequest,
} from "./questCampaignFormData";

type CampaignDraft = {
  startDate: string;
  endDate: string;
  facebookPage: string;
  facebookPost: string;
  line: string;
  bannerEn: File | null;
  bannerTh: File | null;
  subBannerEn: File | null;
  subBannerTh: File | null;
};

type TaskConfigDraft = {
  audienceKind: QuestAudience["kind"];
  tierIds: string[];
  maxAwardsPerUser: string;
  maxReferralsPerUser: string;
};

const QUEST_BANNERS_REQUIRED_MESSAGE =
  "Upload Banner EN, Banner TH, Sub banner EN, and Sub banner TH before creating the quest.";

const OFFERS_QUERY: OffersQuery = {
  search: "",
  limit: 300,
  page: 1,
  country: "",
};
const EMPTY_QUESTS: ResponseQuestDate[] = [];
const EMPTY_OFFERS: Offer[] = [];
const EMPTY_MEMBERSHIP_TIERS: MembershipTier[] = [];

type QuestDetailTab = "tasks" | "leaderboard" | "rewards";

const REWARD_DISTRIBUTION_OPTIONS: {
  value: RewardDistributionDraft["mode"];
  label: string;
}[] = [
  {
    value: "campaign_end",
    label: "Automatically when campaign ends",
  },
  {
    value: "after_days",
    label: "Automatically after campaign ends",
  },
  {
    value: "manual",
    label: "Manual distribution",
  },
];

const QUEST_DETAIL_TABS: {
  key: QuestDetailTab;
  label: string;
  description: string;
}[] = [
  {
    key: "tasks",
    label: "Quest tasks",
    description: "Manage brands, points, wording, and deeplink checks.",
  },
  {
    key: "leaderboard",
    label: "Leaderboard",
    description: "Review campaign ranking, points, and matched reward values.",
  },
  {
    key: "rewards",
    label: "Rewards",
    description: "Configure the payout amount for each winning rank.",
  },
];

function detailTabButtonClass(active: boolean): string {
  return `min-w-[150px] rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
    active
      ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
      : "text-gray-500 hover:bg-white/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/70 dark:hover:text-white"
  }`;
}

function rewardDistributionLabel(
  mode: RewardDistributionDraft["mode"],
): string {
  return (
    REWARD_DISTRIBUTION_OPTIONS.find((option) => option.value === mode)
      ?.label ?? REWARD_DISTRIBUTION_OPTIONS[0].label
  );
}

function RewardDistributionSelect({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (mode: RewardDistributionDraft["mode"]) => void;
  value: RewardDistributionDraft["mode"];
}) {
  const [open, setOpen] = useState(false);
  const listboxId = "quest-reward-distribution-options";

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Reward distribution schedule"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="focus:border-brand-300 focus:ring-brand-500/10 shadow-theme-xs flex h-11 w-full items-center justify-between gap-3 rounded-lg border border-gray-300 bg-white px-4 text-left text-sm text-gray-800 transition hover:border-gray-400 focus:ring-3 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:hover:border-gray-600"
      >
        <span className="truncate">{rewardDistributionLabel(value)}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-500 transition dark:text-gray-400 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      </button>

      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-950"
        >
          {REWARD_DISTRIBUTION_OPTIONS.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  selected
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                <span>{option.label}</span>
                {selected && (
                  <span className="bg-brand-500 h-2 w-2 shrink-0 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function getTaskOfferId(task: QuestTask): string {
  if (!task.offer) return "";
  return typeof task.offer === "string" ? task.offer : task.offer._id;
}

function getTaskOffer(task: QuestTask): Offer | null {
  if (!task.offer) return null;
  return typeof task.offer === "string" ? null : task.offer;
}

function offerLabel(offer: Offer | null | undefined): string {
  if (!offer) return "Unknown brand";
  return (
    offer.offer_name_display || offer.offer_name || `Offer ${offer.offer_id}`
  );
}

function offerLogo(offer: Offer | null | undefined): string {
  return (
    offer?.logo_circle ||
    offer?.logo_mobile ||
    offer?.logo_desktop ||
    offer?.logo ||
    ""
  );
}

function customerTaskWording(
  task: Pick<TaskDraft, "wording" | "wording_en" | "wording_th">,
  offer: Offer | null | undefined,
  locale: "en" | "th" = "en",
) {
  return resolveQuestTaskWording(task, offer, locale);
}

function makeCampaignDraft(quest?: ResponseQuestDate | null): CampaignDraft {
  return {
    startDate: toBangkokDateTimeInput(quest?.start_date),
    endDate: toBangkokDateTimeInput(quest?.end_date),
    facebookPage: sanitizeQuestCampaignText(quest?.facebook_page),
    facebookPost: sanitizeQuestCampaignText(quest?.facebook_post),
    line: sanitizeQuestCampaignText(quest?.line),
    bannerEn: null,
    bannerTh: null,
    subBannerEn: null,
    subBannerTh: null,
  };
}

function makeTaskConfigDraft(
  quest?: ResponseQuestDate | null,
): TaskConfigDraft {
  return {
    audienceKind: quest?.audience?.kind ?? "all",
    tierIds:
      quest?.audience?.kind === "membership_tiers"
        ? [...new Set(quest.audience.tier_ids)].sort()
        : [],
    maxAwardsPerUser:
      quest?.reward_caps?.max_awards_per_user == null
        ? ""
        : String(quest.reward_caps.max_awards_per_user),
    maxReferralsPerUser:
      quest?.reward_caps?.max_referrals_per_user == null
        ? ""
        : String(quest.reward_caps.max_referrals_per_user),
  };
}

function optionalPositiveInteger(value: string): number | null {
  if (!value.trim()) return null;
  return Number(value);
}

function buildTaskConfigPayload(
  draft: TaskConfigDraft,
): Pick<QuestTaskConfigSavePayload, "audience" | "reward_caps"> {
  const tierIds = [...new Set(draft.tierIds.map((value) => value.trim()))]
    .filter(Boolean)
    .sort();
  return {
    audience:
      draft.audienceKind === "membership_tiers"
        ? { kind: "membership_tiers", tier_ids: tierIds }
        : { kind: "all" },
    reward_caps: {
      max_awards_per_user: optionalPositiveInteger(draft.maxAwardsPerUser),
      max_referrals_per_user: optionalPositiveInteger(
        draft.maxReferralsPerUser,
      ),
    },
  };
}

function validateTaskConfig(draft: TaskConfigDraft): string | null {
  const { audience } = buildTaskConfigPayload(draft);
  if (
    draft.audienceKind === "membership_tiers" &&
    audience.kind === "membership_tiers" &&
    audience.tier_ids.length === 0
  ) {
    return "Add at least one membership tier for the selected audience.";
  }
  for (const [label, value] of [
    ["Max awards per user", draft.maxAwardsPerUser],
    ["Max referrals per user", draft.maxReferralsPerUser],
  ] as const) {
    if (
      value.trim() &&
      (!Number.isSafeInteger(Number(value)) || Number(value) < 1)
    ) {
      return `${label} must be a positive whole number or left blank.`;
    }
  }
  return null;
}

function questTaskSaveErrorMessage(error: unknown): string {
  const responseData =
    error && typeof error === "object" && "response" in error
      ? (error as { response?: { data?: { code?: unknown } } }).response?.data
      : undefined;
  if (responseData?.code === "QUEST_TASK_CONFIG_FROZEN") {
    return "Quest economics are frozen because the campaign started or progress exists. Only customer wording and notes can be edited; create a future quest revision for economic changes.";
  }
  if (
    responseData?.code === "QUEST_CONFIG_REVISION_CONFLICT" ||
    responseData?.code === "QUEST_TASK_CONFIG_REVISION_CONFLICT"
  ) {
    return "Quest task settings changed in another session. Reload the quest, review the latest settings, and retry.";
  }
  if (responseData?.code === "QUEST_TASK_V2_UNAVAILABLE") {
    return "Referral and spend tasks are not available in this environment. Save a brand-only legacy quest, or enable the task-v2 worker and replica-set transaction topology first.";
  }
  return getApiErrorMessage(
    error,
    "Couldn't save the complete quest. The campaign may have been created, so review the settings and retry to finish it.",
  );
}

function makeTaskDrafts(quest?: ResponseQuestDate | null): TaskDraft[] {
  return [...(quest?.tasks ?? [])]
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((task, index) => {
      const offer = getTaskOffer(task);
      const wording = normalizeQuestTaskWordingDraft(task);
      return {
        clientId: task.task_key || `${task.task_type}-${index}`,
        task_key: task.task_key,
        task_type: task.task_type ?? "brand_purchase",
        points: normalizeQuestTaskPoints(
          Number(task.points ?? task.extra_point),
          offer,
        ),
        sort_order: index,
        enabled: task.enabled !== false,
        wording_en: wording.wording_en,
        wording_th: wording.wording_th,
        notes: task.notes ?? "",
        ...(task.task_type === "friend_referral"
          ? { completion_rule: task.completion_rule ?? "account_created" }
          : {}),
        ...(task.task_type === "spend_target"
          ? {
              spend_scope: "any_shop_via_ggc" as const,
              target_thb_minor: Number(task.target_thb_minor ?? 0),
            }
          : {}),
        ...(task.task_type === "brand_purchase" || !task.task_type
          ? {
              offer: getTaskOfferId(task),
              offer_id: Number(task.offer_id),
              merchant_id: Number(task.merchant_id),
            }
          : {}),
      };
    });
}

function makeRewardDrafts(quest?: ResponseQuestDate | null): RewardDraft[] {
  return [...(quest?.rewards ?? [])]
    .sort((a, b) => Number(a.rank ?? 0) - Number(b.rank ?? 0))
    .map((reward, index) => ({
      clientId: `reward-${reward.rank}-${index}`,
      rank: Number(reward.rank),
      reward: Number(reward.reward),
      currency: reward.currency || "THB",
    }));
}

function makeRewardDistributionDraft(
  quest?: ResponseQuestDate | null,
): RewardDistributionDraft {
  const mode = quest?.reward_distribution_mode ?? "campaign_end";
  return {
    mode,
    delayDays:
      mode === "after_days"
        ? Math.max(1, Number(quest?.reward_distribution_delay_days ?? 7))
        : 0,
  };
}

function formatBangkokSchedule(value?: Date | string | null): string {
  const inputValue = toBangkokDateTimeInput(value);
  if (!inputValue) return "Not scheduled";
  const [date, time] = inputValue.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year} ${time} Bangkok time`;
}

function rewardDistributionPreview(
  endDateInput: string,
  distribution: RewardDistributionDraft,
): string {
  if (distribution.mode === "manual") {
    return "Admin will distribute rewards manually.";
  }

  const endDateIso = bangkokDateTimeInputToISOString(endDateInput);
  const endTime = new Date(endDateIso).getTime();
  if (!endDateIso || Number.isNaN(endTime)) {
    return "Set a campaign end time to calculate the payout schedule.";
  }

  const delayDays =
    distribution.mode === "after_days" ? Number(distribution.delayDays) : 0;
  const scheduledAt = new Date(endTime + delayDays * 86_400_000);
  return `Scheduled for ${formatBangkokSchedule(scheduledAt)}`;
}

function rewardForRank(
  rewards: QuestReward[] | undefined,
  rank: number,
): QuestReward {
  return (
    rewards?.find((reward) => Number(reward.rank) === rank) ?? {
      rank,
      reward: 0,
      currency: "THB",
    }
  );
}

function formatReward(amount: number, currency: string): string {
  return `${Number(amount || 0).toLocaleString()} ${currency || "THB"}`;
}

function summaryForTask(
  summaries: QuestTaskDeeplinkSummary[],
  task: TaskDraft,
): QuestTaskDeeplinkSummary | undefined {
  if (task.task_type !== "brand_purchase") return undefined;
  return summaries.find(
    (s) => s.offer_id === task.offer_id && s.merchant_id === task.merchant_id,
  );
}

export type QuestTableView = "list" | "create" | "edit";

export default function QuestTable({
  view = "list",
  questId,
}: {
  view?: QuestTableView;
  questId?: string;
}) {
  const queryClient = useQueryClient();
  const { role } = usePermissions();
  const canEditCampaign = role === "super_admin";
  const canEditTasks = role === "super_admin";

  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(
    questId ?? null,
  );
  const [creatingNew, setCreatingNew] = useState(view === "create");
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft>(
    makeCampaignDraft(null),
  );
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([]);
  const [taskConfigDraft, setTaskConfigDraft] = useState<TaskConfigDraft>(
    makeTaskConfigDraft(null),
  );
  const [rewardDrafts, setRewardDrafts] = useState<RewardDraft[]>([]);
  const [rewardDistributionDraft, setRewardDistributionDraft] =
    useState<RewardDistributionDraft>(makeRewardDistributionDraft(null));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasIncompleteSettingsSave, setHasIncompleteSettingsSave] =
    useState(false);
  const [offerLookup, setOfferLookup] = useState<Record<string, Offer>>({});
  const [activeDetailTab, setActiveDetailTab] =
    useState<QuestDetailTab>("tasks");
  const campaignRequestRef = useRef<QuestCampaignRequest | null>(null);
  const committedCampaignRef = useRef<{
    draftFingerprint: string;
    quest: ResponseQuestDate;
    taskFingerprint?: string;
    taskQuest?: ResponseQuestDate;
    taskRewardModel?: QuestRewardModel;
  } | null>(null);

  const questsQuery = useQuery({
    queryKey: questListQueryKey,
    queryFn: fetchAdminQuests,
  });
  const quests = questsQuery.data ?? EMPTY_QUESTS;

  const selectedQuest = useMemo(() => {
    if (view === "list") return null;
    if (creatingNew) return null;
    if (selectedQuestId) {
      return quests.find((quest) => quest._id === selectedQuestId) ?? null;
    }
    return null;
  }, [creatingNew, quests, selectedQuestId, view]);

  const offersQuery = useQuery({
    queryKey: offersListQueryKey(OFFERS_QUERY),
    queryFn: () => fetchOffersList(OFFERS_QUERY),
    enabled: view !== "list",
    staleTime: 30_000,
  });
  const offers = offersQuery.data?.data ?? EMPTY_OFFERS;
  const membershipTiersQuery = useQuery({
    queryKey: ["admin", "membership", "tiers", "quest-audience"],
    queryFn: getMembershipTiers,
    enabled: view !== "list",
    staleTime: 30_000,
  });
  const membershipTiers = membershipTiersQuery.data ?? EMPTY_MEMBERSHIP_TIERS;
  const offersById = useMemo(() => {
    const map = new Map<string, Offer>();
    for (const offer of offers) {
      map.set(offer._id, offer);
    }
    for (const offer of Object.values(offerLookup)) {
      map.set(offer._id, offer);
    }
    for (const task of selectedQuest?.tasks ?? []) {
      const embedded = getTaskOffer(task);
      if (embedded) {
        map.set(embedded._id, embedded);
      }
    }
    return map;
  }, [offerLookup, offers, selectedQuest]);

  const deeplinkSummaryQuery = useQuery({
    queryKey: questTaskDeeplinkSummaryQueryKey(selectedQuest?._id ?? ""),
    queryFn: () => fetchQuestTaskDeeplinkSummary(selectedQuest?._id ?? ""),
    enabled: view !== "list" && Boolean(selectedQuest?._id),
  });
  const deeplinkSummaries = deeplinkSummaryQuery.data?.data ?? [];

  const leaderboardQuery = useQuery({
    queryKey: questLeaderboardQueryKey(selectedQuest?._id ?? ""),
    queryFn: () => fetchQuestLeaderboard(selectedQuest?._id ?? ""),
    enabled: view === "edit" && Boolean(selectedQuest?._id),
  });
  const leaderboardRows = leaderboardQuery.data?.data ?? [];
  const leaderboardRewards = leaderboardQuery.data?.rewards ?? [];
  const isLatestAvailableLeaderboard =
    leaderboardQuery.data?.data_source === "latest_available";

  const activeQuestId = selectedQuest?._id ?? null;
  const [draftSourceQuestId, setDraftSourceQuestId] = useState<string | null>(
    null,
  );
  if (!creatingNew && activeQuestId && activeQuestId !== draftSourceQuestId) {
    setDraftSourceQuestId(activeQuestId);
    setCampaignDraft(makeCampaignDraft(selectedQuest));
    setTaskDrafts(makeTaskDrafts(selectedQuest));
    setTaskConfigDraft(makeTaskConfigDraft(selectedQuest));
    setRewardDrafts(makeRewardDrafts(selectedQuest));
    setRewardDistributionDraft(makeRewardDistributionDraft(selectedQuest));
    setSaveError(null);
  }

  const campaignBaseline = useMemo(
    () => makeCampaignDraft(selectedQuest),
    [selectedQuest],
  );
  const tasksBaseline = useMemo(
    () => ({
      ...buildTaskConfigPayload(makeTaskConfigDraft(selectedQuest)),
      tasks: buildQuestTaskPayloads(makeTaskDrafts(selectedQuest)),
    }),
    [selectedQuest],
  );
  const taskConfigPayload = useMemo(
    () => buildTaskConfigPayload(taskConfigDraft),
    [taskConfigDraft],
  );
  const currentTaskPayloads = useMemo(
    () =>
      taskDrafts.every((task) => task.task_type)
        ? buildQuestTaskPayloads(taskDrafts)
        : null,
    [taskDrafts],
  );
  const rewardsBaseline = useMemo(
    () =>
      buildQuestRewardSavePayload(
        makeRewardDrafts(selectedQuest),
        makeRewardDistributionDraft(selectedQuest),
      ),
    [selectedQuest],
  );
  const rewardsPayload = useMemo(
    () => buildQuestRewardSavePayload(rewardDrafts, rewardDistributionDraft),
    [rewardDrafts, rewardDistributionDraft],
  );
  const campaignDirty =
    creatingNew || !sameJson(campaignDraft, campaignBaseline);
  const tasksDirty = !sameJson(
    currentTaskPayloads
      ? { ...taskConfigPayload, tasks: currentTaskPayloads }
      : { ...taskConfigPayload, drafts: taskDrafts },
    tasksBaseline,
  );
  const rewardsDirty = !sameJson(rewardsPayload, rewardsBaseline);
  const taskValidationError =
    validateQuestTasks(taskDrafts) ?? validateTaskConfig(taskConfigDraft);
  const rewardValidationError =
    validateQuestRewards(rewardDrafts) ??
    validateQuestRewardDistribution(rewardDistributionDraft);
  const bannerValidationError =
    creatingNew && !hasCompleteQuestBannerSet(campaignDraft)
      ? QUEST_BANNERS_REQUIRED_MESSAGE
      : null;
  const combinedDirty =
    campaignDirty || tasksDirty || rewardsDirty || hasIncompleteSettingsSave;
  const derivedCampaignStatus =
    campaignDraft.startDate && campaignDraft.endDate
      ? deriveQuestStatus(
          bangkokDateTimeInputToISOString(campaignDraft.startDate),
          bangkokDateTimeInputToISOString(campaignDraft.endDate),
        )
      : "scheduled";

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const committedCampaign = committedCampaignRef.current;
      const campaignIdentity = committedCampaign?.quest ?? selectedQuest;
      const isInitialCreate = creatingNew && !committedCampaign;
      const questIdForSave = isInitialCreate
        ? null
        : (campaignIdentity?._id ?? selectedQuestId);
      const campaignInput = {
        campaignRevision: isInitialCreate
          ? 0
          : (campaignIdentity?.campaign_revision ?? 0),
        configRevision: isInitialCreate
          ? 0
          : (campaignIdentity?.config_revision ?? 0),
        questId: questIdForSave,
        startDate: bangkokDateTimeInputToISOString(campaignDraft.startDate),
        endDate: bangkokDateTimeInputToISOString(campaignDraft.endDate),
        // Kept during rollout for compatibility with older API revisions. The
        // current API ignores this field and derives status from the dates.
        status: derivedCampaignStatus,
        facebookPage: campaignDraft.facebookPage,
        facebookPost: campaignDraft.facebookPost,
        line: campaignDraft.line,
        bannerEn: campaignDraft.bannerEn,
        bannerTh: campaignDraft.bannerTh,
        subBannerEn: campaignDraft.subBannerEn,
        subBannerTh: campaignDraft.subBannerTh,
      };
      const draftFingerprint = questCampaignFingerprint({
        ...campaignInput,
        campaignRevision: 0,
        configRevision: 0,
        questId: null,
      });
      let campaign =
        committedCampaign?.draftFingerprint === draftFingerprint
          ? committedCampaign.quest
          : null;
      if (!campaign) {
        const fingerprint = questCampaignFingerprint(campaignInput);
        campaignRequestRef.current = nextQuestCampaignRequest(
          campaignRequestRef.current,
          fingerprint,
        );
        const fd = buildQuestCampaignFormData({
          ...campaignInput,
          requestKey: campaignRequestRef.current.requestKey,
        });
        campaign = await saveQuestCampaign(fd);
        committedCampaignRef.current = { draftFingerprint, quest: campaign };

        // Adopt a committed create before saving its settings. Pinning both the
        // draft source and id preserves in-progress task/reward drafts, while a
        // later campaign change becomes an id+revision CAS update instead of a
        // second deterministic create.
        queryClient.setQueryData<ResponseQuestDate[]>(
          questListQueryKey,
          (current = []) => [
            campaign!,
            ...current.filter((item) => item._id !== campaign!._id),
          ],
        );
        setSelectedQuestId(campaign._id);
        setDraftSourceQuestId(campaign._id);
        setCreatingNew(false);
        setHasIncompleteSettingsSave(true);
      }

      const draftTaskPayloads =
        currentTaskPayloads ?? buildQuestTaskPayloads(taskDrafts);
      const campaignTaskPayloads = draftTaskPayloads.map((task, index) => {
        const committedTaskKey = campaign.tasks?.[index]?.task_key;
        return committedTaskKey
          ? { ...task, task_key: committedTaskKey }
          : task;
      });
      const taskRewardModel: QuestRewardModel =
        taskDrafts.some(
          (task) =>
            task.task_type === "friend_referral" ||
            task.task_type === "spend_target",
        ) ||
        taskConfigPayload.audience.kind !== "all" ||
        taskConfigPayload.reward_caps.max_awards_per_user !== null ||
        taskConfigPayload.reward_caps.max_referrals_per_user !== null
          ? "task_v2"
          : isInitialCreate
            ? "legacy_v1"
            : (committedCampaign?.taskRewardModel ??
              campaign.reward_model ??
              "legacy_v1");
      const taskPayload: QuestTaskConfigSavePayload = {
        reward_model: taskRewardModel,
        expected_config_revision: Number(campaign.config_revision ?? 0),
        timezone: "Asia/Bangkok",
        audience: taskConfigPayload.audience,
        reward_caps: taskConfigPayload.reward_caps,
        // A schedule revision rotates task identities atomically in the
        // campaign endpoint. Adopt those committed keys before the task save
        // so its config CAS continues from the server's new identity set.
        tasks: campaignTaskPayloads,
      };
      const taskFingerprint = JSON.stringify({
        ...taskPayload,
        expected_config_revision: 0,
      });
      const hasCommittedTaskStage = Boolean(
        committedCampaign?.taskFingerprint === taskFingerprint &&
        committedCampaign.taskQuest,
      );
      const mustSaveTaskStage =
        isInitialCreate ||
        tasksDirty ||
        Boolean(committedCampaign && !committedCampaign.taskFingerprint);
      const taskQuest = hasCommittedTaskStage
        ? campaign
        : mustSaveTaskStage
          ? await saveQuestTasks(campaign._id, taskPayload)
          : campaign;
      committedCampaignRef.current = {
        draftFingerprint,
        quest: { ...campaign, ...taskQuest },
        taskFingerprint,
        taskQuest,
        taskRewardModel,
      };
      const rewardQuest = await saveQuestRewards(campaign._id, {
        ...rewardsPayload,
        expected_config_revision: Number(
          taskQuest.config_revision ?? campaign.config_revision ?? 0,
        ),
      });
      return {
        ...campaign,
        ...taskQuest,
        ...rewardQuest,
        tasks: taskQuest.tasks ?? campaign.tasks,
        rewards: rewardQuest.rewards ?? campaign.rewards,
      };
    },
    onSuccess: (quest) => {
      queryClient.setQueryData<ResponseQuestDate[]>(
        questListQueryKey,
        (current = []) => [
          quest,
          ...current.filter((item) => item._id !== quest._id),
        ],
      );
      setCreatingNew(false);
      setSelectedQuestId(quest._id);
      setDraftSourceQuestId(null);
      setHasIncompleteSettingsSave(false);
      committedCampaignRef.current = null;
      setSaveError(null);
      void queryClient.invalidateQueries({ queryKey: questListQueryKey });
      void queryClient.invalidateQueries({
        queryKey: questTaskDeeplinkSummaryQueryKey(quest._id),
      });
      void queryClient.invalidateQueries({
        queryKey: questLeaderboardQueryKey(quest._id),
      });
    },
    onError: (error) => {
      setSaveError(questTaskSaveErrorMessage(error));
    },
  });

  const addTask = () => {
    setTaskDrafts((current) => [
      ...current,
      {
        clientId: `new-task-${Date.now()}`,
        task_type: null,
        points: 50,
        sort_order: current.length,
        enabled: true,
        wording_en: "",
        wording_th: "",
        notes: "",
      },
    ]);
  };

  const updateTaskType = (index: number, taskType: QuestTaskType) => {
    setTaskDrafts((current) =>
      current.map((task, i) =>
        i === index ? switchQuestTaskType(task, taskType) : task,
      ),
    );
  };

  const updateTaskOffer = (index: number, offer: Offer) => {
    setOfferLookup((current) => ({ ...current, [offer._id]: offer }));
    setTaskDrafts((current) =>
      current.map((task, i) => {
        if (i !== index) return task;
        const previousOffer = task.offer
          ? offersById.get(task.offer)
          : undefined;
        const previousEnDefault = defaultQuestTaskWording(previousOffer, "en");
        const previousThDefault = defaultQuestTaskWording(previousOffer, "th");
        const replaceEn = shouldReplaceQuestWording(
          task.wording_en,
          previousEnDefault,
        );
        const replaceTh = shouldReplaceQuestWording(
          task.wording_th,
          previousThDefault,
        );
        return {
          ...task,
          task_type: "brand_purchase" as const,
          offer: offer._id,
          offer_id: offer.offer_id,
          merchant_id: offer.merchant_id,
          points:
            Number(task.points) >= 2 && Number(task.points) <= 10000
              ? Number(task.points)
              : defaultQuestTaskPoints(offer),
          wording_en: replaceEn ? "" : (task.wording_en ?? ""),
          wording_th: replaceTh ? "" : (task.wording_th ?? ""),
        };
      }),
    );
  };

  const moveTask = (index: number, delta: -1 | 1) => {
    setTaskDrafts((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((task, i) => ({ ...task, sort_order: i }));
    });
  };

  const removeTask = (index: number) => {
    setTaskDrafts((current) =>
      current
        .filter((_, i) => i !== index)
        .map((task, i) => ({ ...task, sort_order: i })),
    );
  };

  const addReward = () => {
    const usedRanks = new Set(rewardDrafts.map((reward) => reward.rank));
    let nextRank = rewardDrafts.length + 1;
    while (usedRanks.has(nextRank)) nextRank += 1;
    setRewardDrafts((current) => [
      ...current,
      {
        clientId: `reward-new-${Date.now()}`,
        rank: nextRank,
        reward: 0,
        currency: "THB",
      },
    ]);
  };

  const updateReward = (
    index: number,
    patch: Partial<Omit<RewardDraft, "clientId">>,
  ) => {
    setRewardDrafts((current) =>
      current.map((reward, i) =>
        i === index ? { ...reward, ...patch } : reward,
      ),
    );
  };

  const removeReward = (index: number) => {
    setRewardDrafts((current) => current.filter((_, i) => i !== index));
  };

  if (view === "list") {
    return (
      <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h3 className="truncate text-base font-medium text-gray-800 dark:text-white/90">
              Quest Management
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Total: {quests.length}
            </p>
          </div>
          <Link
            href="/quest/create"
            aria-disabled={!canEditCampaign}
            className={`bg-brand-500 shadow-theme-xs hover:bg-brand-600 inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-white transition ${
              canEditCampaign ? "" : "pointer-events-none opacity-50"
            }`}
          >
            Create quest
          </Link>
        </div>

        <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700">
          {questsQuery.isLoading ? (
            <div className="p-6 text-sm text-gray-500">Loading quests...</div>
          ) : questsQuery.isError ? (
            <div role="alert" className="p-6 text-sm text-red-600">
              {getApiErrorMessage(
                questsQuery.error,
                "Couldn't load quests. Please retry or contact an administrator.",
              )}
            </div>
          ) : quests.length === 0 ? (
            <NoData>No quests found.</NoData>
          ) : (
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableCell isHeader className="px-5 py-3">
                    Campaign
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3">
                    Schedule
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3">
                    Status
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right">
                    Tasks
                  </TableCell>
                  <TableCell isHeader className="px-5 py-3 text-right">
                    Action
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quests.map((quest) => {
                  const status = deriveQuestStatus(
                    quest.start_date,
                    quest.end_date,
                  );
                  return (
                    <TableRow key={quest._id}>
                      <TableCell className="px-5 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {quest._id.slice(-8)}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(quest.start_date)} -{" "}
                        {formatDate(quest.end_date)}
                      </TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge size="sm" color={questStatusBadgeColor(status)}>
                          {questStatusLabel(status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right text-sm text-gray-700 dark:text-gray-300">
                        {quest.tasks?.length ?? 0}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right">
                        <Link
                          href={`/quest/${quest._id}/edit`}
                          className="text-brand-600 hover:text-brand-700 dark:text-brand-400 text-sm font-medium hover:underline"
                        >
                          Edit
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    );
  }

  if (view === "edit" && (questsQuery.isLoading || !selectedQuest)) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
        <p
          role={!questsQuery.isLoading ? "alert" : undefined}
          className="text-sm text-gray-600 dark:text-gray-300"
        >
          {questsQuery.isLoading
            ? "Loading quest…"
            : questsQuery.isError
              ? getApiErrorMessage(
                  questsQuery.error,
                  "Couldn't load this quest. Please retry or return to the quest list.",
                )
              : "Quest not found. It may have been removed."}
        </p>
        {!questsQuery.isLoading && (
          <Link
            href="/quest"
            className="text-brand-600 dark:text-brand-400 mt-4 inline-block text-sm font-medium hover:underline"
          >
            Back to quest list
          </Link>
        )}
      </div>
    );
  }

  const selectedQuestLabel = selectedQuest
    ? `${formatDate(selectedQuest.start_date)} - ${formatDate(selectedQuest.end_date)}`
    : "New Quest";
  const taskEconomicsFrozen = Boolean(
    !creatingNew &&
    selectedQuest &&
    selectedQuest.reward_model === "task_v2" &&
    (selectedQuest.task_v2_state_frozen_at ||
      deriveQuestStatus(selectedQuest.start_date, selectedQuest.end_date) !==
        "scheduled"),
  );
  const canEditTaskEconomics = canEditTasks && !taskEconomicsFrozen;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-t border-gray-100 dark:border-gray-700">
        <div data-testid="quest-detail-editor" className="min-w-0 p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {creatingNew ? "Create quest" : selectedQuestLabel}
              </h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Configure the campaign, tasks, and rewards, then save once.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/quest"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
              >
                Back to quest list
              </Link>
              {selectedQuest && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setDetailsOpen(true)}
                >
                  Preview
                </Button>
              )}
            </div>
          </div>

          {saveError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {saveError}
            </div>
          )}

          <section className="mb-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <DatePicker
                  id="quest-campaign-start-date"
                  label="Start date and time"
                  required
                  ariaLabel="Quest start date and time"
                  hint={BANGKOK_TIMEZONE_LABEL}
                  enableTime
                  altInput
                  dateFormat={ADMIN_DATETIME_VALUE_FORMAT}
                  altFormat={ADMIN_DATETIME_ALT_FORMAT}
                  minuteIncrement={1}
                  value={campaignDraft.startDate}
                  disabled={!canEditCampaign || taskEconomicsFrozen}
                  onValueChange={(value) =>
                    setCampaignDraft((draft) => ({
                      ...draft,
                      startDate: value,
                    }))
                  }
                />
              </div>
              <div>
                <DatePicker
                  id="quest-campaign-end-date"
                  label="End date and time"
                  required
                  ariaLabel="Quest end date and time"
                  hint={BANGKOK_TIMEZONE_LABEL}
                  enableTime
                  altInput
                  dateFormat={ADMIN_DATETIME_VALUE_FORMAT}
                  altFormat={ADMIN_DATETIME_ALT_FORMAT}
                  minuteIncrement={1}
                  value={campaignDraft.endDate}
                  disabled={!canEditCampaign || taskEconomicsFrozen}
                  onValueChange={(value) =>
                    setCampaignDraft((draft) => ({
                      ...draft,
                      endDate: value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Status derived from schedule</Label>
                <div
                  aria-label="Derived quest status"
                  className="flex h-11 items-center rounded-lg border border-gray-200 bg-gray-50 px-4 dark:border-gray-700 dark:bg-gray-900"
                >
                  <Badge
                    size="sm"
                    color={questStatusBadgeColor(derivedCampaignStatus)}
                  >
                    {questStatusLabel(derivedCampaignStatus)}
                  </Badge>
                </div>
              </div>
              <div>
                <Label htmlFor="quest-campaign-facebook-page">
                  Facebook page
                </Label>
                <Input
                  id="quest-campaign-facebook-page"
                  name="facebook_page"
                  value={campaignDraft.facebookPage}
                  disabled={!canEditCampaign}
                  onChange={(e) =>
                    setCampaignDraft((draft) => ({
                      ...draft,
                      facebookPage: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="quest-campaign-facebook-post">
                  Facebook post
                </Label>
                <Input
                  id="quest-campaign-facebook-post"
                  name="facebook_post"
                  value={campaignDraft.facebookPost}
                  disabled={!canEditCampaign}
                  onChange={(e) =>
                    setCampaignDraft((draft) => ({
                      ...draft,
                      facebookPost: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="quest-campaign-line-link">LINE link</Label>
                <Input
                  id="quest-campaign-line-link"
                  name="line"
                  value={campaignDraft.line}
                  disabled={!canEditCampaign}
                  onChange={(e) =>
                    setCampaignDraft((draft) => ({
                      ...draft,
                      line: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  ["Banner EN", "bannerEn", "banner_en"],
                  ["Banner TH", "bannerTh", "banner_th"],
                  ["Sub banner EN", "subBannerEn", "sub_banner_en"],
                  ["Sub banner TH", "subBannerTh", "sub_banner_th"],
                ] as const
              ).map(([label, key, dbField]) => {
                const fieldId = `quest-campaign-${key}`;
                const resolvedBanner = pathImage(
                  selectedQuest?.[dbField],
                  "banner",
                );
                const hasExistingBanner =
                  !creatingNew &&
                  !!resolvedBanner &&
                  !resolvedBanner.includes("placehold.co");
                return (
                  <div key={key}>
                    <Label htmlFor={fieldId}>
                      {label}
                      {creatingNew ? (
                        <span className="ml-1 text-red-600" aria-hidden="true">
                          *
                        </span>
                      ) : null}
                    </Label>
                    {hasExistingBanner ? (
                      <div className="mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolvedBanner}
                          alt={`Current ${label}`}
                          className="h-20 w-full rounded-lg border border-gray-200 object-cover dark:border-gray-700"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Current image — choose a file to replace.
                        </p>
                      </div>
                    ) : null}
                    <input
                      id={fieldId}
                      name={key}
                      aria-label={label}
                      type="file"
                      accept="image/*"
                      required={creatingNew}
                      disabled={!canEditCampaign}
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setCampaignDraft((draft) => ({
                          ...draft,
                          [key]: file,
                        }));
                      }}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                );
              })}
            </div>
            {bannerValidationError ? (
              <p
                className="mt-2 text-xs text-red-600 dark:text-red-400"
                role="alert"
              >
                {bannerValidationError}
              </p>
            ) : null}
          </section>

          {!creatingNew &&
          selectedQuest &&
          selectedQuest.reward_model !== "task_v2" ? (
            <div
              role="note"
              className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            >
              <span className="font-semibold">Legacy quest.</span> Brand tasks
              are managed per-offer in the Offers module (each offer&rsquo;s{" "}
              <code className="rounded bg-amber-100 px-1 dark:bg-amber-500/20">
                extra_point
              </code>
              ). The Tasks and Rewards tabs below apply to task-v2 quests, so a
              count of 0 here is expected.
            </div>
          ) : null}

          <div
            role="tablist"
            aria-label="Quest campaign management"
            className={`mb-5 grid gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-900 ${
              view === "create" ? "sm:grid-cols-2" : "sm:grid-cols-3"
            }`}
          >
            {QUEST_DETAIL_TABS.filter(
              (tab) => view !== "create" || tab.key !== "leaderboard",
            ).map((tab) => {
              const active = activeDetailTab === tab.key;
              const count =
                tab.key === "tasks"
                  ? taskDrafts.length
                  : tab.key === "leaderboard"
                    ? leaderboardRows.length
                    : rewardDrafts.length;
              return (
                <button
                  key={tab.key}
                  id={`quest-detail-tab-${tab.key}`}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`quest-detail-panel-${tab.key}`}
                  className={detailTabButtonClass(active)}
                  onClick={() => setActiveDetailTab(tab.key)}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>{tab.label}</span>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {count}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">
                    {tab.description}
                  </span>
                </button>
              );
            })}
          </div>

          {activeDetailTab === "tasks" && (
            <section
              id="quest-detail-panel-tasks"
              role="tabpanel"
              aria-labelledby="quest-detail-tab-tasks"
            >
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                    Quest tasks
                  </h5>
                  {taskValidationError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                      {taskValidationError}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canEditTaskEconomics}
                  onClick={addTask}
                >
                  Add task
                </Button>
              </div>

              {taskEconomicsFrozen && (
                <p
                  role="status"
                  className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                >
                  Quest economics are frozen after the campaign starts or
                  records progress. Customer wording and notes remain editable.
                </p>
              )}

              <div className="mb-4 grid gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 md:grid-cols-2 xl:grid-cols-4 dark:border-gray-700 dark:bg-gray-900/40">
                <div>
                  <label
                    htmlFor="quest-task-audience"
                    className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Audience
                  </label>
                  <select
                    id="quest-task-audience"
                    aria-label="Quest audience"
                    value={taskConfigDraft.audienceKind}
                    disabled={!canEditTaskEconomics}
                    onChange={(event) => {
                      const audienceKind = event.currentTarget
                        .value as QuestAudience["kind"];
                      setTaskConfigDraft((current) => ({
                        ...current,
                        audienceKind,
                      }));
                    }}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="all">All customers</option>
                    <option value="membership_tiers">Membership tiers</option>
                  </select>
                </div>
                {taskConfigDraft.audienceKind === "membership_tiers" && (
                  <fieldset
                    className="rounded-lg border border-gray-200 bg-white p-3 md:col-span-2 dark:border-gray-700 dark:bg-gray-900"
                    aria-describedby="quest-task-tier-help"
                  >
                    <legend className="px-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Membership tiers
                    </legend>
                    <p
                      id="quest-task-tier-help"
                      className="mb-2 text-xs text-gray-500 dark:text-gray-400"
                    >
                      Select active tiers. Saved inactive tiers remain visible
                      but cannot be newly selected.
                    </p>
                    {membershipTiersQuery.isLoading ? (
                      <p role="status" className="text-sm text-gray-500">
                        Loading membership tiers…
                      </p>
                    ) : membershipTiersQuery.isError ? (
                      <div role="alert" className="text-sm text-red-600">
                        <p>Could not load membership tiers.</p>
                        <button
                          type="button"
                          className="mt-1 underline"
                          onClick={() => void membershipTiersQuery.refetch()}
                        >
                          Retry tier loading
                        </button>
                      </div>
                    ) : membershipTiers.length === 0 &&
                      taskConfigDraft.tierIds.length === 0 ? (
                      <p role="status" className="text-sm text-gray-500">
                        No active membership tiers are available.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          ...membershipTiers,
                          ...taskConfigDraft.tierIds
                            .filter(
                              (tierId) =>
                                !membershipTiers.some(
                                  (tier) => tier.id === tierId,
                                ),
                            )
                            .map((tierId): MembershipTier => ({
                              id: tierId,
                              name: `Unavailable tier (${tierId})`,
                              description: "",
                              monthlyPrice: 0,
                              annualPrice: 0,
                              color: "#64748b",
                              icon: "star",
                              benefits: [],
                              cashbackRate: 0,
                              maxCashbackPerMonth: 0,
                              isActive: false,
                              memberCount: 0,
                            })),
                        ].map((tier) => {
                          const checked = taskConfigDraft.tierIds.includes(
                            tier.id,
                          );
                          const inactive = !tier.isActive;
                          return (
                            <label
                              key={tier.id}
                              className="flex items-start gap-2 rounded-md border border-gray-100 px-2 py-2 text-sm dark:border-gray-800"
                            >
                              <input
                                type="checkbox"
                                name="quest-membership-tier"
                                value={tier.id}
                                checked={checked}
                                disabled={
                                  !canEditTaskEconomics ||
                                  (inactive && !checked)
                                }
                                onChange={(event) => {
                                  const checked = event.currentTarget.checked;
                                  setTaskConfigDraft((current) => ({
                                    ...current,
                                    tierIds: checked
                                      ? [...current.tierIds, tier.id]
                                      : current.tierIds.filter(
                                          (tierId) => tierId !== tier.id,
                                        ),
                                  }));
                                }}
                              />
                              <span>
                                {tier.name}
                                {inactive ? " (inactive)" : ""}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </fieldset>
                )}
                <div>
                  <label
                    htmlFor="quest-task-max-awards"
                    className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Max awards per user
                  </label>
                  <Input
                    id="quest-task-max-awards"
                    name="quest-task-max-awards"
                    type="number"
                    min="1"
                    value={taskConfigDraft.maxAwardsPerUser}
                    disabled={!canEditTaskEconomics}
                    placeholder="No cap"
                    onChange={(event) =>
                      setTaskConfigDraft((current) => ({
                        ...current,
                        maxAwardsPerUser: event.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="quest-task-max-referrals"
                    className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Max referrals per user
                  </label>
                  <Input
                    id="quest-task-max-referrals"
                    name="quest-task-max-referrals"
                    type="number"
                    min="1"
                    value={taskConfigDraft.maxReferralsPerUser}
                    disabled={!canEditTaskEconomics}
                    placeholder="No cap"
                    onChange={(event) =>
                      setTaskConfigDraft((current) => ({
                        ...current,
                        maxReferralsPerUser: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                {taskDrafts.map((task, index) => {
                  const offer = task.offer
                    ? offersById.get(task.offer)
                    : undefined;
                  const summary = summaryForTask(deeplinkSummaries, task);
                  const taskFieldPrefix = `quest-task-${index}`;
                  const typeFieldId = `${taskFieldPrefix}-type`;
                  const brandFieldId = `${taskFieldPrefix}-brand`;
                  const pointsFieldId = `${taskFieldPrefix}-points`;
                  const enabledFieldId = `${taskFieldPrefix}-enabled`;
                  const notesFieldId = `${taskFieldPrefix}-notes`;
                  return (
                    <article
                      key={task.clientId}
                      className="shadow-theme-xs rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <QuestTaskTypeSelect
                              id={typeFieldId}
                              value={task.task_type}
                              disabled={!canEditTaskEconomics}
                              onChange={(taskType) =>
                                updateTaskType(index, taskType)
                              }
                            />
                            {task.task_type === "brand_purchase" && (
                              <div className="mt-3">
                                <label
                                  htmlFor={brandFieldId}
                                  className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                                >
                                  Brand
                                </label>
                                <div className="flex items-center gap-3">
                                  {offer && (
                                    <RemoteOrBlobImage
                                      src={offerLogo(offer)}
                                      alt={offerLabel(offer)}
                                      width={40}
                                      height={40}
                                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <QuestTaskBrandSelect
                                      id={brandFieldId}
                                      disabled={!canEditTaskEconomics}
                                      valueOfferId={task.offer ?? ""}
                                      selectedOffer={offer}
                                      onSelect={(nextOffer) =>
                                        updateTaskOffer(index, nextOffer)
                                      }
                                    />
                                  </div>
                                </div>
                                {offer && (
                                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                    <span>Offer {task.offer_id}</span>
                                    <span>Brand {task.merchant_id}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canEditTaskEconomics || index === 0}
                            onClick={() => moveTask(index, -1)}
                          >
                            Up
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              !canEditTaskEconomics ||
                              index === taskDrafts.length - 1
                            }
                            onClick={() => moveTask(index, 1)}
                          >
                            Down
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canEditTaskEconomics}
                            onClick={() => removeTask(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>

                      {task.task_type && (
                        <>
                          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                            {task.task_type === "friend_referral" && (
                              <div>
                                <label
                                  htmlFor={`${taskFieldPrefix}-completion-rule`}
                                  className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                                >
                                  Complete invitation rule
                                </label>
                                <select
                                  id={`${taskFieldPrefix}-completion-rule`}
                                  aria-label="Complete invitation rule"
                                  value={
                                    task.completion_rule ?? "account_created"
                                  }
                                  disabled={!canEditTaskEconomics}
                                  onChange={(event) =>
                                    setTaskDrafts((current) =>
                                      current.map((row, i) =>
                                        i === index
                                          ? {
                                              ...row,
                                              completion_rule: event
                                                .currentTarget
                                                .value as NonNullable<
                                                TaskDraft["completion_rule"]
                                              >,
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                >
                                  <option value="account_created">
                                    Friend creates an account
                                  </option>
                                  <option value="first_earning_conversion">
                                    Friend completes an earning conversion
                                  </option>
                                </select>
                              </div>
                            )}
                            {task.task_type === "spend_target" && (
                              <div>
                                <label
                                  htmlFor={`${taskFieldPrefix}-spend-target`}
                                  className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                                >
                                  Spend target (THB)
                                </label>
                                <input
                                  id={`${taskFieldPrefix}-spend-target`}
                                  aria-label="Spend target (THB)"
                                  type="number"
                                  min={0.01}
                                  step={0.01}
                                  value={
                                    Number(task.target_thb_minor ?? 0) / 100
                                  }
                                  disabled={!canEditTaskEconomics}
                                  onChange={(event) =>
                                    setTaskDrafts((current) =>
                                      current.map((row, i) =>
                                        i === index
                                          ? {
                                              ...row,
                                              target_thb_minor: Math.round(
                                                Number(
                                                  event.currentTarget.value,
                                                ) * 100,
                                              ),
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                />
                              </div>
                            )}
                            <div>
                              <label
                                htmlFor={pointsFieldId}
                                className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                              >
                                Points
                              </label>
                              <input
                                id={pointsFieldId}
                                name={pointsFieldId}
                                type="number"
                                min={2}
                                max={10000}
                                value={task.points}
                                disabled={!canEditTaskEconomics}
                                onChange={(e) =>
                                  setTaskDrafts((current) =>
                                    current.map((row, i) =>
                                      i === index
                                        ? {
                                            ...row,
                                            points: Number(e.target.value),
                                          }
                                        : row,
                                    ),
                                  )
                                }
                                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-center text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                              />
                            </div>

                            <div>
                              <div className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                                Customer wording
                              </div>
                              <QuestTaskWordingFields
                                idPrefix={taskFieldPrefix}
                                disabled={!canEditTasks}
                                offer={offer}
                                value={{
                                  wording_en: task.wording_en ?? "",
                                  wording_th: task.wording_th ?? "",
                                }}
                                onChange={(next) =>
                                  setTaskDrafts((current) =>
                                    current.map((row, i) =>
                                      i === index
                                        ? {
                                            ...row,
                                            wording_en: next.wording_en,
                                            wording_th: next.wording_th,
                                          }
                                        : row,
                                    ),
                                  )
                                }
                              />
                            </div>

                            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300">
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <label
                                  htmlFor={enabledFieldId}
                                  className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400"
                                >
                                  Enabled
                                </label>
                                <input
                                  id={enabledFieldId}
                                  name={enabledFieldId}
                                  type="checkbox"
                                  checked={task.enabled !== false}
                                  disabled={!canEditTaskEconomics}
                                  onChange={(e) =>
                                    setTaskDrafts((current) =>
                                      current.map((row, i) =>
                                        i === index
                                          ? {
                                              ...row,
                                              enabled: e.target.checked,
                                            }
                                          : row,
                                      ),
                                    )
                                  }
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                              </div>
                              <div>
                                Generated: {summary?.generated_count ?? 0}
                              </div>
                              <div>
                                Latest click:{" "}
                                {summary?.latest_click
                                  ? formatDate(summary.latest_click)
                                  : "—"}
                              </div>
                              {task.task_type === "brand_purchase" &&
                                task.offer && (
                                  <a
                                    href={
                                      summary?.customer_path
                                        ? appLinks.path(summary.customer_path)
                                        : appLinks.offer(task.offer)
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-600 dark:text-brand-400 mt-1 inline-block hover:underline"
                                  >
                                    Customer page
                                  </a>
                                )}
                            </div>
                          </div>

                          <div className="mt-4">
                            <label
                              htmlFor={notesFieldId}
                              className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                            >
                              Notes
                            </label>
                            <Input
                              id={notesFieldId}
                              name={notesFieldId}
                              value={task.notes ?? ""}
                              disabled={!canEditTasks}
                              onChange={(e) =>
                                setTaskDrafts((current) =>
                                  current.map((row, i) =>
                                    i === index
                                      ? { ...row, notes: e.target.value }
                                      : row,
                                  ),
                                )
                              }
                            />
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
                {taskDrafts.length === 0 && (
                  <div className="rounded-xl border border-gray-100 dark:border-gray-700">
                    <NoData>
                      No quest tasks configured for this campaign.
                    </NoData>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeDetailTab === "leaderboard" && (
            <section
              id="quest-detail-panel-leaderboard"
              role="tabpanel"
              aria-labelledby="quest-detail-tab-leaderboard"
            >
              <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                    Leaderboard
                  </h5>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Review campaign ranking, point totals, bonuses, and matched
                    rewards.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!selectedQuest || leaderboardQuery.isFetching}
                  onClick={() => leaderboardQuery.refetch()}
                >
                  Refresh leaderboard
                </Button>
              </div>

              {isLatestAvailableLeaderboard && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                  No points were found for{" "}
                  {formatDate(leaderboardQuery.data?.empty_range_start_date)} -{" "}
                  {formatDate(leaderboardQuery.data?.empty_range_end_date)}.
                  Showing latest available leaderboard from{" "}
                  {formatDate(leaderboardQuery.data?.source_start_date)} -{" "}
                  {formatDate(leaderboardQuery.data?.source_end_date)} for local
                  QA.
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                {leaderboardQuery.isLoading ? (
                  <div className="p-6 text-sm text-gray-500">
                    Loading leaderboard...
                  </div>
                ) : leaderboardRows.length === 0 ? (
                  <NoData>No leaderboard points for this campaign yet.</NoData>
                ) : (
                  <Table className="min-w-[820px]">
                    <TableHeader>
                      <TableRow>
                        <TableCell isHeader className="px-4 py-3 text-center">
                          Rank
                        </TableCell>
                        <TableCell isHeader className="px-4 py-3">
                          User
                        </TableCell>
                        <TableCell isHeader className="px-4 py-3 text-right">
                          Points
                        </TableCell>
                        <TableCell isHeader className="px-4 py-3 text-right">
                          Reward
                        </TableCell>
                        <TableCell isHeader className="px-4 py-3 text-right">
                          Bonuses
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaderboardRows.map((row) => {
                        const configuredReward = rewardForRank(
                          leaderboardRewards,
                          row.rank,
                        );
                        return (
                          <TableRow key={`${row.rank}-${row.user_id}`}>
                            <TableCell className="px-4 py-3 text-center text-sm font-semibold text-gray-800 dark:text-white/90">
                              {row.rank}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <div className="max-w-[280px] truncate text-sm font-medium text-gray-900 dark:text-white">
                                {row.username || "Unknown user"}
                              </div>
                              <div className="max-w-[280px] truncate text-xs text-gray-500 dark:text-gray-400">
                                {row.email || row.user_id}
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                              {Number(row.point || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                              {formatReward(
                                row.reward ?? configuredReward.reward,
                                row.currency ?? configuredReward.currency,
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right text-xs text-gray-500 dark:text-gray-400">
                              <div>
                                Quest:{" "}
                                {Number(
                                  row.extra_point_received || 0,
                                ).toLocaleString()}
                              </div>
                              <div>
                                Referral:{" "}
                                {Number(
                                  row.extra_point_referral || 0,
                                ).toLocaleString()}
                              </div>
                              <div>
                                Social:{" "}
                                {Number(
                                  row.point_social_reward || 0,
                                ).toLocaleString()}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </section>
          )}

          {activeDetailTab === "rewards" && (
            <section
              id="quest-detail-panel-rewards"
              role="tabpanel"
              aria-labelledby="quest-detail-tab-rewards"
            >
              <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                    Rewards
                  </h5>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Configure the reward amount for each leaderboard rank in
                    this Quest campaign.
                  </p>
                  {rewardValidationError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                      {rewardValidationError}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canEditTaskEconomics}
                    onClick={addReward}
                  >
                    Add rank reward
                  </Button>
                </div>
              </div>

              <article className="mb-4 rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
                <div className="grid gap-4 xl:grid-cols-[1fr_180px] xl:items-end">
                  <div>
                    <h6 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Reward distribution
                    </h6>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {rewardDistributionPreview(
                        campaignDraft.endDate,
                        rewardDistributionDraft,
                      )}
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
                          Distribution schedule
                        </div>
                        <RewardDistributionSelect
                          value={rewardDistributionDraft.mode}
                          disabled={!canEditTaskEconomics}
                          onChange={(mode) => {
                            setRewardDistributionDraft((draft) => ({
                              mode,
                              delayDays:
                                mode === "after_days"
                                  ? Math.max(1, Number(draft.delayDays || 7))
                                  : 0,
                            }));
                          }}
                        />
                      </div>
                      {rewardDistributionDraft.mode === "after_days" && (
                        <div>
                          <label
                            htmlFor="quest-reward-distribution-delay-days"
                            className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                          >
                            Delay after end date
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              id="quest-reward-distribution-delay-days"
                              name="quest-reward-distribution-delay-days"
                              type="number"
                              min={1}
                              max={365}
                              aria-label="Reward distribution delay days"
                              value={rewardDistributionDraft.delayDays}
                              disabled={!canEditTaskEconomics}
                              onChange={(e) =>
                                setRewardDistributionDraft((draft) => ({
                                  ...draft,
                                  delayDays: Number(e.target.value),
                                }))
                              }
                              className="h-11 w-28 rounded-lg border border-gray-300 bg-white px-3 text-center text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            />
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              days
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-950/30">
                    <div className="text-xs font-medium text-gray-500 uppercase dark:text-gray-400">
                      Saved schedule
                    </div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {formatBangkokSchedule(
                        selectedQuest?.reward_distribution_scheduled_at,
                      )}
                    </div>
                  </div>
                </div>
              </article>

              <div className="space-y-3">
                {rewardDrafts.map((reward, index) => {
                  const rewardFieldPrefix = `quest-reward-${index}`;
                  const rankFieldId = `${rewardFieldPrefix}-rank`;
                  const rewardFieldId = `${rewardFieldPrefix}-amount`;
                  const currencyFieldId = `${rewardFieldPrefix}-currency`;
                  return (
                    <article
                      key={reward.clientId}
                      className="shadow-theme-xs rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40"
                    >
                      <div className="grid gap-3 sm:grid-cols-[110px_1fr_110px_auto] sm:items-end">
                        <div>
                          <label
                            htmlFor={rankFieldId}
                            className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                          >
                            Rank
                          </label>
                          <input
                            id={rankFieldId}
                            name={rankFieldId}
                            type="number"
                            min={1}
                            max={1000}
                            value={reward.rank}
                            disabled={!canEditTaskEconomics}
                            onChange={(e) =>
                              updateReward(index, {
                                rank: Number(e.target.value),
                              })
                            }
                            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-center text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={rewardFieldId}
                            className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                          >
                            Reward
                          </label>
                          <input
                            id={rewardFieldId}
                            name={rewardFieldId}
                            type="number"
                            min={0}
                            max={1000000}
                            value={reward.reward}
                            disabled={!canEditTaskEconomics}
                            onChange={(e) =>
                              updateReward(index, {
                                reward: Number(e.target.value),
                              })
                            }
                            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-right text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={currencyFieldId}
                            className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                          >
                            Currency
                          </label>
                          <Input
                            id={currencyFieldId}
                            name={currencyFieldId}
                            value={reward.currency}
                            disabled={!canEditTaskEconomics}
                            onChange={(e) =>
                              updateReward(index, {
                                currency: e.target.value.toUpperCase(),
                              })
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!canEditTaskEconomics}
                          onClick={() => removeReward(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </article>
                  );
                })}
                {rewardDrafts.length === 0 && (
                  <div className="rounded-xl border border-gray-100 dark:border-gray-700">
                    <NoData>
                      No rank rewards configured for this campaign.
                    </NoData>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="mt-8 flex flex-col items-end gap-2 border-t border-gray-200 pt-6 dark:border-gray-700">
            <Button
              type="button"
              size="sm"
              variant="primary"
              disabled={
                !canEditCampaign ||
                !canEditTasks ||
                !combinedDirty ||
                !campaignDraft.startDate ||
                !campaignDraft.endDate ||
                Boolean(bannerValidationError) ||
                Boolean(taskValidationError) ||
                Boolean(rewardValidationError) ||
                saveAllMutation.isPending
              }
              onClick={() => saveAllMutation.mutate()}
            >
              {saveAllMutation.isPending
                ? "Saving complete quest…"
                : creatingNew
                  ? "Save and create quest"
                  : "Save quest changes"}
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              One action saves the campaign, tasks, and reward settings.
            </p>
          </div>
        </div>
      </div>

      <Modal isOpen={detailsOpen} onClose={() => setDetailsOpen(false)}>
        <div className="p-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            Customer Quest task preview
          </h4>
          <div className="mt-4 space-y-3">
            {taskDrafts
              .filter((task) => task.enabled !== false)
              .map((task) => {
                const offer = task.offer
                  ? offersById.get(task.offer)
                  : undefined;
                return (
                  <div
                    key={`preview-${task.clientId}`}
                    className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 dark:border-gray-700"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {task.task_type === "brand_purchase" && offer && (
                        <RemoteOrBlobImage
                          src={offerLogo(offer)}
                          alt={offerLabel(offer)}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      )}
                      <span className="truncate text-sm text-gray-900 dark:text-white">
                        {customerTaskWording(task, offer)}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1 text-sm font-semibold text-white">
                      +{task.points} Points
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </Modal>
    </div>
  );
}
