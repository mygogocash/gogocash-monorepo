// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Offer } from "@/types/api";
import SearchConfigManagement from "./SearchConfigManagement";

const permissionsState = vi.hoisted(() => ({ canManage: true }));
const apiMocks = vi.hoisted(() => ({
  deleteSearchRule: vi.fn(),
  getSearchRules: vi.fn(),
  postSearchRule: vi.fn(),
  putSearchRule: vi.fn(),
}));
const fetchOffersListMock = vi.hoisted(() => vi.fn());
const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/lib/api/adminModulesApi", () => apiMocks);
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: (permission: string) =>
      permission === "brands:manage" && permissionsState.canManage,
    canAny: () => permissionsState.canManage,
    ready: true,
    role: permissionsState.canManage ? "editor" : "viewer",
    rolesLoaded: true,
  }),
}));
vi.mock("@/lib/query/offersQueries", () => ({
  fetchOffersList: fetchOffersListMock,
  offersListQueryKey: (query: {
    search?: string;
    page?: number;
    limit?: number;
    country?: string;
  }) => [
    "offers",
    "list",
    query.search ?? "",
    query.page ?? 1,
    query.limit ?? 10,
    query.country ?? "",
  ],
}));
vi.mock("react-hot-toast", () => ({ default: toastMocks }));

const offer = {
  _id: "507f1f77bcf86cd799439011",
  offer_name: "Klook Travel - CPS",
  offer_name_display: "Klook Travel",
  logo_desktop: "",
  categories: "Travel",
  countries: "Thailand",
} as Offer;

const persistedRule = {
  id: "507f1f77bcf86cd799439012",
  offer_id: offer._id,
  offer_name: "Klook Travel",
  treatment: "pinned" as const,
  keywords: ["travel", "hotel"],
  weight: 5,
  is_active: true,
  createdAt: "2026-07-15T00:00:00.000Z",
  updatedAt: "2026-07-15T01:00:00.000Z",
};

function renderManagement() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SearchConfigManagement />
    </QueryClientProvider>,
  );
}

async function buildPinnedRule(user: ReturnType<typeof userEvent.setup>) {
  const searchInput = await screen.findByPlaceholderText(
    "Search name, partner, or offer ID…",
  );
  await user.type(searchInput, "Klook");
  await user.click(await screen.findByRole("button", { name: "Klook Travel" }));
  await user.click(screen.getByRole("button", { name: "Save" }));
  await user.click(screen.getByRole("button", { name: "Pinned search" }));
  await user.click(screen.getByRole("switch"));
  await user.type(screen.getByPlaceholderText("Keyword"), "Travel");
  await user.click(screen.getByRole("button", { name: "Add" }));
  await user.click(screen.getByRole("button", { name: "Save" }));
}

describe("SearchConfigManagement persistent rules", () => {
  beforeEach(() => {
    permissionsState.canManage = true;
    apiMocks.getSearchRules.mockResolvedValue([persistedRule]);
    apiMocks.postSearchRule.mockResolvedValue(persistedRule);
    apiMocks.putSearchRule.mockResolvedValue(persistedRule);
    apiMocks.deleteSearchRule.mockResolvedValue({ success: true });
    fetchOffersListMock.mockResolvedValue({
      data: [offer],
      limit: 30,
      page: 1,
      total: 1,
      totalPages: 1,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("hydrates existing rules into the always-visible summary", async () => {
    renderManagement();

    expect(
      await screen.findByRole("heading", { name: "Search Config" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Klook Travel")).toBeInTheDocument();
    expect(screen.getByText("travel")).toBeInTheDocument();
    expect(screen.getByText("hotel")).toBeInTheDocument();
  });

  it("keeps the summary visible with an explicit empty state", async () => {
    apiMocks.getSearchRules.mockResolvedValue([]);
    renderManagement();

    expect(
      await screen.findByRole("heading", { name: "Search Config" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No search rules configured yet."),
    ).toBeInTheDocument();
  });

  it("creates one normalized DTO-aligned rule per selected offer", async () => {
    apiMocks.getSearchRules.mockResolvedValue([]);
    const user = userEvent.setup();
    renderManagement();

    await buildPinnedRule(user);

    await waitFor(() => {
      expect(apiMocks.postSearchRule).toHaveBeenCalledWith({
        offer_id: offer._id,
        treatment: "pinned",
        keywords: ["travel"],
        is_active: true,
      });
    });
  });

  it("edits and deletes persisted rules through API mutations", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "confirm", {
      configurable: true,
      value: vi.fn(() => true),
    });
    renderManagement();

    await user.click(
      await screen.findByRole("button", { name: "Edit Klook Travel" }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Treatment for Klook Travel" }),
      "blocked",
    );
    const keywordsInput = screen.getByRole("textbox", {
      name: "Keywords for Klook Travel",
    });
    await user.clear(keywordsInput);
    await user.type(keywordsInput, "Fraud, Scam");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(apiMocks.putSearchRule).toHaveBeenCalledWith(persistedRule.id, {
        treatment: "blocked",
        keywords: ["fraud", "scam"],
        is_active: true,
      });
    });

    await user.click(
      screen.getByRole("button", { name: "Delete Klook Travel" }),
    );
    await waitFor(() => {
      expect(apiMocks.deleteSearchRule).toHaveBeenCalledWith(
        persistedRule.id,
        expect.anything(),
      );
    });
  });

  it("explains read-only access and hides every mutation control", async () => {
    permissionsState.canManage = false;
    renderManagement();

    expect(
      await screen.findByText(
        "You have read-only access. Ask an administrator for Brands Management permission to change search rules.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Add a search rule" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit Klook Travel" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete Klook Travel" }),
    ).not.toBeInTheDocument();
  });

  it("surfaces the real API message when create fails", async () => {
    apiMocks.getSearchRules.mockResolvedValue([]);
    apiMocks.postSearchRule.mockRejectedValue({
      response: { data: { message: "Search rule already exists" } },
    });
    const user = userEvent.setup();
    renderManagement();

    await buildPinnedRule(user);

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith(
        "Search rule already exists",
      );
    });
  });
});
