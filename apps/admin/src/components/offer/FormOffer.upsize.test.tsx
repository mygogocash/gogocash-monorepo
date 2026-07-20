// @vitest-environment happy-dom
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Offer, OfferRequestForm } from "@/types/api";
import FormOffer from "./FormOffer";

const mocks = vi.hoisted(() => ({
  fetcher: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  fetchOffers: vi.fn(),
  fee: { feePercent: 30, isFallback: true },
}));

vi.mock("@/lib/axios/client", () => ({
  default: {
    get: mocks.get,
    patch: mocks.patch,
    post: mocks.post,
  },
  fetcher: mocks.fetcher,
}));

vi.mock("@/hooks/useSystemFeePercent", () => ({
  useSystemFeePercent: () => ({ ...mocks.fee }),
}));

vi.mock("@/hooks/useObjectUrl", () => ({
  useObjectUrl: () => null,
}));

vi.mock("@/components/common/RemoteOrBlobImage", () => ({
  RemoteOrBlobImage: (props: { alt: string }) => <span>{props.alt}</span>,
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

function offer(id = "offer-1"): Offer {
  return {
    _id: id,
    offer_id: 1,
    __v: 0,
    categories: "Shopping",
    commission_tracking: "",
    commissions: [],
    countries: "Thailand",
    currency: "THB",
    datetime_created: new Date("2026-01-01"),
    datetime_updated: new Date("2026-01-01"),
    description: "",
    directory_page: "",
    is_require_approval: 0,
    logo: "",
    lookup_value: id,
    marketplace_store_offer: false,
    merchant_id: 1,
    offer_name: `Offer ${id}`,
    payment_terms: 0,
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
    offer_name_display: `Offer ${id}`,
    commission_store: 7,
    max_cap: null,
    banner_mobile: "",
    extra_store: false,
  };
}

function baseForm(overrides: Partial<OfferRequestForm> = {}): OfferRequestForm {
  return {
    logo_desktop: null,
    logo_mobile: null,
    banner: null,
    logo_circle: null,
    offer_name_display: "Offer offer-1",
    lookup_value: "offer-1",
    disabled: false,
    max_cap: null,
    commission_store: 7,
    commission_entry_mode: "auto",
    id: "offer-1",
    banner_mobile: null,
    extra_store: false,
    upsize_start_date: null,
    upsize_end_date: null,
    upsize_start_time: null,
    upsize_end_time: null,
    upsize_special_commission: null,
    upsize_max_cap: null,
    upsize_all_product_types: true,
    upsize_product_types: [],
    product_types: [
      {
        name: "Phones",
        pay_in: "cashback",
        commission_info: "2.8",
        description: "Base phone line",
      },
    ],
    // Keep true so FormOffer's render-time commission sync does not loop.
    all_product_types: true,
    admin_commission_info: [],
    policy_category_id: "",
    custom_terms: "",
    note_to_user: "",
    affiliate_network_id: "involve_asia",
    deeplink_store_id: "",
    offer_display_tags: {
      brand_category_enabled: false,
      brand_category_label: "",
      extra_cashback_tag: false,
      grab_coupon_tag: false,
      expire_in_days_enabled: false,
      expire_in_days: null,
    },
    tracking_period_mode: "auto",
    tracking_days: null,
    confirm_days: null,
    flow_type: "three_step",
    tracking_subtitle: null,
    confirm_subtitle: null,
    ...overrides,
  };
}

function Harness({ loadedForm }: { loadedForm: OfferRequestForm }) {
  const [currentForm, setCurrentForm] = useState(loadedForm);
  return (
    <FormOffer
      fetchOffers={mocks.fetchOffers}
      openModal={offer()}
      setOpenModal={vi.fn()}
      form={currentForm}
      setForm={setCurrentForm}
      isLoading={false}
      setIsLoading={vi.fn()}
    />
  );
}

describe("FormOffer upsize (#467 #468)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.fetcher.mockResolvedValue([]);
    mocks.patch.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("#468 > given saved upsize lines > then read-only hides setup and shows added table", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <Harness
          loadedForm={baseForm({
            upsize_all_product_types: false,
            upsize_start_date: "2026-07-01",
            upsize_end_date: "2026-07-31",
            upsize_product_types: [
              {
                name: "OPPO Find X9",
                pay_in: "cashback",
                commission_info: "3.5",
              },
            ],
          })}
        />
      </QueryClientProvider>,
    );

    const section = document.getElementById("offer-section-upsize");
    expect(section).toBeTruthy();
    expect(
      within(section!).queryByRole("button", { name: "Launch Upsize Event" }),
    ).toBeNull();
    expect(within(section!).queryByText("Upsize period")).toBeNull();
    expect(within(section!).getByText("Added upsize lines")).toBeTruthy();
    expect(within(section!).getByText("OPPO Find X9")).toBeTruthy();
  });

  it("#467 > given edit + per-product draft > then description switch is off and hides input", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <Harness
          loadedForm={baseForm({
            upsize_all_product_types: false,
            upsize_product_types: [],
          })}
        />
      </QueryClientProvider>,
    );

    const section = document.getElementById("offer-section-upsize")!;
    await user.click(within(section).getByRole("button", { name: "Edit" }));
    await user.click(
      within(section).getByRole("button", { name: "Launch Upsize Event" }),
    );
    // Turn off all-product types to reveal the per-line draft form.
    const allTypesSwitch = within(section).getAllByRole("switch")[0];
    await user.click(allTypesSwitch);

    expect(within(section).getByText("Product description")).toBeTruthy();
    const rewriteSwitch = within(section).getByRole("switch", {
      name: "Rewrite product description",
    });
    expect(rewriteSwitch).toHaveAttribute("aria-checked", "false");
    expect(
      within(section).queryByPlaceholderText(
        "Re-write the description for this promo",
      ),
    ).toBeNull();

    await user.click(rewriteSwitch);
    expect(rewriteSwitch).toHaveAttribute("aria-checked", "true");
    expect(
      within(section).getByPlaceholderText(
        "Re-write the description for this promo",
      ),
    ).toBeTruthy();
  });

  it("#468 > given Edit on saved upsize > then setup controls return", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <Harness
          loadedForm={baseForm({
            upsize_all_product_types: false,
            upsize_start_date: "2026-07-01",
            upsize_product_types: [
              {
                name: "OPPO Find X9",
                pay_in: "cashback",
                commission_info: "3.5",
              },
            ],
          })}
        />
      </QueryClientProvider>,
    );

    const section = document.getElementById("offer-section-upsize")!;
    await user.click(within(section).getByRole("button", { name: "Edit" }));
    expect(
      within(section).getByRole("button", { name: "Launch Upsize Event" }),
    ).toBeTruthy();
    expect(within(section).getByText("Upsize period")).toBeTruthy();
  });
});
