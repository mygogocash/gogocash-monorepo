// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TopBrandManagementPanel from "./TopBrandManagementPanel";
import type { Offer } from "@/types/api";

const apiClientMock = vi.hoisted(() => ({
  getTopBrands: vi.fn(),
  saveTopBrands: vi.fn(),
}));

const fetchOffersListMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", () => ({
  apiClient: apiClientMock,
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

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: () => true,
    canAny: () => true,
    ready: true,
    role: "editor",
    rolesLoaded: true,
  }),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const shopeeOffer = {
  _id: "o-shopee",
  disabled: false,
  extra_store: true,
  logo_circle: "",
  logo_desktop: "",
  logo_mobile: "",
  offer_id: 2001,
  offer_name: "Shopee TH - CPS",
  offer_name_display: "Shopee",
  commission_store: 5.6,
  countries: "TH",
} as Offer;

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <ThemeProvider theme={createTheme()}>
      <QueryClientProvider client={queryClient}>
        <TopBrandManagementPanel />
      </QueryClientProvider>
    </ThemeProvider>,
  );
}

describe("TopBrandManagementPanel Autocomplete", () => {
  beforeEach(() => {
    apiClientMock.getTopBrands.mockResolvedValue({
      brands: [],
      brandsDesktop: [],
      brandsMobile: [],
      items: [],
      order: [],
      orderDesktop: [],
      orderMobile: [],
      maxBrands: 16,
    });
    fetchOffersListMock.mockResolvedValue({
      data: [shopeeOffer],
      limit: 100,
      page: 1,
      total: 1,
      totalPages: 1,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("given real MUI Autocomplete > when typing Shopee > then calls offer search with Shopee", async () => {
    const user = userEvent.setup();
    renderPanel();

    const input = await screen.findByRole("combobox", {
      name: "Search offers to add",
    });
    await user.click(input);
    await user.type(input, "Shopee");

    await waitFor(() => {
      expect(fetchOffersListMock).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Shopee" }),
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Shopee/i })).toBeInTheDocument();
    });
  });

  it("#479 given a disabled offer in search results > then it is not listed as a picker option", async () => {
    const user = userEvent.setup();
    fetchOffersListMock.mockResolvedValue({
      data: [{ ...shopeeOffer, disabled: true }],
      limit: 100,
      page: 1,
      total: 1,
      totalPages: 1,
    });

    renderPanel();

    const input = await screen.findByRole("combobox", {
      name: "Search offers to add",
    });
    await user.click(input);
    await user.type(input, "Shopee");

    await waitFor(() => {
      expect(fetchOffersListMock).toHaveBeenCalled();
    });
    expect(screen.queryByRole("option", { name: /Shopee/i })).toBeNull();
    expect(await screen.findByText(/No matching offers found/i)).toBeInTheDocument();
  });
});
