// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
    onInputChange: (_event: unknown, value: string, reason: string) => void;
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
      brandsDesktop: [{ offerId: "o1", cashback: "12%" }],
      brandsMobile: [{ offerId: "o1", cashback: "12%" }],
      items: [offer],
      order: ["o1"],
      orderDesktop: ["o1"],
      orderMobile: ["o1"],
      maxBrands: 16,
    });
    apiClientMock.saveTopBrands.mockResolvedValue({
      brands: [{ offerId: "o1", cashback: "15%" }],
      brandsDesktop: [{ offerId: "o1", cashback: "15%" }],
      brandsMobile: [{ offerId: "o1", cashback: "15%" }],
      success: true,
    });
    fetchOffersListMock.mockResolvedValue({
      data: [offer, shopeeOffer],
      limit: 80,
      page: 1,
      total: 2,
      totalPages: 1,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("saves ordered identities after removing from the landing preview (#476)", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(
      await screen.findByTestId("top-brand-landing-preview"),
    ).toHaveTextContent("Banana IT");

    // Make dirty via remove in the preview, then save empty dual payload.
    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    await user.click(screen.getByRole("button", { name: "Save top brands" }));

    await waitFor(() => {
      expect(apiClientMock.saveTopBrands).toHaveBeenCalledWith({
        brandsDesktop: [],
        brandsMobile: [],
      });
    });
  });

  // #278 resilience: a failed load must NOT replace the whole panel — the
  // picker and order list stay usable, with a non-blocking banner up top.
  it("given the top-brands load fails > then keeps the management UI and shows an error banner", async () => {
    apiClientMock.getTopBrands.mockRejectedValue({ status: 403, data: {} });

    renderPanel();

    expect(
      await screen.findByText("Could not load top brands."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Homepage top brands" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Search offers to add" }),
    ).not.toBeDisabled();
  });

  it("given the top-brands load fails with an API message > then the banner surfaces it", async () => {
    apiClientMock.getTopBrands.mockRejectedValue({
      status: 403,
      data: { message: "Forbidden resource" },
    });

    renderPanel();

    expect(await screen.findByText("Forbidden resource")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Homepage top brands" }),
    ).toBeInTheDocument();
  });

  it("given a viewer role > then renders top brand controls read-only", async () => {
    permissionsMock.canManageBrands = false;
    renderPanel();

    expect(
      await screen.findByTestId("top-brand-landing-preview"),
    ).toHaveTextContent("Banana IT");

    expect(
      screen.getByRole("textbox", { name: "Search offers to add" }),
    ).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Save top brands" }),
    ).toBeDisabled();
    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
  });

  it("given saved brands > then landing preview shows brand labels (#476)", async () => {
    apiClientMock.getTopBrands.mockResolvedValue({
      brands: [{ offerId: "o-shopee", cashback: "" }],
      brandsDesktop: [{ offerId: "o-shopee", cashback: "" }],
      brandsMobile: [{ offerId: "o-shopee", cashback: "" }],
      items: [shopeeOffer],
      order: ["o-shopee"],
      orderDesktop: ["o-shopee"],
      orderMobile: ["o-shopee"],
      maxBrands: 16,
    });

    renderPanel();

    expect(
      await screen.findByTestId("top-brand-preview-desktop-page-0-slot-0"),
    ).toHaveTextContent("Shopee");
    expect(
      screen.getByTestId("top-brand-preview-mobile-grid-slot-0"),
    ).toHaveTextContent("Shopee");
  });

  it("given dual-device lists with one brand > then preview shows the brand on both devices", async () => {
    apiClientMock.getTopBrands.mockResolvedValue({
      brands: [{ offerId: "o-shopee", cashback: "" }],
      brandsDesktop: [{ offerId: "o-shopee", cashback: "" }],
      brandsMobile: [{ offerId: "o-shopee", cashback: "" }],
      items: [shopeeOffer],
      order: ["o-shopee"],
      orderDesktop: ["o-shopee"],
      orderMobile: ["o-shopee"],
      maxBrands: 16,
    });

    renderPanel();

    expect(await screen.findAllByText("Shopee")).toHaveLength(2);
  });

  it("#479 excludes disabled offers from preview and save payload", async () => {
    const user = userEvent.setup();
    const disabledShopee = { ...shopeeOffer, disabled: true };
    apiClientMock.getTopBrands.mockResolvedValue({
      brands: [
        { offerId: "o1", cashback: "" },
        { offerId: "o-shopee", cashback: "" },
      ],
      brandsDesktop: [
        { offerId: "o1", cashback: "" },
        { offerId: "o-shopee", cashback: "" },
      ],
      brandsMobile: [
        { offerId: "o1", cashback: "" },
        { offerId: "o-shopee", cashback: "" },
      ],
      items: [offer, disabledShopee],
      order: ["o1", "o-shopee"],
      orderDesktop: ["o1", "o-shopee"],
      orderMobile: ["o1", "o-shopee"],
      maxBrands: 16,
    });
    fetchOffersListMock.mockResolvedValue({
      data: [offer, disabledShopee],
      limit: 80,
      page: 1,
      total: 2,
      totalPages: 1,
    });

    renderPanel();

    expect(
      await screen.findByTestId("top-brand-landing-preview"),
    ).toHaveTextContent("Banana IT");
    expect(
      screen.getByTestId("top-brand-landing-preview"),
    ).not.toHaveTextContent("Shopee");
    expect(
      screen.getByText(/Disabled offers are excluded from Top brands/i),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save top brands" }));
    await waitFor(() => {
      expect(apiClientMock.saveTopBrands).toHaveBeenCalledWith({
        brandsDesktop: [{ offerId: "o1", cashback: expect.any(String) }],
        brandsMobile: [{ offerId: "o1", cashback: expect.any(String) }],
      });
    });
  });

  it("given typed search text > when fetch returns Shopee > then requests include the search term", async () => {
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
      expect(fetchOffersListMock).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Shopee" }),
      );
    });
  });

  it("given matching offers already listed > then shows already-in-list helper text", async () => {
    const user = userEvent.setup();
    apiClientMock.getTopBrands.mockResolvedValue({
      brands: [{ offerId: "o-shopee", cashback: "5.6%" }],
      items: [shopeeOffer],
      order: ["o-shopee"],
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

    expect(
      await screen.findByText(/already in the homepage list below/i),
    ).toBeInTheDocument();
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
    await screen.findByTestId("top-brand-landing-preview");

    await user.type(
      screen.getByRole("textbox", { name: "Search offers to add" }),
      "Banana",
    );

    await waitFor(() => {
      expect(fetchOffersListMock).toHaveBeenCalled();
    });

    expect(
      await screen.findByRole("option", { name: /Banana IT/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /o2/i })).toBeInTheDocument();
  });

  it("#561 landing preview > given 5 brands > then mirrors vertical pairs on desktop and mobile", async () => {
    const five = Array.from({ length: 5 }, (_, index) => ({
      ...offer,
      _id: `o${index + 1}`,
      offer_id: 1001 + index,
      offer_name: `Brand ${index + 1} TH - CPS`,
      offer_name_display: `Brand ${index + 1}`,
    }));
    const brands = five.map((o) => ({ offerId: o._id, cashback: "1%" }));
    const order = five.map((o) => o._id);
    apiClientMock.getTopBrands.mockResolvedValue({
      brands,
      brandsDesktop: brands,
      brandsMobile: brands,
      items: five,
      order,
      orderDesktop: order,
      orderMobile: order,
      maxBrands: 16,
    });

    renderPanel();
    const preview = await screen.findByTestId("top-brand-landing-preview");
    expect(preview).toHaveTextContent("Landing preview");

    const desktopTop = within(
      screen.getByTestId("top-brand-preview-desktop-page-0-row-0"),
    );
    const desktopBottom = within(
      screen.getByTestId("top-brand-preview-desktop-page-0-row-1"),
    );
    expect(desktopTop.getByText("Brand 1")).toBeInTheDocument();
    expect(desktopTop.getByText("Brand 3")).toBeInTheDocument();
    expect(desktopTop.getByText("Brand 5")).toBeInTheDocument();
    expect(desktopBottom.getByText("Brand 2")).toBeInTheDocument();
    expect(desktopBottom.getByText("Brand 4")).toBeInTheDocument();

    // The mobile rail stacks consecutive pairs vertically: Brand 2 sits
    // BELOW Brand 1 (column 0, row 1), and Brand 5 opens column 2 —
    // the per-device divergence #378 asks admins to be able to see.
    expect(
      screen.getByTestId("top-brand-preview-mobile-col-0-row-1"),
    ).toHaveTextContent("Brand 2");
    expect(
      screen.getByTestId("top-brand-preview-mobile-col-2-row-0"),
    ).toHaveTextContent("Brand 5");
  });

  it.each([10, 12])(
    "#561 landing preview > given %i brands > then desktop top row is odd positions and bottom row is even positions",
    async (count) => {
      const offers = Array.from({ length: count }, (_, index) => ({
        ...offer,
        _id: `o${index + 1}`,
        offer_id: 1001 + index,
        offer_name: `Brand ${index + 1} TH - CPS`,
        offer_name_display: `Brand ${index + 1}`,
      }));
      const brands = offers.map((row) => ({
        offerId: row._id,
        cashback: "1%",
      }));
      const order = offers.map((row) => row._id);
      apiClientMock.getTopBrands.mockResolvedValue({
        brands,
        brandsDesktop: brands,
        brandsMobile: brands,
        items: offers,
        order,
        orderDesktop: order,
        orderMobile: order,
        maxBrands: 16,
      });

      renderPanel();
      await screen.findByTestId("top-brand-landing-preview");

      const topRow = within(
        screen.getByTestId("top-brand-preview-desktop-page-0-row-0"),
      );
      const bottomRow = within(
        screen.getByTestId("top-brand-preview-desktop-page-0-row-1"),
      );
      for (let position = 1; position <= count; position += 1) {
        const expectedRow = position % 2 === 1 ? topRow : bottomRow;
        const otherRow = position % 2 === 1 ? bottomRow : topRow;
        expect(expectedRow.getByText(`Brand ${position}`)).toBeInTheDocument();
        expect(otherRow.queryByText(`Brand ${position}`)).toBeNull();
      }
    },
  );

  it("#378 landing preview > given 4 or fewer brands > then shows the mobile static-grid mode", async () => {
    renderPanel();

    const preview = await screen.findByTestId("top-brand-landing-preview");
    expect(preview).toHaveTextContent("static 2-column grid");
  });

  it("#378 Phase 2 > given divergent device orders on load > then preview and save keep them independent", async () => {
    const user = userEvent.setup();
    apiClientMock.getTopBrands.mockResolvedValue({
      brands: [
        { offerId: "o1", cashback: "7%" },
        { offerId: "o-shopee", cashback: "5.6%" },
      ],
      brandsDesktop: [
        { offerId: "o1", cashback: "7%" },
        { offerId: "o-shopee", cashback: "5.6%" },
      ],
      brandsMobile: [
        { offerId: "o-shopee", cashback: "5.6%" },
        { offerId: "o1", cashback: "7%" },
      ],
      items: [offer, shopeeOffer],
      order: ["o1", "o-shopee"],
      orderDesktop: ["o1", "o-shopee"],
      orderMobile: ["o-shopee", "o1"],
      maxBrands: 16,
    });

    renderPanel();

    expect(
      await screen.findByRole("heading", { name: "Landing preview" }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("top-brand-preview-desktop-page-0-slot-0"),
    ).toHaveTextContent("Banana IT");
    expect(
      screen.getByTestId("top-brand-preview-mobile-grid-slot-0"),
    ).toHaveTextContent("Shopee");

    // Remove from preview (both device lists); then save.
    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    await user.click(screen.getByRole("button", { name: "Save top brands" }));

    await waitFor(() => {
      expect(apiClientMock.saveTopBrands).toHaveBeenCalledWith({
        brandsDesktop: [{ offerId: "o-shopee", cashback: "5.6%" }],
        brandsMobile: [{ offerId: "o-shopee", cashback: "5.6%" }],
      });
    });
  });
});
