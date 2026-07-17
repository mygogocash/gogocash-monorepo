// @vitest-environment happy-dom
import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Offer } from "@/types/api";
import OffersTable from "./OffersTable";

const mocks = vi.hoisted(() => ({
  confirmDialog: vi.fn(() => null),
  deleteOffer: vi.fn(),
  fetchOffersList: vi.fn(),
  push: vi.fn(),
  updateListOffer: vi.fn(),
}));

vi.mock("@/lib/query/offersQueries", () => ({
  fetchOffersList: mocks.fetchOffersList,
  offersListQueryKey: (query: unknown) => ["offers", "list", query],
}));

vi.mock("@/lib/api", () => ({
  apiClient: {
    deleteOffer: mocks.deleteOffer,
    updateListOffer: mocks.updateListOffer,
  },
}));

vi.mock("@/lib/appLinks", () => ({
  appLinks: {
    offer: (id: string) => `https://app.example/open/offer/${id}`,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/components/common/RemoteOrBlobImage", () => ({
  RemoteOrBlobImage: () => null,
}));

vi.mock("@/components/common/ConfirmDialog", () => ({
  default: mocks.confirmDialog,
}));

vi.mock("./FormOffer", () => ({ default: () => null }));

const testOffer: Offer = {
  _id: "offer-348",
  offer_id: 348,
  __v: 0,
  categories: "Shopping",
  commission_tracking: "",
  commissions: [],
  countries: "Thailand",
  currency: "THB",
  datetime_created: new Date("2026-01-01T00:00:00.000Z"),
  datetime_updated: new Date("2026-01-01T00:00:00.000Z"),
  description: "",
  directory_page: "",
  is_require_approval: 0,
  logo: "",
  lookup_value: "merchant-one_th",
  marketplace_store_offer: false,
  merchant_id: 348,
  offer_name: "Merchant One",
  payment_terms: 30,
  preview_url: "",
  special_commissions: [],
  tracking_link: "https://merchant.example/track",
  tracking_type: "",
  validation_terms: 30,
  logo_desktop: "",
  logo_mobile: "",
  banner: "",
  logo_circle: "",
  disabled: false,
  offer_name_display: "Merchant One Thailand",
  commission_store: 7,
  max_cap: null,
  banner_mobile: "",
  extra_store: false,
  is_global: false,
};

function renderTable(setOpenModal = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(OffersTable, {
        openModal: false,
        setOpenModal,
      }),
    ),
  );
  return { setOpenModal };
}

async function openActions(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /^Actions$/ }));
  return screen.getByRole("menu");
}

describe("OffersTable row actions", () => {
  beforeEach(() => {
    mocks.confirmDialog.mockClear();
    mocks.deleteOffer.mockReset().mockResolvedValue(undefined);
    mocks.fetchOffersList.mockReset().mockResolvedValue({
      data: [testOffer],
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });
    mocks.push.mockReset();
    mocks.updateListOffer.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders only the supported row actions in product order", async () => {
    const user = userEvent.setup();
    renderTable();

    const menu = await openActions(user);
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent?.trim()),
    ).toEqual(["Edit", "View conversions", "Open in App ↗", "Delete"]);
    expect(within(menu).queryByText("View detail")).not.toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: "Open in App ↗" }),
    ).toHaveAttribute("href", "https://app.example/open/offer/offer-348");
  });

  it("preserves Edit, conversion navigation, and Delete handlers", async () => {
    const user = userEvent.setup();
    const setOpenModal = vi.fn();
    renderTable(setOpenModal);

    await openActions(user);
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(setOpenModal).toHaveBeenCalledWith(testOffer);

    await openActions(user);
    await user.click(
      screen.getByRole("menuitem", { name: "View conversions" }),
    );
    expect(mocks.push).toHaveBeenCalledWith(
      "/conversion?search=Merchant%20One",
    );
    expect(mocks.push).not.toHaveBeenCalledWith("/brands/offer-348");

    await openActions(user);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(mocks.confirmDialog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isOpen: true,
        title: "Delete “Merchant One Thailand”?",
      }),
      undefined,
    );
  });
});
