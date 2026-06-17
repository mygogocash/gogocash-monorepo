// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  offersListQueryKey: (query: { search?: string }) => [
    "offers",
    "list",
    query.search ?? "",
  ],
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const offer = {
  _id: "o1",
  disabled: false,
  extra_store: true,
  logo_circle: "",
  logo_desktop: "",
  logo_mobile: "",
  offer_id: 1001,
  offer_name: "Banana IT TH - CPS",
  offer_name_display: "Banana IT",
} as Offer;

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TopBrandManagementPanel />
    </QueryClientProvider>,
  );
}

describe("TopBrandManagementPanel", () => {
  beforeEach(() => {
    apiClientMock.getTopBrands.mockResolvedValue({
      brands: [{ offerId: "o1", cashback: "12%" }],
      items: [offer],
      order: ["o1"],
    });
    apiClientMock.saveTopBrands.mockResolvedValue({
      brands: [{ offerId: "o1", cashback: "15%" }],
      success: true,
    });
    fetchOffersListMock.mockResolvedValue({
      data: [offer],
      limit: 80,
      page: 1,
      total: 1,
      totalPages: 1,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads saved cashback and saves the ordered brands payload", async () => {
    const user = userEvent.setup();
    renderPanel();

    const cashbackInput = await screen.findByLabelText(
      "Cashback for Banana IT",
    );
    expect(cashbackInput).toHaveValue("12%");

    await user.clear(cashbackInput);
    await user.type(cashbackInput, "15%");
    await user.click(screen.getByRole("button", { name: "Save top brands" }));

    await waitFor(() => {
      expect(apiClientMock.saveTopBrands).toHaveBeenCalledWith([
        { offerId: "o1", cashback: "15%" },
      ]);
    });
  });
});
