// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Offer } from "@/types/api";
import SearchConfigManagement from "./SearchConfigManagement";

const adminApiMocks = vi.hoisted(() => ({
  deleteSearchRule: vi.fn(),
  getSearchRules: vi.fn(),
  postSearchRule: vi.fn(),
  putSearchRule: vi.fn(),
}));

const fetchOffersListMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/adminModulesApi", () => adminApiMocks);

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: () => true,
    canAny: () => true,
    ready: true,
    role: "editor",
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

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const offers = [
  {
    _id: "offer-shopee",
    offer_name: "Shopee TH - CPS",
    offer_name_display: "Shopee",
    logo_desktop: "",
    categories: "Marketplace",
    countries: "Thailand",
  },
  {
    _id: "offer-lazada",
    offer_name: "Lazada TH - CPS",
    offer_name_display: "Lazada",
    logo_desktop: "",
    categories: "Marketplace",
    countries: "Thailand",
  },
] as Offer[];

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

async function chooseThailand(user: ReturnType<typeof userEvent.setup>) {
  const countryInput = screen.getByRole("textbox", {
    name: "Filter brands by country",
  });
  await user.click(countryInput);
  await user.click(screen.getByRole("button", { name: /Thailand/ }));
  return countryInput;
}

describe("SearchConfigManagement brand selection", () => {
  beforeEach(() => {
    adminApiMocks.getSearchRules.mockResolvedValue([]);
    fetchOffersListMock.mockImplementation(
      async ({ search = "" }: { search?: string }) => {
        const normalizedSearch = search.trim().toLowerCase();
        const data = normalizedSearch
          ? offers.filter((offer) =>
              offer.offer_name_display
                ?.toLowerCase()
                .includes(normalizedSearch),
            )
          : offers;
        return {
          data,
          limit: 30,
          page: 1,
          total: data.length,
          totalPages: 1,
        };
      },
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("resets and focuses the picker after each successful selection", async () => {
    const user = userEvent.setup();
    renderManagement();

    const searchInput = await screen.findByPlaceholderText(
      "Search name, partner, or offer ID…",
    );
    const countryInput = await chooseThailand(user);
    await user.type(searchInput, "Shopee");

    await waitFor(() => {
      expect(fetchOffersListMock).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Shopee", country: "Thailand" }),
      );
    });
    await user.click(await screen.findByRole("button", { name: "Shopee" }));

    await waitFor(() => {
      expect(searchInput).toHaveValue("");
      expect(countryInput).toHaveValue("");
      expect(searchInput).toHaveFocus();
      expect(
        screen.queryByRole("button", { name: "Lazada" }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("No matches.")).not.toBeInTheDocument();
    });

    await user.type(searchInput, "Lazada");
    await user.click(await screen.findByRole("button", { name: "Lazada" }));

    await waitFor(() => {
      expect(searchInput).toHaveValue("");
      expect(searchInput).toHaveFocus();
      expect(
        screen.getByRole("button", { name: "Remove Shopee" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Remove Lazada" }),
      ).toBeInTheDocument();
    });
  });

  it("keeps an unsuccessful duplicate search intact without adding twice", async () => {
    const user = userEvent.setup();
    renderManagement();

    const searchInput = await screen.findByPlaceholderText(
      "Search name, partner, or offer ID…",
    );
    await user.type(searchInput, "Shopee");
    await user.click(await screen.findByRole("button", { name: "Shopee" }));

    const countryInput = await chooseThailand(user);
    await user.type(searchInput, "Shopee");

    expect(await screen.findByText("No matches.")).toBeInTheDocument();
    expect(searchInput).toHaveValue("Shopee");
    expect(countryInput).toHaveValue("🇹🇭 Thailand");
    expect(
      screen.getAllByRole("button", { name: "Remove Shopee" }),
    ).toHaveLength(1);
  });
});
