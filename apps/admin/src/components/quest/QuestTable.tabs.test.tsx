// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import QuestTable from "./QuestTable";
import type { Offer } from "@/types/api";
import type { ResponseQuestDate } from "@/types/quest";

const questQueries = vi.hoisted(() => ({
  fetchAdminQuests: vi.fn(),
  fetchQuestLeaderboard: vi.fn(),
  fetchQuestTaskDeeplinkSummary: vi.fn(),
  saveQuestCampaign: vi.fn(),
  saveQuestRewards: vi.fn(),
  saveQuestTasks: vi.fn(),
}));

const offersQueries = vi.hoisted(() => ({
  fetchOffersList: vi.fn(),
}));

const membershipApi = vi.hoisted(() => ({
  getMembershipTiers: vi.fn(),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    role: "super_admin",
    can: () => true,
  }),
}));

vi.mock("@/lib/query/offersQueries", () => ({
  fetchOffersList: offersQueries.fetchOffersList,
  offersListQueryKey: () => ["offers", "list", "quest-test"],
}));

vi.mock("@/lib/api/adminModulesApi", () => ({
  getMembershipTiers: membershipApi.getMembershipTiers,
}));

vi.mock("@/components/form/date-picker", () => ({
  default: ({
    ariaLabel,
    disabled,
    hint,
    id,
    label,
    onValueChange,
    required,
    value,
  }: {
    ariaLabel?: string;
    disabled?: boolean;
    hint?: string;
    id: string;
    label?: string;
    onValueChange?: (value: string) => void;
    required?: boolean;
    value?: string;
  }) => (
    <label>
      {label}
      {required ? <span>*</span> : null}
      <input
        aria-label={ariaLabel}
        data-datepicker-component="true"
        data-testid={id}
        data-required={required ? "true" : "false"}
        disabled={disabled}
        value={value ?? ""}
        onChange={(event) => onValueChange?.(event.currentTarget.value)}
      />
      {hint && <span>{hint}</span>}
    </label>
  ),
}));

vi.mock("./QuestTaskBrandSelect", () => ({
  QuestTaskBrandSelect: ({
    id,
    disabled,
    onSelect,
    selectedOffer,
    valueOfferId,
  }: {
    id: string;
    disabled?: boolean;
    onSelect: (offer: Offer) => void;
    selectedOffer: Offer | null | undefined;
    valueOfferId: string;
  }) => {
    const option =
      selectedOffer ??
      ({
        _id: "offer-1",
        disabled: false,
        extra_point: 50,
        logo: "",
        logo_circle: "",
        logo_desktop: "",
        logo_mobile: "",
        merchant_id: 700101,
        offer_id: 900101,
        offer_name: "Klook Travel - CPS",
        offer_name_display: "Klook Travel",
      } as Offer);
    return (
      <select
        id={id}
        aria-label="Brand"
        disabled={disabled}
        value={valueOfferId}
        onChange={(event) => {
          if (event.currentTarget.value === option._id) onSelect(option);
        }}
      >
        <option value="">Select a brand</option>
        <option value={option._id}>
          {option.offer_name_display || option.offer_name}
        </option>
      </select>
    );
  },
}));

vi.mock("./QuestTaskWordingFields", () => ({
  QuestTaskWordingFields: ({
    idPrefix,
    disabled,
    onChange,
    value,
  }: {
    idPrefix: string;
    disabled?: boolean;
    onChange: (next: { wording_en: string; wording_th: string }) => void;
    value: { wording_en: string; wording_th: string };
  }) => (
    <div>
      <label htmlFor={`${idPrefix}-wording-en`}>English</label>
      <input
        id={`${idPrefix}-wording-en`}
        aria-label="English"
        disabled={disabled}
        value={value.wording_en}
        onChange={(event) =>
          onChange({ ...value, wording_en: event.currentTarget.value })
        }
      />
      <label htmlFor={`${idPrefix}-wording-th`}>Thai</label>
      <input
        id={`${idPrefix}-wording-th`}
        aria-label="Thai"
        disabled={disabled}
        value={value.wording_th}
        onChange={(event) =>
          onChange({ ...value, wording_th: event.currentTarget.value })
        }
      />
    </div>
  ),
}));

vi.mock("@/lib/query/questQueries", () => ({
  fetchAdminQuests: questQueries.fetchAdminQuests,
  fetchQuestLeaderboard: questQueries.fetchQuestLeaderboard,
  fetchQuestTaskDeeplinkSummary: questQueries.fetchQuestTaskDeeplinkSummary,
  questLeaderboardQueryKey: (questId: string) => [
    "quest",
    questId,
    "leaderboard",
  ],
  questListQueryKey: ["quest", "list"],
  questTaskDeeplinkSummaryQueryKey: (questId: string) => [
    "quest",
    questId,
    "task-deeplinks",
  ],
  saveQuestCampaign: questQueries.saveQuestCampaign,
  saveQuestRewards: questQueries.saveQuestRewards,
  saveQuestTasks: questQueries.saveQuestTasks,
}));

const offer = {
  _id: "offer-1",
  disabled: false,
  extra_point: 50,
  logo: "",
  logo_circle: "",
  logo_desktop: "",
  logo_mobile: "",
  merchant_id: 700101,
  offer_id: 900101,
  offer_name: "Klook Travel - CPS",
  offer_name_display: "Klook Travel",
} as Offer;

const activeTierId = "6942b79d7b9f8214ada6eed5";
const inactiveTierId = "5942b79d7b9f8214ada6eed5";
const membershipTiers = [
  {
    id: activeTierId,
    name: "GoGoPass Plus",
    description: "",
    monthlyPrice: 199,
    annualPrice: 0,
    color: "#16a34a",
    icon: "star",
    benefits: [],
    cashbackRate: 5,
    maxCashbackPerMonth: 0,
    isActive: true,
    memberCount: 3,
  },
  {
    id: inactiveTierId,
    name: "Legacy VIP",
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
  },
];

