"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { isActiveGoGoCashOffer } from "@/lib/isActiveGoGoCashOffer";
import {
  defaultQuestTaskWording,
  normalizeQuestTaskWordingDraft,
  resolveQuestTaskWording,
  shouldReplaceQuestWording,
} from "@/lib/questTaskWording";
import {
  QUEST_STATUS_VALUES,
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
import type {
  QuestReward,
  QuestTask,
  QuestTaskDeeplinkSummary,
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
} from "./questTaskEditor";
import { QuestTaskBrandSelect } from "./QuestTaskBrandSelect";
import { QuestTaskWordingFields } from "./QuestTaskWordingFields";

type CampaignDraft = {
  startDate: string;
  endDate: string;
  status: string;
  facebookPage: string;
  facebookPost: string;
  line: string;
  bannerEn: File | null;
  bannerTh: File | null;
  subBannerEn: File | null;
  subBannerTh: File | null;
};

const OFFERS_QUERY: OffersQuery = {
  search: "",
  limit: 300,
  page: 1,
  country: "",
};
const EMPTY_QUESTS: ResponseQuestDate[] = [];
const EMPTY_OFFERS: Offer[] = [];

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
  return typeof task.offer === "string" ? task.offer : task.offer._id;
}

function getTaskOffer(task: QuestTask): Offer | null {
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
    status: quest?.status ?? "open",
    facebookPage: quest?.facebook_page ?? "",
    facebookPost: quest?.facebook_post ?? "",
    line: quest?.line ?? "",
    bannerEn: null,
    bannerTh: null,
    subBannerEn: null,
    subBannerTh: null,
  };
}

