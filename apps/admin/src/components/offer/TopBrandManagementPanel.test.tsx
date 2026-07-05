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
const permissionsMock = vi.hoisted(() => ({
  canManageBrands: true,
}));

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

vi.mock("@mui/material/Autocomplete", () => ({
  default: ({
    disabled,
    options,
    onChange,
    onInputChange,
  }: {
    disabled?: boolean;
    options: Offer[];
    onChange: (_event: unknown, offer: Offer | null) => void;
    onInputChange: (
      _event: unknown,
      value: string,
      reason: string,
    ) => void;
  }) => (
    <div>
      <input
        aria-label="Search offers to add"
        disabled={disabled}
        onChange={(event) =>
          onInputChange?.(event, event.currentTarget.value, "input")
        }
      />
      <select
        aria-label="Select offer to add"
        disabled={disabled}
        onChange={(event) => {
          const offer =
            options.find((row) => row._id === event.currentTarget.value) ??
            null;
          onChange?.(event, offer);
        }}
      >
        <option value="">Select an offer…</option>
        {options.map((offer) => (
          <option key={offer._id} value={offer._id}>
            {offer.offer_name_display ?? offer.offer_name} · {offer._id}
          </option>
        ))}
      </select>
    </div>
  ),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: (permission: string) =>
      permission === "brands:manage" ? permissionsMock.canManageBrands : true,
    canAny: (permissions: string[]) =>
      permissions.some((permission) =>
        permission === "brands:manage" ? permissionsMock.canManageBrands : true,
      ),
    ready: true,
    role: permissionsMock.canManageBrands ? "editor" : "viewer",
    rolesLoaded: true,
  }),
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
  commission_store: 7,
} as Offer;

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

describe("TopBrandManagementPanel", () => {
  beforeEach(() => {
    permissionsMock.canManageBrands = true;
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

  it("given a viewer role > then renders top brand controls read-only", async () => {
    permissionsMock.canManageBrands = false;
    renderPanel();

    const cashbackInput = await screen.findByLabelText(
      "Cashback for Banana IT",
    );

    expect(
      screen.getByRole("textbox", { name: "Search offers to add" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Select offer to add")).toBeDisabled();
    expect(cashbackInput).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save top brands" })).toBeDisabled();
    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
  });

  it("given saved cashback is empty > when offer has commission_store > then shows derived cashback", async () => {
    apiClientMock.getTopBrands.mockResolvedValue({
      brands: [{ offerId: "o-shopee", cashback: "" }],
      items: [shopeeOffer],
      order: ["o-shopee"],
    });

    renderPanel();

    const cashbackInput = await screen.findByLabelText("Cashback for Shopee");
    expect(cashbackInput).toHaveValue("5.6%");
  });

  it("given a brand added from picker > when offer has commission_store > then prefills cashback", async () => {
    const user = userEvent.setup();
    apiClientMock.getTopBrands.mockResolvedValue({
      brands: [],
      items: [],
      order: [],
    });
    fetchOffersListMock.mockResolvedValue({
      data: [shopeeOffer],
      limit: 100,
      page: 1,
      total: 1,
      totalPages: 1,
    });

    renderPanel();

    await screen.findByRole("heading", { name: "Homepage top brands" });
    await user.type(
      screen.getByRole("textbox", { name: "Search offers to add" }),
      "Shopee",
    );

    await waitFor(() => {
      expect(fetchOffersListMock).toHaveBeenCalled();
    });

    const select = screen.getByLabelText("Select offer to add");
    await waitFor(() => {
      expect(select).toHaveTextContent("Shopee");
    });

    await user.selectOptions(select, "o-shopee");

    const cashbackInput = await screen.findByLabelText("Cashback for Shopee");
    expect(cashbackInput).toHaveValue("5.6%");
  });

  it("given a same-name variant not yet listed > then still appears in the picker", async () => {
    const user = userEvent.setup();
    fetchOffersListMock.mockResolvedValue({
      data: [
        {
          ...offer,
          _id: "o2",
          offer_name: "Banana IT MY - CPS",
          offer_name_display: "Banana IT",
          countries: "MY",
        },
      ],
      limit: 100,
      page: 1,
      total: 1,
      totalPages: 1,
    });

    renderPanel();
    await screen.findByLabelText("Cashback for Banana IT");

    await user.type(
      screen.getByRole("textbox", { name: "Search offers to add" }),
      "Banana",
    );

    await waitFor(() => {
      expect(fetchOffersListMock).toHaveBeenCalled();
    });

    const select = screen.getByLabelText("Select offer to add");
    await waitFor(() => {
      expect(select).toHaveTextContent("Banana IT");
      expect(select).toHaveTextContent("o2");
    });
  });
});
