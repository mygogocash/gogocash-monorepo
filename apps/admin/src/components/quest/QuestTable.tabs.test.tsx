// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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
  }) => (
    <select
      id={id}
      aria-label="Brand"
      disabled={disabled}
      value={valueOfferId}
      onChange={(event) => {
        if (selectedOffer && event.currentTarget.value === selectedOffer._id) {
          onSelect(selectedOffer);
        }
      }}
    >
      {selectedOffer ? (
        <option value={selectedOffer._id}>
          {selectedOffer.offer_name_display || selectedOffer.offer_name}
        </option>
      ) : null}
    </select>
  ),
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
      merchant_id: 700101,
      notes: "",
      offer,
      offer_id: 900101,
      sort_order: 0,
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
  reward_distribution_delay_days: 0,
  reward_distribution_mode: "campaign_end",
  reward_distribution_scheduled_at: "2026-07-31T15:15:00.000Z",
  rewards: [],
  start_date: "2026-07-01T00:00:00.000Z",
  tasks: [],
  updatedAt: "2026-07-01T00:00:00.000Z",
} satisfies ResponseQuestDate;

function renderQuestTable() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <QuestTable />
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
    expect(screen.getByRole("button", { name: "Save tasks" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Save rewards" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Leaderboard/i }));

    await waitFor(() =>
      expect(screen.getByText("Leader One")).toBeInTheDocument(),
    );
    expect(tasksTab).toHaveAttribute("aria-selected", "false");
    expect(
      screen.queryByRole("button", { name: "Save tasks" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Rewards/i }));

    expect(screen.getByRole("button", { name: "Save rewards" })).toBeVisible();
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

  it("saves rank rewards with the selected distribution schedule", async () => {
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
    await user.click(screen.getByRole("button", { name: "Save rewards" }));

    await waitFor(() =>
      expect(questQueries.saveQuestRewards).toHaveBeenCalledWith("quest-1", {
        rewards: [{ rank: 1, reward: 1200, currency: "THB" }],
        reward_distribution_mode: "campaign_end",
        reward_distribution_delay_days: 0,
      }),
    );
  });

  it("uses a compact campaign selector above the full-width editor", async () => {
    renderQuestTable();

    const selector = await screen.findByTestId("quest-campaign-selector");
    const editor = screen.getByTestId("quest-detail-editor");

    expect(selector.compareDocumentPosition(editor)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(selector).toHaveAttribute("aria-label", "Quest campaigns");
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

  it("shows a specific campaign error notice, not a bare 'Save failed' (#289)", async () => {
    const user = userEvent.setup();
    // A failure with no backend message must fall back to action-specific copy.
    questQueries.saveQuestCampaign.mockRejectedValue({ status: 500 });
    renderQuestTable();

    await user.click(await screen.findByRole("button", { name: "New Quest" }));
    fireEvent.change(screen.getByLabelText("Quest start date and time"), {
      target: { value: "2026-07-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Quest end date and time"), {
      target: { value: "2026-07-31T22:15" },
    });
    await user.click(screen.getByRole("button", { name: "Save campaign" }));

    expect(
      await screen.findByText(
        "Couldn't save the quest campaign. Please review the fields and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Save failed")).not.toBeInTheDocument();
  });

  it("shows a new quest draft and inserts the saved quest into the selector", async () => {
    const user = userEvent.setup();
    questQueries.saveQuestCampaign.mockResolvedValue(newQuest);
    renderQuestTable();

    await user.click(await screen.findByRole("button", { name: "New Quest" }));

    expect(screen.getByText("New Quest draft")).toBeInTheDocument();
    expect(
      screen.getByText("Set dates and save to create this campaign."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Quest start date and time"), {
      target: { value: "2026-07-01T09:30" },
    });
    fireEvent.change(screen.getByLabelText("Quest end date and time"), {
      target: { value: "2026-07-31T22:15" },
    });
    await user.click(screen.getByRole("button", { name: "Save campaign" }));

    await waitFor(() =>
      expect(questQueries.saveQuestCampaign).toHaveBeenCalled(),
    );
    const formData = questQueries.saveQuestCampaign.mock.calls.at(
      -1,
    )?.[0] as FormData;
    expect(formData.get("start_date")).toBe("2026-07-01T02:30:00.000Z");
    expect(formData.get("end_date")).toBe("2026-07-31T15:15:00.000Z");

    await waitFor(() =>
      expect(
        screen.getAllByText("01/07/2026 - 31/07/2026").length,
      ).toBeGreaterThan(0),
    );
    expect(screen.queryByText("New Quest draft")).not.toBeInTheDocument();
  });

  it("renders quest status labels as admin-friendly wording", async () => {
    questQueries.fetchAdminQuests.mockResolvedValue([quest, closedQuest]);

    renderQuestTable();

    const selector = await screen.findByTestId("quest-campaign-selector");
    expect(await within(selector).findByText("Active")).toBeVisible();
    expect(within(selector).getByText("Closed")).toBeInTheDocument();
    expect(within(selector).queryByText("open")).not.toBeInTheDocument();
    expect(within(selector).queryByText("close")).not.toBeInTheDocument();
  });
});