function makeTaskDrafts(quest?: ResponseQuestDate | null): TaskDraft[] {
  return [...(quest?.tasks ?? [])]
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((task, index) => {
      const offer = getTaskOffer(task);
      const wording = normalizeQuestTaskWordingDraft(task);
      return {
        clientId: `${getTaskOfferId(task)}-${index}`,
        offer: getTaskOfferId(task),
        offer_id: Number(task.offer_id),
        merchant_id: Number(task.merchant_id),
        extra_point: normalizeQuestTaskPoints(
          Number(task.extra_point),
          offer,
        ),
        sort_order: index,
        enabled: task.enabled !== false,
        wording_en: wording.wording_en,
        wording_th: wording.wording_th,
        notes: task.notes ?? "",
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
  return summaries.find(
    (s) => s.offer_id === task.offer_id && s.merchant_id === task.merchant_id,
  );
}

export default function QuestTable() {
  const queryClient = useQueryClient();
  const { role } = usePermissions();
  const canEditCampaign = role === "super_admin";
  const canEditTasks = role === "super_admin";

  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [campaignDraft, setCampaignDraft] = useState<CampaignDraft>(
    makeCampaignDraft(null),
  );
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([]);
  const [rewardDrafts, setRewardDrafts] = useState<RewardDraft[]>([]);
  const [rewardDistributionDraft, setRewardDistributionDraft] =
    useState<RewardDistributionDraft>(makeRewardDistributionDraft(null));
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [offerLookup, setOfferLookup] = useState<Record<string, Offer>>({});
  const [activeDetailTab, setActiveDetailTab] =
    useState<QuestDetailTab>("tasks");

  const questsQuery = useQuery({
    queryKey: questListQueryKey,
    queryFn: fetchAdminQuests,
  });
  const quests = questsQuery.data ?? EMPTY_QUESTS;

  const selectedQuest = useMemo(() => {
    if (creatingNew) return null;
    if (selectedQuestId) {
      return quests.find((quest) => quest._id === selectedQuestId) ?? null;
    }
    // selectedQuestId is null in this branch (the truthy case returns above),
    // so the previous find() always missed — fall back to the first quest.
    return quests[0] ?? null;
  }, [creatingNew, quests, selectedQuestId]);

  const offersQuery = useQuery({
    queryKey: offersListQueryKey(OFFERS_QUERY),
    queryFn: () => fetchOffersList(OFFERS_QUERY),
    staleTime: 30_000,
  });
  const offers = offersQuery.data?.data ?? EMPTY_OFFERS;
  const activeOffers = useMemo(
    () => offers.filter(isActiveGoGoCashOffer),
    [offers],
  );
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
    enabled: Boolean(selectedQuest?._id),
  });
  const deeplinkSummaries = deeplinkSummaryQuery.data?.data ?? [];

  const leaderboardQuery = useQuery({
    queryKey: questLeaderboardQueryKey(selectedQuest?._id ?? ""),
    queryFn: () => fetchQuestLeaderboard(selectedQuest?._id ?? ""),
    enabled: Boolean(selectedQuest?._id),
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
    setRewardDrafts(makeRewardDrafts(selectedQuest));
    setRewardDistributionDraft(makeRewardDistributionDraft(selectedQuest));
    setSaveError(null);
  }

  const campaignBaseline = useMemo(
    () => makeCampaignDraft(selectedQuest),
    [selectedQuest],
  );
  const tasksBaseline = useMemo(
    () => buildQuestTaskPayloads(makeTaskDrafts(selectedQuest)),
    [selectedQuest],
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
    buildQuestTaskPayloads(taskDrafts),
    tasksBaseline,
  );
  const rewardsDirty = !sameJson(rewardsPayload, rewardsBaseline);
  const taskValidationError = validateQuestTasks(taskDrafts);
  const rewardValidationError =
    validateQuestRewards(rewardDrafts) ??
    validateQuestRewardDistribution(rewardDistributionDraft);

  const campaignMutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      if (selectedQuest?._id) fd.append("_id", selectedQuest._id);
      fd.append(
        "start_date",
        bangkokDateTimeInputToISOString(campaignDraft.startDate),
      );
      fd.append(
        "end_date",
        bangkokDateTimeInputToISOString(campaignDraft.endDate),
      );
      fd.append("status", campaignDraft.status);
      fd.append("facebook_page", campaignDraft.facebookPage.trim());
      fd.append("facebook_post", campaignDraft.facebookPost.trim());
      fd.append("line", campaignDraft.line.trim());
      if (campaignDraft.bannerEn)
        fd.append("banner_en", campaignDraft.bannerEn);
      if (campaignDraft.bannerTh)
        fd.append("banner_th", campaignDraft.bannerTh);
      if (campaignDraft.subBannerEn) {
        fd.append("sub_banner_en", campaignDraft.subBannerEn);
      }
      if (campaignDraft.subBannerTh) {
        fd.append("sub_banner_th", campaignDraft.subBannerTh);
      }
      return saveQuestCampaign(fd);
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
      setSaveError(null);
    },
    onError: (error) => {
      setSaveError(getApiErrorMessage(error, "Save failed"));
    },
  });

  const taskMutation = useMutation({
    mutationFn: () =>
      saveQuestTasks(
        selectedQuest?._id ?? "",
        buildQuestTaskPayloads(taskDrafts),
      ),
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: questListQueryKey });
      if (selectedQuest?._id) {
        queryClient.invalidateQueries({
          queryKey: questTaskDeeplinkSummaryQueryKey(selectedQuest._id),
        });
      }
    },
    onError: (error) => {
      setSaveError(getApiErrorMessage(error, "Save failed"));
    },
  });

  const rewardMutation = useMutation({
    mutationFn: () =>
      saveQuestRewards(selectedQuest?._id ?? "", rewardsPayload),
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: questListQueryKey });
      if (selectedQuest?._id) {
        queryClient.invalidateQueries({
          queryKey: questLeaderboardQueryKey(selectedQuest._id),
        });
      }
    },
    onError: (error) => {
      setSaveError(getApiErrorMessage(error, "Save failed"));
    },
  });

  const beginCreate = () => {
    setCreatingNew(true);
    setSelectedQuestId(null);
    setDraftSourceQuestId(null);
    setCampaignDraft(makeCampaignDraft(null));
    setTaskDrafts([]);
    setRewardDrafts([]);
    setRewardDistributionDraft(makeRewardDistributionDraft(null));
    setSaveError(null);
    setActiveDetailTab("tasks");
  };

  const addTask = () => {
    const used = new Set(taskDrafts.map((task) => task.offer));
    const offer = activeOffers.find((item) => !used.has(item._id));
    if (!offer) return;
    setTaskDrafts((current) => [
      ...current,
      {
        clientId: `new-${offer._id}-${Date.now()}`,
        offer: offer._id,
        offer_id: offer.offer_id,
        merchant_id: offer.merchant_id,
        extra_point: defaultQuestTaskPoints(offer),
        sort_order: current.length,
        enabled: true,
        wording_en: "",
        wording_th: "",
        notes: "",
      },
    ]);
  };

  const updateTaskOffer = (index: number, offer: Offer) => {
    setOfferLookup((current) => ({ ...current, [offer._id]: offer }));
    setTaskDrafts((current) =>
      current.map((task, i) => {
        if (i !== index) return task;
        const previousOffer = offersById.get(task.offer);
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
          offer: offer._id,
          offer_id: offer.offer_id,
          merchant_id: offer.merchant_id,
          extra_point:
            Number(task.extra_point) >= 2 && Number(task.extra_point) <= 10000
              ? Number(task.extra_point)
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

  const selectedQuestLabel = selectedQuest
    ? `${formatDate(selectedQuest.start_date)} - ${formatDate(selectedQuest.end_date)}`
    : "New Quest";

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
        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={beginCreate}
          disabled={!canEditCampaign}
        >
          New Quest
        </Button>
      </div>

      <div className="border-t border-gray-100 dark:border-gray-700">
        <div
          data-testid="quest-campaign-selector"
          aria-label="Quest campaigns"
          className="border-b border-gray-100 p-4 sm:p-5 dark:border-gray-700"
        >
          {questsQuery.isLoading ? (
            <div className="text-sm text-gray-500">Loading quests...</div>
          ) : !creatingNew && quests.length === 0 ? (
            <div className="rounded-xl border border-gray-100 dark:border-gray-700">
              <NoData>No quests found.</NoData>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {creatingNew && (
                <button
                  type="button"
                  aria-pressed="true"
                  className="border-brand-300 bg-brand-50 shadow-theme-xs dark:border-brand-500/40 dark:bg-brand-500/10 min-w-[240px] rounded-xl border p-4 text-left transition"
                  onClick={() => {
                    setCreatingNew(true);
                    setSelectedQuestId(null);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-brand-700 dark:text-brand-300 truncate font-mono text-xs">
                        unsaved
                      </div>
                      <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                        New Quest draft
                      </div>
                    </div>
                    <Badge size="sm" color="warning">
                      draft
                    </Badge>
                  </div>
                  <div className="text-brand-700 dark:text-brand-300 mt-3 text-xs">
                    {campaignDraft.startDate && campaignDraft.endDate
                      ? `${formatDate(campaignDraft.startDate)} - ${formatDate(campaignDraft.endDate)}`
                      : "Set dates and save to create this campaign."}
                  </div>
                </button>
              )}
              {quests.map((quest) => {
                const active = !creatingNew && selectedQuest?._id === quest._id;
                return (
                  <button
                    key={quest._id}
                    type="button"
                    aria-pressed={active}
                    className={`min-w-[240px] rounded-xl border p-4 text-left transition ${
                      active
                        ? "border-brand-300 bg-brand-50 shadow-theme-xs dark:border-brand-500/40 dark:bg-brand-500/10"
                        : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30 dark:hover:bg-gray-900/70"
                    }`}
                    onClick={() => {
                      setCreatingNew(false);
                      setSelectedQuestId(quest._id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-xs text-gray-500">
                          {quest._id.slice(-8)}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                          {formatDate(quest.start_date)} -{" "}
                          {formatDate(quest.end_date)}
                        </div>
                      </div>
                      <Badge
                        size="sm"
                        color={questStatusBadgeColor(quest.status)}
                      >
                        {questStatusLabel(quest.status)}
                      </Badge>
                    </div>
                    <div
                      className={`mt-3 text-xs ${
                        active
                          ? "text-brand-700 dark:text-brand-300"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {quest.tasks?.length ?? 0} task
                      {(quest.tasks?.length ?? 0) === 1 ? "" : "s"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div data-testid="quest-detail-editor" className="min-w-0 p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedQuestLabel}
              </h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Campaign saves and task point values require super admin access.
              </p>
            </div>
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
                  ariaLabel="Quest start date and time"
                  hint={BANGKOK_TIMEZONE_LABEL}
                  enableTime
                  altInput
                  dateFormat={ADMIN_DATETIME_VALUE_FORMAT}
                  altFormat={ADMIN_DATETIME_ALT_FORMAT}
                  minuteIncrement={1}
                  value={campaignDraft.startDate}
                  disabled={!canEditCampaign}
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
                  ariaLabel="Quest end date and time"
                  hint={BANGKOK_TIMEZONE_LABEL}
                  enableTime
                  altInput
                  dateFormat={ADMIN_DATETIME_VALUE_FORMAT}
                  altFormat={ADMIN_DATETIME_ALT_FORMAT}
                  minuteIncrement={1}
                  value={campaignDraft.endDate}
                  disabled={!canEditCampaign}
                  onValueChange={(value) =>
                    setCampaignDraft((draft) => ({
                      ...draft,
                      endDate: value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="quest-campaign-status">Status</Label>
                <select
                  id="quest-campaign-status"
                  name="status"
                  value={campaignDraft.status}
                  disabled={!canEditCampaign}
                  onChange={(e) =>
                    setCampaignDraft((draft) => ({
                      ...draft,
                      status: e.target.value,
                    }))
                  }
                  className="focus:border-brand-300 focus:ring-brand-500/10 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 focus:ring-3 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  {QUEST_STATUS_VALUES.map((status) => (
                    <option key={status} value={status}>
                      {questStatusLabel(status)}
                    </option>
                  ))}
                </select>
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
              {[
                ["Banner EN", "bannerEn"],
                ["Banner TH", "bannerTh"],
                ["Sub banner EN", "subBannerEn"],
                ["Sub banner TH", "subBannerTh"],
              ].map(([label, key]) => {
                const fieldId = `quest-campaign-${key}`;
                return (
                  <div key={key}>
                    <Label htmlFor={fieldId}>{label}</Label>
                    <input
                      id={fieldId}
                      name={key}
                      type="file"
                      accept="image/*"
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

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="primary"
                disabled={
                  !canEditCampaign ||
                  !campaignDirty ||
                  !campaignDraft.startDate ||
                  !campaignDraft.endDate ||
                  campaignMutation.isPending
                }
                onClick={() => campaignMutation.mutate()}
              >
                Save campaign
              </Button>
            </div>
          </section>

          <div
            role="tablist"
            aria-label="Quest campaign management"
            className="mb-5 grid gap-2 rounded-xl bg-gray-100 p-1 sm:grid-cols-3 dark:bg-gray-900"
          >
            {QUEST_DETAIL_TABS.map((tab) => {
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
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!canEditTasks || activeOffers.length === 0}
                    onClick={addTask}
                  >
                    Add brand
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={
                      !canEditTasks ||
                      !selectedQuest ||
                      !tasksDirty ||
                      Boolean(taskValidationError) ||
                      taskMutation.isPending
                    }
                    onClick={() => taskMutation.mutate()}
                  >
                    Save tasks
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {taskDrafts.map((task, index) => {
                  const offer = offersById.get(task.offer);
                  const summary = summaryForTask(deeplinkSummaries, task);
                  const taskFieldPrefix = `quest-task-${index}`;
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
                          <RemoteOrBlobImage
                            src={offerLogo(offer)}
                            alt={offerLabel(offer)}
                            width={44}
                            height={44}
                            className="h-11 w-11 shrink-0 rounded-full object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <label
                              htmlFor={brandFieldId}
                              className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                            >
                              Brand
                            </label>
                            <QuestTaskBrandSelect
                              id={brandFieldId}
                              disabled={!canEditTasks}
                              valueOfferId={task.offer}
                              selectedOffer={offer}
                              onSelect={(nextOffer) =>
                                updateTaskOffer(index, nextOffer)
                              }
                            />
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>Offer {task.offer_id}</span>
                              <span>Brand {task.merchant_id}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canEditTasks || index === 0}
                            onClick={() => moveTask(index, -1)}
                          >
                            Up
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              !canEditTasks || index === taskDrafts.length - 1
                            }
                            onClick={() => moveTask(index, 1)}
                          >
                            Down
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!canEditTasks}
                            onClick={() => removeTask(index)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[140px_minmax(280px,1fr)] xl:grid-cols-[140px_minmax(360px,1fr)_minmax(240px,320px)]">
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
                            value={task.extra_point}
                            disabled={!canEditTasks}
                            onChange={(e) =>
                              setTaskDrafts((current) =>
                                current.map((row, i) =>
                                  i === index
                                    ? {
                                        ...row,
                                        extra_point: Number(e.target.value),
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
                              disabled={!canEditTasks}
                              onChange={(e) =>
                                setTaskDrafts((current) =>
                                  current.map((row, i) =>
                                    i === index
                                      ? { ...row, enabled: e.target.checked }
                                      : row,
                                  ),
                                )
                              }
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </div>
                          <div>Generated: {summary?.generated_count ?? 0}</div>
                          <div>
                            Latest click:{" "}
                            {summary?.latest_click
                              ? formatDate(summary.latest_click)
                              : "—"}
                          </div>
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
                    disabled={!canEditTasks}
                    onClick={addReward}
                  >
                    Add rank reward
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    disabled={
                      !canEditTasks ||
                      !selectedQuest ||
                      !rewardsDirty ||
                      Boolean(rewardValidationError) ||
                      rewardMutation.isPending
                    }
                    onClick={() => rewardMutation.mutate()}
                  >
                    Save rewards
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
                          disabled={!canEditTasks}
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
                              disabled={!canEditTasks}
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
                            disabled={!canEditTasks}
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
                            disabled={!canEditTasks}
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
                            disabled={!canEditTasks}
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
                          disabled={!canEditTasks}
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
                const offer = offersById.get(task.offer);
                return (
                  <div
                    key={`preview-${task.clientId}`}
                    className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 dark:border-gray-700"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <RemoteOrBlobImage
                        src={offerLogo(offer)}
                        alt={offerLabel(offer)}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <span className="truncate text-sm text-gray-900 dark:text-white">
                        {customerTaskWording(task, offer)}
                      </span>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-500 px-3 py-1 text-sm font-semibold text-white">
                      +{task.extra_point} Points
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