const quest = {
  _id: "quest-1",
  __v: 0,
  banner_en: "",
  banner_th: "",
  createdAt: "2026-06-01T00:00:00.000Z",
  end_date: "2026-06-30T00:00:00.000Z",
  facebook_page: "https://facebook.example/page",
  facebook_post: "https://facebook.example/post",
  line: "line-demo",
  config_revision: 0,
  reward_model: "legacy_v1",
  timezone: "Asia/Bangkok",
  audience: { kind: "all" },
  reward_caps: {
    max_awards_per_user: null,
    max_referrals_per_user: null,
  },
  reward_distribution_delay_days: 7,
  reward_distribution_mode: "after_days",
  reward_distribution_scheduled_at: "2026-07-07T00:00:00.000Z",
  reward_status: false,
  rewards: [{ rank: 1, reward: 1200, currency: "THB" }],
  start_date: "2026-06-01T00:00:00.000Z",
  status: "open",
  sub_banner_en: "",
  sub_banner_th: "",
  tasks: [
    {
      enabled: true,
      extra_point: 50,
      points: 50,
      merchant_id: 700101,
      notes: "",
      offer,
      offer_id: 900101,
      sort_order: 0,
      task_key: "task_brand_existing_1234",
      task_type: "brand_purchase",
      wording: "Make an order on Klook Travel",
    },
  ],
  updatedAt: "2026-06-02T00:00:00.000Z",
} satisfies ResponseQuestDate;

const closedQuest = {
  ...quest,
  _id: "quest-closed",
  end_date: "2026-05-31T00:00:00.000Z",
  start_date: "2026-05-01T00:00:00.000Z",
  status: "close",
  tasks: [],
} satisfies ResponseQuestDate;

const newQuest = {
  ...quest,
  _id: "quest-2",
  createdAt: "2026-07-01T00:00:00.000Z",
  end_date: "2026-07-31T00:00:00.000Z",
  facebook_page: "",
  facebook_post: "",
  line: "",
  reward_model: "task_v2",
  reward_distribution_delay_days: 0,
  reward_distribution_mode: "campaign_end",
  reward_distribution_scheduled_at: "2026-07-31T15:15:00.000Z",
  rewards: [],
  start_date: "2026-07-01T00:00:00.000Z",
  tasks: [],
  updatedAt: "2026-07-01T00:00:00.000Z",
} satisfies ResponseQuestDate;

function renderQuestTable(view: "list" | "create" | "edit" = "edit") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <QuestTable
        view={view}
        questId={view === "edit" ? "quest-1" : undefined}
      />
    </QueryClientProvider>,
  );
}

describe("QuestTable management tabs", () => {
  beforeEach(() => {
    questQueries.fetchAdminQuests.mockResolvedValue([quest]);
    questQueries.fetchQuestTaskDeeplinkSummary.mockResolvedValue({
      data: [
        {
          customer_path: "/shop/offer-1",
          extra_point: 50,
          generated_count: 2,
          latest_click: "2026-06-17T00:00:00.000Z",
          merchant_id: 700101,
          offer: "offer-1",
          offer_id: 900101,
          offer_name: "Klook Travel",
          sample_deeplink: "",
          sort_order: 0,
          tracking_link: "https://tracking.example/klook",
          wording: "Make an order on Klook Travel",
        },
      ],
    });
    questQueries.fetchQuestLeaderboard.mockResolvedValue({
      data_source: "quest_range",
      data: [
        {
          bonus_over_300_received: 0,
          currency: "THB",
          email: "leader@example.com",
          extra_point_received: 50,
          extra_point_referral: 0,
          point: 450,
          point_social_reward: 0,
          rank: 1,
          reward: 1200,
          user_id: "user-1",
          username: "Leader One",
        },
      ],
      quest: {
        _id: "quest-1",
        end_date: quest.end_date,
        reward_distribution_delay_days: 7,
        reward_distribution_mode: "after_days",
        reward_distribution_scheduled_at: "2026-07-07T00:00:00.000Z",
        reward_status: false,
        start_date: quest.start_date,
        status: "open",
      },
      rewards: [{ rank: 1, reward: 1200, currency: "THB" }],
      source_end_date: "2026-06-30",
      source_start_date: "2026-06-01",
    });
    offersQueries.fetchOffersList.mockResolvedValue({
      data: [offer],
      limit: 300,
      page: 1,
      total: 1,
      totalPages: 1,
    });
    membershipApi.getMembershipTiers.mockResolvedValue(membershipTiers);
    questQueries.saveQuestCampaign.mockResolvedValue(quest);
    questQueries.saveQuestTasks.mockResolvedValue(quest);
    questQueries.saveQuestRewards.mockResolvedValue(quest);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("switches between Quest tasks, Leaderboard, and Rewards subtabs", async () => {
    const user = userEvent.setup();
    renderQuestTable();

    const tasksTab = await screen.findByRole("tab", { name: /Quest tasks/i });
    expect(tasksTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Add task" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Save quest changes" }),
    ).toBeVisible();

    await user.click(screen.getByRole("tab", { name: /Leaderboard/i }));

    await waitFor(() =>
      expect(screen.getByText("Leader One")).toBeInTheDocument(),
    );
    expect(tasksTab).toHaveAttribute("aria-selected", "false");
    expect(
      screen.queryByRole("button", { name: "Add task" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Rewards/i }));

    expect(
      screen.getByRole("button", { name: "Add rank reward" }),
    ).toBeVisible();
    expect(
      screen.getByRole("combobox", { name: "Reward distribution schedule" }),
    ).toHaveTextContent("Automatically after campaign ends");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Reward distribution delay days")).toHaveValue(
      7,
    );
    expect(screen.getByDisplayValue("1200")).toBeVisible();
    expect(screen.queryByText("Leader One")).not.toBeInTheDocument();
  });

  it("starts a new task with Task type and clears incompatible fields when switching", async () => {
    const user = userEvent.setup();
    renderQuestTable("create");

    await user.click(await screen.findByRole("button", { name: "Add task" }));

    const taskType = screen.getByRole("combobox", { name: "Task type" });
    expect(taskType).toHaveValue("");
    expect(screen.queryByRole("combobox", { name: "Brand" })).toBeNull();

    await user.selectOptions(taskType, "friend_referral");
    expect(
      screen.getByRole("combobox", { name: "Complete invitation rule" }),
    ).toHaveValue("account_created");
    expect(screen.getByLabelText("Points")).toBeVisible();

    await user.selectOptions(taskType, "spend_target");
    expect(
      screen.queryByRole("combobox", { name: "Complete invitation rule" }),
    ).toBeNull();
    expect(screen.getByLabelText("Spend target (THB)")).toHaveValue(1000);
    expect(screen.queryByRole("combobox", { name: "Brand" })).toBeNull();

    await user.selectOptions(taskType, "brand_purchase");
    expect(screen.getByRole("combobox", { name: "Brand" })).toBeVisible();
    expect(screen.queryByLabelText("Spend target (THB)")).toBeNull();
  });

  it("editing spend-target amount or referral completion rule does not crash (currentTarget-in-updater regression)", async () => {
    // Regression: these onChange handlers read event.currentTarget inside the
    // setTaskDrafts functional updater, which runs AFTER React nulls
    // currentTarget → "Cannot read properties of null (reading 'value')" tripped
    // the quest error boundary. Handlers must capture the value synchronously.
    const user = userEvent.setup();
    renderQuestTable("create");
    await user.click(await screen.findByRole("button", { name: "Add task" }));
    const taskType = screen.getByRole("combobox", { name: "Task type" });

    await user.selectOptions(taskType, "spend_target");
    const spend = screen.getByLabelText("Spend target (THB)");
    await user.clear(spend);
    await user.type(spend, "500");
    expect(spend).toHaveValue(500);
    fireEvent.change(spend, { target: { value: "2500" } });
    expect(spend).toHaveValue(2500);

    await user.selectOptions(taskType, "friend_referral");
    const rule = screen.getByRole("combobox", {
      name: "Complete invitation rule",
    });
    fireEvent.change(rule, { target: { value: "first_earning_conversion" } });
    expect(rule).toHaveValue("first_earning_conversion");
  });

  it("upgrades a saved brand-only legacy quest to task-v2 for a canonical membership audience", async () => {
    const user = userEvent.setup();
    questQueries.fetchAdminQuests.mockResolvedValue([
      {
        ...quest,
        reward_model: "legacy_v1",
        start_date: "2099-07-01T00:00:00.000Z",
        end_date: "2099-07-31T00:00:00.000Z",
      },
    ]);
    renderQuestTable();

    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Quest audience" }),
      "membership_tiers",
    );
    const activeTier = await screen.findByRole("checkbox", {
      name: "GoGoPass Plus",
    });
    expect(activeTier).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Legacy VIP (inactive)" }),
    ).toBeDisabled();
    await user.click(activeTier);
    await user.click(
      screen.getByRole("button", { name: "Save quest changes" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestTasks).toHaveBeenCalledWith(
        "quest-1",
        expect.objectContaining({
          reward_model: "task_v2",
          audience: {
            kind: "membership_tiers",
            tier_ids: [activeTierId],
          },
        }),
      ),
    );
    expect(
      questQueries.saveQuestTasks.mock.calls[0]?.[1]?.audience?.tier_ids,
    ).not.toContain("GoGoPass Plus");
  });

  it("creates a brand-only membership quest as task-v2", async () => {
    const user = userEvent.setup();
    questQueries.saveQuestCampaign.mockResolvedValue(newQuest);
    questQueries.saveQuestTasks.mockResolvedValue(newQuest);
    questQueries.saveQuestRewards.mockResolvedValue(newQuest);
    renderQuestTable("create");

    await user.click(await screen.findByRole("button", { name: "Add task" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Task type" }),
      "brand_purchase",
    );
    await screen.findByRole("option", { name: "Klook Travel" });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Brand" }),
      offer._id,
    );
    await user.type(screen.getByLabelText("English"), "Buy from Klook");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Quest audience" }),
      "membership_tiers",
    );
    await user.click(
      await screen.findByRole("checkbox", { name: "GoGoPass Plus" }),
    );
    fireEvent.change(screen.getByLabelText("Quest start date and time"), {
      target: { value: "2099-07-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Quest end date and time"), {
      target: { value: "2099-07-31T22:15" },
    });
    for (const label of [
      "Banner EN",
      "Banner TH",
      "Sub banner EN",
      "Sub banner TH",
    ]) {
      await user.upload(
        screen.getByLabelText(label),
        new File([label], `${label.replaceAll(" ", "-")}.png`, {
          type: "image/png",
        }),
      );
    }
    await user.click(
      screen.getByRole("button", { name: "Save and create quest" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestTasks).toHaveBeenCalledWith(
        "quest-2",
        expect.objectContaining({
          reward_model: "task_v2",
          audience: {
            kind: "membership_tiers",
            tier_ids: [activeTierId],
          },
          tasks: [expect.objectContaining({ task_type: "brand_purchase" })],
        }),
      ),
    );
  });

  it("upgrades a saved brand-only legacy quest to task-v2 for a non-null reward cap", async () => {
    const user = userEvent.setup();
    questQueries.fetchAdminQuests.mockResolvedValue([
      {
        ...quest,
        reward_model: "legacy_v1",
        start_date: "2099-07-01T00:00:00.000Z",
        end_date: "2099-07-31T00:00:00.000Z",
      },
    ]);
    renderQuestTable();

    await user.type(await screen.findByLabelText("Max awards per user"), "2");
    await user.click(
      screen.getByRole("button", { name: "Save quest changes" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestTasks).toHaveBeenCalledWith(
        "quest-1",
        expect.objectContaining({
          reward_model: "task_v2",
          audience: { kind: "all" },
          reward_caps: {
            max_awards_per_user: 2,
            max_referrals_per_user: null,
          },
        }),
      ),
    );
  });

  it("round-trips selected ids and keeps an inactive frozen tier readable", async () => {
    questQueries.fetchAdminQuests.mockResolvedValue([
      {
        ...quest,
        reward_model: "task_v2",
        task_v2_state_frozen_at: "2026-06-02T00:00:00.000Z",
        audience: {
          kind: "membership_tiers",
          tier_ids: [inactiveTierId, activeTierId],
        },
      },
    ]);
    renderQuestTable();

    expect(
      await screen.findByRole("checkbox", { name: "GoGoPass Plus" }),
    ).toBeChecked();
    const inactiveTier = screen.getByRole("checkbox", {
      name: "Legacy VIP (inactive)",
    });
    expect(inactiveTier).toBeChecked();
    expect(inactiveTier).toBeDisabled();
  });

  it("shows membership-tier loading, error retry, and empty states", async () => {
    const membershipQuest = {
      ...quest,
      reward_model: "task_v2" as const,
      audience: { kind: "membership_tiers" as const, tier_ids: [] },
    };
    questQueries.fetchAdminQuests.mockResolvedValue([membershipQuest]);
    membershipApi.getMembershipTiers.mockReturnValueOnce(
      new Promise(() => undefined),
    );
    const loading = renderQuestTable();
    expect(await screen.findByText("Loading membership tiers…")).toBeVisible();
    loading.unmount();

    membershipApi.getMembershipTiers.mockRejectedValueOnce(
      new Error("tier endpoint unavailable"),
    );
    renderQuestTable();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load membership tiers",
    );
    expect(
      screen.getByRole("button", { name: "Retry tier loading" }),
    ).toBeVisible();
    cleanup();

    membershipApi.getMembershipTiers.mockResolvedValueOnce([]);
    renderQuestTable();
    expect(
      await screen.findByText("No active membership tiers are available."),
    ).toBeVisible();
  });

  it("surfaces the API membership-tier rejection as actionable save copy", async () => {
    const user = userEvent.setup();
    const apiMessage =
      "One or more selected membership tiers no longer exist or are inactive. Reload the tier list and choose active tiers.";
    questQueries.fetchAdminQuests.mockResolvedValue([
      {
        ...quest,
        reward_model: "task_v2",
        start_date: "2099-07-01T00:00:00.000Z",
        end_date: "2099-07-31T00:00:00.000Z",
      },
    ]);
    questQueries.saveQuestTasks.mockRejectedValueOnce({
      response: { data: { message: apiMessage } },
    });
    renderQuestTable();
    await user.selectOptions(
      await screen.findByRole("combobox", { name: "Quest audience" }),
      "membership_tiers",
    );
    await user.click(
      await screen.findByRole("checkbox", { name: "GoGoPass Plus" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Save quest changes" }),
    );

    expect(await screen.findByText(apiMessage)).toBeVisible();
  });

  it("freezes task economics after campaign start while leaving wording editable", async () => {
    questQueries.fetchAdminQuests.mockResolvedValue([
      {
        ...quest,
        reward_model: "task_v2",
        task_v2_state_frozen_at: "2026-06-02T00:00:00.000Z",
      },
    ]);
    renderQuestTable();

    expect(
      await screen.findByText(/Quest economics are frozen after/i),
    ).toBeVisible();
    expect(screen.getByLabelText("Quest start date and time")).toBeDisabled();
    expect(screen.getByLabelText("Quest end date and time")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add task" })).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "Quest audience" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Max awards per user")).toBeDisabled();
    expect(screen.getByLabelText("Max referrals per user")).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Task type" })).toBeDisabled();
    expect(screen.getByLabelText("Points")).toBeDisabled();
    expect(screen.getByLabelText("Enabled")).toBeDisabled();
    expect(screen.getByLabelText("English")).toBeEnabled();
    expect(screen.getByLabelText("Notes")).toBeEnabled();

    await userEvent.click(screen.getByRole("tab", { name: /Rewards/i }));

    expect(
      screen.getByRole("button", { name: "Add rank reward" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("combobox", { name: "Reward distribution schedule" }),
    ).toBeDisabled();
    expect(
      screen.getByLabelText("Reward distribution delay days"),
    ).toBeDisabled();
    expect(screen.getByLabelText("Rank")).toBeDisabled();
    expect(screen.getByLabelText("Reward")).toBeDisabled();
    expect(screen.getByLabelText("Currency")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled();
  });

  it("shows actionable copy when the API rejects a frozen task configuration", async () => {
    const user = userEvent.setup();
    questQueries.saveQuestTasks.mockRejectedValueOnce({
      response: {
        data: {
          code: "QUEST_TASK_CONFIG_FROZEN",
          message: "Quest task economics are frozen.",
        },
      },
    });
    renderQuestTable();

    const wording = await screen.findByLabelText("English");
    await user.clear(wording);
    await user.type(wording, "Updated customer wording");
    await user.click(
      screen.getByRole("button", { name: "Save quest changes" }),
    );

    expect(
      await screen.findByText(
        /Only customer wording and notes can be edited; create a future quest revision/i,
      ),
    ).toBeVisible();
  });

  it("shows latest available leaderboard rows with a source-range notice", async () => {
    const user = userEvent.setup();
    questQueries.fetchQuestLeaderboard.mockResolvedValueOnce({
      data_source: "latest_available",
      data: [
        {
          bonus_over_300_received: 0,
          currency: "THB",
          email: "winner@gogocash.co",
          extra_point_received: 50,
          extra_point_referral: 0,
          point: 450,
          point_social_reward: 0,
          rank: 1,
          reward: 1200,
          user_id: "user-1",
          username: "Quest Winner",
        },
      ],
      empty_range_end_date: "2026-07-30",
      empty_range_start_date: "2026-07-01",
      quest: {
        _id: "quest-1",
        end_date: "2026-07-30T00:00:00.000Z",
        reward_status: false,
        start_date: "2026-07-01T00:00:00.000Z",
        status: "open",
      },
      rewards: [{ rank: 1, reward: 1200, currency: "THB" }],
      source_end_date: "2026-06-30",
      source_start_date: "2026-06-01",
    });
    renderQuestTable();

    await user.click(await screen.findByRole("tab", { name: /Leaderboard/i }));

    expect(await screen.findByText("Quest Winner")).toBeInTheDocument();
    expect(
      screen.getByText(/No points were found for 01\/07\/2026 - 30\/07\/2026/i),
    ).toHaveTextContent(
      "Showing latest available leaderboard from 01/06/2026 - 30/06/2026",
    );
    expect(
      screen.queryByText("No leaderboard points for this campaign yet."),
    ).not.toBeInTheDocument();
  });

  it("skips unchanged tasks while saving campaign and rank rewards", async () => {
    const user = userEvent.setup();
    questQueries.saveQuestRewards.mockResolvedValue({
      ...quest,
      reward_distribution_delay_days: 0,
      reward_distribution_mode: "campaign_end",
      reward_distribution_scheduled_at: "2026-06-30T00:00:00.000Z",
    });
    renderQuestTable();

    await user.click(await screen.findByRole("tab", { name: /Rewards/i }));
    await user.click(
      screen.getByRole("combobox", { name: "Reward distribution schedule" }),
    );
    await user.click(
      screen.getByRole("option", {
        name: "Automatically when campaign ends",
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Save quest changes" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestRewards).toHaveBeenCalledWith("quest-1", {
        expected_config_revision: 0,
        rewards: [{ rank: 1, reward: 1200, currency: "THB" }],
        reward_distribution_mode: "campaign_end",
        reward_distribution_delay_days: 0,
      }),
    );
    expect(questQueries.saveQuestCampaign).toHaveBeenCalledTimes(1);
    expect(questQueries.saveQuestTasks).not.toHaveBeenCalled();
  });

  it("uses a list-only default view with dedicated create and edit routes", async () => {
    renderQuestTable("list");

    expect(
      await screen.findByRole("link", { name: "Create quest" }),
    ).toHaveAttribute("href", "/quest/create");
    expect(await screen.findByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/quest/quest-1/edit",
    );
    expect(screen.queryByTestId("quest-detail-editor")).not.toBeInTheDocument();
  });

  it("renders campaign date fields with the shared admin date picker", async () => {
    renderQuestTable();

    expect(
      await screen.findByTestId("quest-campaign-start-date"),
    ).toHaveAttribute("data-datepicker-component", "true");
    expect(screen.getByTestId("quest-campaign-end-date")).toHaveAttribute(
      "data-datepicker-component",
      "true",
    );
  });

  it("marks the required Start and End date fields (#289)", async () => {
    renderQuestTable();

    expect(
      await screen.findByTestId("quest-campaign-start-date"),
    ).toHaveAttribute("data-required", "true");
    expect(screen.getByTestId("quest-campaign-end-date")).toHaveAttribute(
      "data-required",
      "true",
    );
  });

  it("requires all four banner files before a new quest can be created (#340)", async () => {
    renderQuestTable("create");

    fireEvent.change(screen.getByLabelText("Quest start date and time"), {
      target: { value: "2026-07-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Quest end date and time"), {
      target: { value: "2026-07-31T22:15" },
    });

    expect(
      screen.getByText(
        "Upload Banner EN, Banner TH, Sub banner EN, and Sub banner TH before creating the quest.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Save and create quest" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Banner EN")).toBeRequired();
    expect(screen.getByLabelText("Sub banner TH")).toBeRequired();
  });

  it("shows a specific campaign error notice, not a bare 'Save failed' (#289)", async () => {
    const user = userEvent.setup();
    // A failure with no backend message must fall back to action-specific copy.
    questQueries.saveQuestCampaign.mockRejectedValue({ status: 500 });
    renderQuestTable("create");

    fireEvent.change(screen.getByLabelText("Quest start date and time"), {
      target: { value: "2026-07-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Quest end date and time"), {
      target: { value: "2026-07-31T22:15" },
    });
    for (const label of [
      "Banner EN",
      "Banner TH",
      "Sub banner EN",
      "Sub banner TH",
    ]) {
      await user.upload(
        screen.getByLabelText(label),
        new File([label], `${label.replaceAll(" ", "-")}.png`, {
          type: "image/png",
        }),
      );
    }
    await user.click(
      screen.getByRole("button", { name: "Save and create quest" }),
    );

    expect(
      await screen.findByText(
        "Couldn't save the complete quest. The campaign may have been created, so review the settings and retry to finish it.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Save failed")).not.toBeInTheDocument();
  });

  it("surfaces the field-specific API error when a quest banner upload fails (#340)", async () => {
    const user = userEvent.setup();
    const uploadError =
      "Could not upload Banner TH. Please choose the image again and retry.";
    questQueries.saveQuestCampaign.mockRejectedValue({
      response: { data: { message: uploadError } },
    });
    renderQuestTable("create");

    fireEvent.change(screen.getByLabelText("Quest start date and time"), {
      target: { value: "2026-07-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Quest end date and time"), {
      target: { value: "2026-07-31T22:15" },
    });
    for (const label of [
      "Banner EN",
      "Banner TH",
      "Sub banner EN",
      "Sub banner TH",
    ]) {
      await user.upload(
        screen.getByLabelText(label),
        new File([label], `${label.replaceAll(" ", "-")}.png`, {
          type: "image/png",
        }),
      );
    }
    await user.click(
      screen.getByRole("button", { name: "Save and create quest" }),
    );

    expect(await screen.findByText(uploadError)).toBeInTheDocument();
  });

  it("creates the campaign, tasks, and rewards from the dedicated create view", async () => {
    const user = userEvent.setup();
    questQueries.saveQuestCampaign.mockResolvedValue(newQuest);
    questQueries.saveQuestTasks.mockResolvedValue(newQuest);
    questQueries.saveQuestRewards.mockResolvedValue(newQuest);
    renderQuestTable("create");

    expect(
      await screen.findByRole("heading", { name: "Create quest" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /Leaderboard/i }),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Quest start date and time"), {
      target: { value: "2026-07-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Quest end date and time"), {
      target: { value: "2026-07-31T22:15" },
    });
    const bannerFiles = {
      banner_en: new File(["banner-en"], "banner-en.png", {
        type: "image/png",
      }),
      banner_th: new File(["banner-th"], "banner-th.png", {
        type: "image/png",
      }),
      sub_banner_en: new File(["sub-banner-en"], "sub-banner-en.png", {
        type: "image/png",
      }),
      sub_banner_th: new File(["sub-banner-th"], "sub-banner-th.png", {
        type: "image/png",
      }),
    };
    await user.upload(
      screen.getByLabelText("Banner EN"),
      bannerFiles.banner_en,
    );
    await user.upload(
      screen.getByLabelText("Banner TH"),
      bannerFiles.banner_th,
    );
    await user.upload(
      screen.getByLabelText("Sub banner EN"),
      bannerFiles.sub_banner_en,
    );
    await user.upload(
      screen.getByLabelText("Sub banner TH"),
      bannerFiles.sub_banner_th,
    );
    await user.click(
      screen.getByRole("button", { name: "Save and create quest" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestCampaign).toHaveBeenCalled(),
    );
    const formData = questQueries.saveQuestCampaign.mock.calls.at(
      -1,
    )?.[0] as FormData;
    expect(formData.get("start_date")).toBe("2026-07-01T02:30:00.000Z");
    expect(formData.get("end_date")).toBe("2026-07-31T15:15:00.000Z");
    expect(formData.get("banner_en")).toBe(bannerFiles.banner_en);
    expect(formData.get("banner_th")).toBe(bannerFiles.banner_th);
    expect(formData.get("sub_banner_en")).toBe(bannerFiles.sub_banner_en);
    expect(formData.get("sub_banner_th")).toBe(bannerFiles.sub_banner_th);
    expect(questQueries.saveQuestTasks).toHaveBeenCalledWith(
      "quest-2",
      expect.objectContaining({
        reward_model: "legacy_v1",
        expected_config_revision: 0,
        timezone: "Asia/Bangkok",
        tasks: [],
      }),
    );
    expect(questQueries.saveQuestRewards).toHaveBeenCalledWith(
      "quest-2",
      expect.objectContaining({
        expected_config_revision: 0,
        rewards: [],
      }),
    );
  });

  it("requests task-v2 only for typed tasks and explains an unavailable engine", async () => {
    const user = userEvent.setup();
    questQueries.saveQuestCampaign.mockResolvedValue(newQuest);
    questQueries.saveQuestTasks.mockRejectedValue({
      response: {
        data: {
          code: "QUEST_TASK_V2_UNAVAILABLE",
          message: "Task-v2 engine is unavailable.",
        },
      },
    });
    renderQuestTable("create");

    await user.click(await screen.findByRole("button", { name: "Add task" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Task type" }),
      "friend_referral",
    );
    await user.type(
      screen.getByLabelText("English"),
      "Invite a friend who creates an account",
    );
    fireEvent.change(screen.getByLabelText("Quest start date and time"), {
      target: { value: "2099-07-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Quest end date and time"), {
      target: { value: "2099-07-31T22:15" },
    });
    for (const label of [
      "Banner EN",
      "Banner TH",
      "Sub banner EN",
      "Sub banner TH",
    ]) {
      await user.upload(
        screen.getByLabelText(label),
        new File([label], `${label.replaceAll(" ", "-")}.png`, {
          type: "image/png",
        }),
      );
    }
    await user.click(
      screen.getByRole("button", { name: "Save and create quest" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestTasks).toHaveBeenCalledWith(
        "quest-2",
        expect.objectContaining({
          reward_model: "task_v2",
          tasks: [expect.objectContaining({ task_type: "friend_referral" })],
        }),
      ),
    );
    expect(
      await screen.findByText(
        /Referral and spend tasks are not available in this environment/i,
      ),
    ).toBeVisible();
  });

  it("adopts the committed campaign and retries only later settings when the draft is unchanged (#340)", async () => {
    const user = userEvent.setup();
    questQueries.saveQuestCampaign.mockResolvedValue({
      ...newQuest,
      campaign_revision: 1,
    });
    questQueries.saveQuestTasks
      .mockRejectedValueOnce(new Error("task save failed"))
      .mockResolvedValue(newQuest);
    questQueries.saveQuestRewards.mockResolvedValue(newQuest);
    renderQuestTable("create");

    fireEvent.change(screen.getByLabelText("Quest start date and time"), {
      target: { value: "2026-07-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Quest end date and time"), {
      target: { value: "2026-07-31T22:15" },
    });
    for (const label of [
      "Banner EN",
      "Banner TH",
      "Sub banner EN",
      "Sub banner TH",
    ]) {
      await user.upload(
        screen.getByLabelText(label),
        new File([label], `${label.replaceAll(" ", "-")}.png`, {
          type: "image/png",
        }),
      );
    }

    await user.click(
      screen.getByRole("button", { name: "Save and create quest" }),
    );
    await screen.findByText("task save failed");
    await user.click(
      await screen.findByRole("button", { name: "Save quest changes" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestTasks).toHaveBeenCalledTimes(2),
    );
    const first = questQueries.saveQuestCampaign.mock.calls[0][0] as FormData;
    expect(questQueries.saveQuestCampaign).toHaveBeenCalledTimes(1);
    expect(first.get("_id")).toBeNull();
    expect(first.get("campaign_revision")).toBe("0");
    expect(first.get("expected_config_revision")).toBe("0");
  });

  it("does not replay a committed task revision when only the reward save failed", async () => {
    const user = userEvent.setup();
    const committed = { ...newQuest, campaign_revision: 1, config_revision: 0 };
    const taskCommitted = { ...committed, config_revision: 1 };
    questQueries.saveQuestCampaign.mockResolvedValue(committed);
    questQueries.saveQuestTasks.mockResolvedValue(taskCommitted);
    questQueries.saveQuestRewards
      .mockRejectedValueOnce(new Error("reward save failed"))
      .mockResolvedValue(taskCommitted);
    renderQuestTable("create");

    fireEvent.change(screen.getByLabelText("Quest start date and time"), {
      target: { value: "2026-07-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Quest end date and time"), {
      target: { value: "2026-07-31T22:15" },
    });
    for (const label of [
      "Banner EN",
      "Banner TH",
      "Sub banner EN",
      "Sub banner TH",
    ]) {
      await user.upload(
        screen.getByLabelText(label),
        new File([label], `${label.replaceAll(" ", "-")}.png`, {
          type: "image/png",
        }),
      );
    }

    await user.click(
      screen.getByRole("button", { name: "Save and create quest" }),
    );
    await screen.findByText("reward save failed");
    await user.click(
      await screen.findByRole("button", { name: "Save quest changes" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestRewards).toHaveBeenCalledTimes(2),
    );
    expect(questQueries.saveQuestCampaign).toHaveBeenCalledTimes(1);
    expect(questQueries.saveQuestTasks).toHaveBeenCalledTimes(1);
    expect(questQueries.saveQuestRewards).toHaveBeenLastCalledWith(
      "quest-2",
      expect.objectContaining({ expected_config_revision: 1 }),
    );
  });

  it("continues from the server-rotated config revision after a schedule revision", async () => {
    const user = userEvent.setup();
    const futureQuest = {
      ...quest,
      start_date: "2099-07-01T02:30:00.000Z",
      end_date: "2099-07-31T15:15:00.000Z",
      reward_model: "task_v2" as const,
      campaign_revision: 3,
      config_revision: 5,
    };
    const rotatedQuest = {
      ...futureQuest,
      start_date: "2099-07-02T02:30:00.000Z",
      campaign_revision: 4,
      config_revision: 6,
      tasks: futureQuest.tasks.map((task) => ({
        ...task,
        task_key: "task_schedule_revision_6_1234",
      })),
    };
    questQueries.fetchAdminQuests.mockResolvedValue([futureQuest]);
    questQueries.saveQuestCampaign.mockResolvedValue(rotatedQuest);
    questQueries.saveQuestTasks.mockResolvedValue(rotatedQuest);
    questQueries.saveQuestRewards.mockResolvedValue(rotatedQuest);
    renderQuestTable();

    const start = await screen.findByLabelText("Quest start date and time");
    fireEvent.change(start, { target: { value: "2099-07-02T09:30" } });
    await user.click(
      screen.getByRole("button", { name: "Save quest changes" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestRewards).toHaveBeenCalledWith(
        "quest-1",
        expect.objectContaining({ expected_config_revision: 6 }),
      ),
    );
    expect(questQueries.saveQuestTasks).not.toHaveBeenCalled();
  });

  it("preserves a brand-only task-v2 model when retrying a failed reward save", async () => {
    const user = userEvent.setup();
    const futureQuest = {
      ...quest,
      start_date: "2099-07-01T02:30:00.000Z",
      end_date: "2099-07-31T15:15:00.000Z",
      reward_model: "task_v2" as const,
      campaign_revision: 3,
      config_revision: 5,
    };
    const campaignCommitted = {
      ...futureQuest,
      facebook_page: "https://facebook.example/updated",
      campaign_revision: 4,
    };
    const tasksCommitted = { ...campaignCommitted, config_revision: 6 };
    questQueries.fetchAdminQuests.mockResolvedValue([futureQuest]);
    questQueries.saveQuestCampaign.mockResolvedValue(campaignCommitted);
    questQueries.saveQuestTasks.mockResolvedValue(tasksCommitted);
    questQueries.saveQuestRewards
      .mockRejectedValueOnce(new Error("reward save failed"))
      .mockResolvedValue(tasksCommitted);
    renderQuestTable();

    const facebookPage = await screen.findByLabelText("Facebook page");
    await user.clear(facebookPage);
    await user.type(facebookPage, "https://facebook.example/updated");
    const englishWording = screen.getByLabelText("English");
    await user.clear(englishWording);
    await user.type(englishWording, "Updated brand wording");
    await user.click(
      screen.getByRole("button", { name: "Save quest changes" }),
    );
    await screen.findByText("reward save failed");
    await user.click(
      screen.getByRole("button", { name: "Save quest changes" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestRewards).toHaveBeenCalledTimes(2),
    );
    expect(questQueries.saveQuestCampaign).toHaveBeenCalledTimes(1);
    expect(questQueries.saveQuestTasks).toHaveBeenCalledTimes(1);
    expect(questQueries.saveQuestTasks).toHaveBeenCalledWith(
      "quest-1",
      expect.objectContaining({ reward_model: "task_v2" }),
    );
  });

  it("skips the task endpoint for a campaign-only edit", async () => {
    const user = userEvent.setup();
    const futureQuest = {
      ...quest,
      start_date: "2099-07-01T02:30:00.000Z",
      end_date: "2099-07-31T15:15:00.000Z",
      reward_model: "task_v2" as const,
      campaign_revision: 3,
      config_revision: 5,
    };
    const campaignCommitted = {
      ...futureQuest,
      facebook_page: "https://facebook.example/campaign-only",
      campaign_revision: 4,
    };
    questQueries.fetchAdminQuests.mockResolvedValue([futureQuest]);
    questQueries.saveQuestCampaign.mockResolvedValue(campaignCommitted);
    questQueries.saveQuestRewards.mockResolvedValue(campaignCommitted);
    renderQuestTable();

    const facebookPage = await screen.findByLabelText("Facebook page");
    await user.clear(facebookPage);
    await user.type(facebookPage, "https://facebook.example/campaign-only");
    await user.click(
      screen.getByRole("button", { name: "Save quest changes" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestRewards).toHaveBeenCalledWith(
        "quest-1",
        expect.objectContaining({ expected_config_revision: 5 }),
      ),
    );
    expect(questQueries.saveQuestTasks).not.toHaveBeenCalled();
  });

  it("keeps the newest campaign revision across repeated partial-save retries", async () => {
    const user = userEvent.setup();
    const futureQuest = {
      ...quest,
      start_date: "2099-07-01T02:30:00.000Z",
      end_date: "2099-07-31T15:15:00.000Z",
      reward_model: "task_v2" as const,
      campaign_revision: 3,
      config_revision: 5,
    };
    const firstCampaign = {
      ...futureQuest,
      facebook_page: "https://facebook.example/first",
      campaign_revision: 4,
    };
    const firstTasks = { ...firstCampaign, config_revision: 6 };
    const secondCampaign = {
      ...firstTasks,
      facebook_page: "https://facebook.example/second",
      campaign_revision: 5,
    };
    const thirdCampaign = {
      ...secondCampaign,
      facebook_page: "https://facebook.example/third",
      campaign_revision: 6,
    };
    questQueries.fetchAdminQuests.mockResolvedValue([futureQuest]);
    questQueries.saveQuestCampaign
      .mockResolvedValueOnce(firstCampaign)
      .mockResolvedValueOnce(secondCampaign)
      .mockResolvedValueOnce(thirdCampaign);
    questQueries.saveQuestTasks.mockResolvedValue(firstTasks);
    questQueries.saveQuestRewards
      .mockRejectedValueOnce(new Error("first reward failure"))
      .mockRejectedValueOnce(new Error("second reward failure"))
      .mockResolvedValue(thirdCampaign);
    renderQuestTable();

    const facebookPage = await screen.findByLabelText("Facebook page");
    const englishWording = screen.getByLabelText("English");
    await user.clear(englishWording);
    await user.type(englishWording, "Updated brand wording");
    for (const [value, failure] of [
      ["https://facebook.example/first", "first reward failure"],
      ["https://facebook.example/second", "second reward failure"],
    ] as const) {
      await user.clear(facebookPage);
      await user.type(facebookPage, value);
      await user.click(
        screen.getByRole("button", { name: "Save quest changes" }),
      );
      await screen.findByText(failure);
    }
    await user.clear(facebookPage);
    await user.type(facebookPage, "https://facebook.example/third");
    await user.click(
      screen.getByRole("button", { name: "Save quest changes" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestCampaign).toHaveBeenCalledTimes(3),
    );
    const thirdRequest = questQueries.saveQuestCampaign.mock
      .calls[2][0] as FormData;
    expect(thirdRequest.get("campaign_revision")).toBe("5");
    expect(thirdRequest.get("expected_config_revision")).toBe("6");
    expect(questQueries.saveQuestTasks).toHaveBeenCalledTimes(1);
  });

  it("updates the adopted campaign with CAS when its draft or file changes after a partial save (#340)", async () => {
    const user = userEvent.setup();
    const committed = { ...newQuest, campaign_revision: 1 };
    const updated = {
      ...committed,
      campaign_revision: 2,
      facebook_page: "https://facebook.example/changed",
    };
    questQueries.saveQuestCampaign
      .mockResolvedValueOnce(committed)
      .mockResolvedValueOnce(updated);
    questQueries.saveQuestTasks
      .mockRejectedValueOnce(new Error("task save failed"))
      .mockResolvedValue(updated);
    questQueries.saveQuestRewards.mockResolvedValue(updated);
    renderQuestTable("create");

    fireEvent.change(screen.getByLabelText("Quest start date and time"), {
      target: { value: "2026-07-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Quest end date and time"), {
      target: { value: "2026-07-31T22:15" },
    });
    for (const label of [
      "Banner EN",
      "Banner TH",
      "Sub banner EN",
      "Sub banner TH",
    ]) {
      await user.upload(
        screen.getByLabelText(label),
        new File([label], `${label.replaceAll(" ", "-")}.png`, {
          type: "image/png",
        }),
      );
    }

    await user.click(
      screen.getByRole("button", { name: "Save and create quest" }),
    );
    await screen.findByText("task save failed");
    fireEvent.change(screen.getByLabelText("Facebook page"), {
      target: { value: "https://facebook.example/changed" },
    });
    const changedBanner = new File(["changed"], "changed-banner-en.png", {
      type: "image/png",
    });
    await user.upload(screen.getByLabelText("Banner EN"), changedBanner);
    await user.click(
      await screen.findByRole("button", { name: "Save quest changes" }),
    );

    await waitFor(() =>
      expect(questQueries.saveQuestCampaign).toHaveBeenCalledTimes(2),
    );
    const initial = questQueries.saveQuestCampaign.mock.calls[0][0] as FormData;
    const edit = questQueries.saveQuestCampaign.mock.calls[1][0] as FormData;
    expect(initial.get("_id")).toBeNull();
    expect(edit.get("_id")).toBe("quest-2");
    expect(edit.get("campaign_revision")).toBe("1");
    expect(edit.get("expected_config_revision")).toBe("0");
    expect(edit.get("request_key")).not.toBe(initial.get("request_key"));
    expect(edit.get("banner_en")).toBe(changedBanner);
  });

  it("renders quest status labels as admin-friendly wording", async () => {
    questQueries.fetchAdminQuests.mockResolvedValue([quest, closedQuest]);

    renderQuestTable("list");

    expect((await screen.findAllByText("Closed")).length).toBe(2);
    expect(screen.queryByText("open")).not.toBeInTheDocument();
    expect(screen.queryByText("close")).not.toBeInTheDocument();
  });

  it("previews a stored banner and shows none for an empty banner slot (BUG 4)", async () => {
    const driveId = "1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh";
    questQueries.fetchAdminQuests.mockResolvedValue([
      { ...quest, banner_en: driveId, banner_th: "" },
    ]);
    renderQuestTable();

    const preview = await screen.findByAltText("Current Banner EN");
    expect(preview).toHaveAttribute(
      "src",
      `https://drive.google.com/uc?export=view&id=${driveId}`,
    );
    // An empty banner slot must not render a stale preview.
    expect(screen.queryByAltText("Current Banner TH")).not.toBeInTheDocument();
  });

  it("does not preview banners while creating a new quest (BUG 4)", async () => {
    renderQuestTable("create");

    await screen.findByLabelText("Banner EN");
    expect(screen.queryByAltText("Current Banner EN")).not.toBeInTheDocument();
  });

  it("explains where legacy-quest brand tasks live (GAP 5)", async () => {
    // Default fixture quest is reward_model: "legacy_v1".
    renderQuestTable();

    expect(
      await screen.findByText(
        /brand tasks are managed per-offer in the Offers module/i,
      ),
    ).toBeVisible();
  });

  it("hides the legacy-quest note for a task-v2 quest (GAP 5)", async () => {
    questQueries.fetchAdminQuests.mockResolvedValue([
      { ...quest, reward_model: "task_v2" },
    ]);
    renderQuestTable();

    await screen.findByRole("tab", { name: /Quest tasks/i });
    expect(
      screen.queryByText(
        /brand tasks are managed per-offer in the Offers module/i,
      ),
    ).not.toBeInTheDocument();
  });
});
