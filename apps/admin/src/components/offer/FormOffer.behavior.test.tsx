// @vitest-environment happy-dom
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
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
  RemoteOrBlobImage: (props: { alt: string; src: string }) => (
    <span data-image-src={props.src}>{props.alt}</span>
  ),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function offer(id = "offer-1", categories = "Shopping"): Offer {
  return {
    _id: id,
    offer_id: 1,
    __v: 0,
    categories,
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

function form(id = "offer-1", commissionStore = 7): OfferRequestForm {
  return {
    logo_desktop: null,
    logo_mobile: null,
    banner: null,
    logo_circle: null,
    offer_name_display: `Offer ${id}`,
    lookup_value: id,
    disabled: false,
    max_cap: null,
    commission_store: commissionStore,
    commission_entry_mode: "auto",
    id,
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
    product_types: [],
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
  };
}

function Harness({
  loadedForm,
  loadedOffer,
}: {
  loadedForm: OfferRequestForm;
  loadedOffer: Offer;
}) {
  const [currentForm, setCurrentForm] = useState(loadedForm);
  const [loadedFormId, setLoadedFormId] = useState(loadedForm.id);
  if (loadedFormId !== loadedForm.id) {
    setLoadedFormId(loadedForm.id);
    setCurrentForm(loadedForm);
  }

  return (
    <>
      <output data-testid="custom-terms">{currentForm.custom_terms}</output>
      <output data-testid="commission-store">
        {String(currentForm.commission_store)}
      </output>
      <FormOffer
        fetchOffers={mocks.fetchOffers}
        openModal={loadedOffer}
        setOpenModal={vi.fn()}
        form={currentForm}
        setForm={setCurrentForm}
        isLoading={false}
        setIsLoading={vi.fn()}
      />
    </>
  );
}

function root(
  queryClient: QueryClient,
  loadedForm: OfferRequestForm,
  loadedOffer: Offer,
) {
  return (
    <QueryClientProvider client={queryClient}>
      <Harness loadedForm={loadedForm} loadedOffer={loadedOffer} />
    </QueryClientProvider>
  );
}

function section(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Expected #${id} to render`);
  return element;
}

function policyTextarea(): HTMLTextAreaElement {
  const textarea = section("offer-section-policy").querySelector("textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error("Expected the template policy textarea to render");
  }
  return textarea;
}

function rawCommissionInput(): HTMLInputElement {
  const input = section("offer-section-cashback").querySelector(
    'input[name="commission_raw"]',
  );
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("Expected the raw commission input to render");
  }
  return input;
}

describe("FormOffer behavior", () => {
  beforeEach(() => {
    mocks.fetcher.mockReset().mockResolvedValue({});
    mocks.get.mockReset().mockResolvedValue({ data: { data: [] } });
    mocks.patch.mockReset().mockResolvedValue({ data: {} });
    mocks.post.mockReset().mockResolvedValue({ data: {} });
    mocks.fetchOffers.mockReset();
    mocks.fee.feePercent = 30;
    mocks.fee.isFallback = true;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("derives configured terms from the raw policy-list cache shared with Policy Management", async () => {
    mocks.fetcher.mockImplementation((path: string) => {
      if (path === "/offer/get-category/list") {
        return Promise.resolve([
          {
            _id: "shopping",
            name: "Shopping",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
        ]);
      }
      return Promise.resolve([]);
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(["policyList"], [
      {
        category_id: "shopping",
        terms: {
          primary_locale: "en",
          translations: { en: "Terms cached by Policy Management" },
        },
      },
    ]);
    const user = userEvent.setup();

    render(root(queryClient, form(), offer()));
    await user.click(
      within(section("offer-section-policy")).getByRole("button", {
        name: "Edit",
      }),
    );

    await waitFor(() => {
      expect(policyTextarea()).toHaveValue(
        "Terms cached by Policy Management",
      );
    });
  });

  it("derives delayed template terms, preserves an edit across refresh, and saves exact FormData plus local state", async () => {
    const firstPolicy = deferred<unknown>();
    const refreshedPolicy = deferred<unknown>();
    let policyRequest = 0;
    mocks.fetcher.mockImplementation((path: string) => {
      if (path === "/offer/get-category/list") {
        return Promise.resolve([
          {
            _id: "shopping",
            name: "Shopping",
            createdAt: "2026-01-01",
            updatedAt: "2026-01-01",
          },
        ]);
      }
      if (path === "/policy/category-list") {
        policyRequest += 1;
        return policyRequest === 1
          ? firstPolicy.promise
          : refreshedPolicy.promise;
      }
      return Promise.resolve({});
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const loadedForm = form();
    const loadedOffer = offer();
    const user = userEvent.setup();

    render(root(queryClient, loadedForm, loadedOffer));
    await user.click(
      within(section("offer-section-policy")).getByRole("button", {
        name: "Edit",
      }),
    );

    await act(async () => {
      firstPolicy.resolve([
        {
          category_id: "shopping",
          terms: {
            primary_locale: "en",
            translations: { en: "Configured policy v1" },
          },
        },
      ]);
      await firstPolicy.promise;
    });

    await waitFor(() => {
      expect(policyTextarea()).toHaveValue("Configured policy v1");
    });
    expect(screen.getByTestId("custom-terms")).toHaveTextContent("");

    await user.clear(policyTextarea());
    await user.type(policyTextarea(), "Admin-authored policy");

    const refreshPromise = queryClient.invalidateQueries({
      queryKey: ["policyList"],
    });
    await act(async () => {
      refreshedPolicy.resolve([
        {
          category_id: "shopping",
          terms: {
            primary_locale: "en",
            translations: { en: "Configured policy v2" },
          },
        },
      ]);
      await refreshedPolicy.promise;
      await refreshPromise;
    });

    expect(policyTextarea()).toHaveValue("Admin-authored policy");
    await user.click(
      within(section("offer-section-policy")).getByRole("button", {
        name: "Save changes",
      }),
    );

    await waitFor(() => {
      expect(mocks.patch).toHaveBeenCalledWith(
        "/admin/update-offer/offer-1",
        expect.any(FormData),
        expect.objectContaining({
          headers: { "Content-Type": "multipart/form-data" },
        }),
      );
    });
    const submitted = mocks.patch.mock.calls[0]?.[1] as FormData;
    expect(submitted.get("policy_category_id")).toBe("");
    expect(submitted.get("custom_terms")).toBe("Admin-authored policy");
    expect(submitted.get("note_to_user")).toBe("");
    expect(screen.getByTestId("custom-terms")).toHaveTextContent(
      "Admin-authored policy",
    );
    expect(mocks.fetchOffers).toHaveBeenCalledTimes(1);
  });

  it("surfaces the media API error inline and preserves the saved banner after a failed replacement", async () => {
    mocks.fetcher.mockResolvedValue([]);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const loadedOffer = {
      ...offer(),
      banner: "https://media.example/brand-banners/existing.webp",
      banner_mobile: "https://media.example/brand-banners/existing.webp",
    };
    const user = userEvent.setup();
    mocks.patch.mockRejectedValueOnce({
      response: {
        data: {
          message: "Media storage is unavailable for brand-banners.",
        },
      },
    });

    render(root(queryClient, form(), loadedOffer));
    const mediaSection = section("offer-section-media");
    await user.click(
      within(mediaSection).getByRole("button", { name: "Edit" }),
    );

    expect(mediaSection).toHaveTextContent(
      "Requested size: 1,200 × 410 px (W × H).",
    );
    const bannerInput = mediaSection.querySelector('input[name="banner"]');
    if (!(bannerInput instanceof HTMLInputElement)) {
      throw new Error("Expected the banner upload input to render");
    }
    const replacement = new File(["new-banner"], "replacement.webp", {
      type: "image/webp",
    });
    fireEvent.change(bannerInput, { target: { files: [replacement] } });
    await user.click(
      within(mediaSection).getByRole("button", { name: "Save" }),
    );

    const expectedError = "Media storage is unavailable for brand-banners.";
    await waitFor(() => {
      expect(within(mediaSection).getByRole("alert")).toHaveTextContent(
        expectedError,
      );
    });
    expect(toast.error).toHaveBeenCalledWith(expectedError);
    expect(mocks.fetchOffers).not.toHaveBeenCalled();
    expect(loadedOffer.banner).toBe(
      "https://media.example/brand-banners/existing.webp",
    );
    const submitted = mocks.patch.mock.calls[0]?.[1] as FormData;
    expect(submitted.get("banner")).toBe(replacement);
    expect(mocks.patch).toHaveBeenCalledWith(
      "/admin/update-offer/offer-1",
      submitted,
      {
        timeout: 120_000,
        headers: {},
      },
    );

    await user.click(
      within(mediaSection).getByRole("button", { name: "Cancel" }),
    );
    expect(within(mediaSection).queryByRole("alert")).not.toBeInTheDocument();
    expect(
      mediaSection.querySelector(
        '[data-image-src="https://media.example/brand-banners/existing.webp"]',
      ),
    ).not.toBeNull();
  });

  it("reconciles fallback/configured fees and clears authored-raw ownership when the offer id changes", async () => {
    mocks.fetcher.mockImplementation((path: string) =>
      Promise.resolve(path === "/offer/get-category/list" ? [] : {}),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const firstForm = form("offer-1", 7);
    const firstOffer = offer("offer-1");
    const view = render(root(queryClient, firstForm, firstOffer));
    const user = userEvent.setup();

    await user.click(
      within(section("offer-section-cashback")).getByRole("button", {
        name: "Edit",
      }),
    );
    expect(rawCommissionInput()).toHaveValue("10");

    mocks.fee.feePercent = 20;
    mocks.fee.isFallback = false;
    view.rerender(root(queryClient, firstForm, firstOffer));
    await waitFor(() => {
      expect(rawCommissionInput()).toHaveValue("8.75");
    });
    expect(screen.getByTestId("commission-store")).toHaveTextContent("7");

    fireEvent.change(rawCommissionInput(), { target: { value: "12" } });
    await waitFor(() => {
      expect(screen.getByTestId("commission-store")).toHaveTextContent("9.6");
    });

    mocks.fee.feePercent = 10;
    view.rerender(root(queryClient, firstForm, firstOffer));
    await waitFor(() => {
      expect(rawCommissionInput()).toHaveValue("12");
      expect(screen.getByTestId("commission-store")).toHaveTextContent("10.8");
    });

    const secondForm = form("offer-2", 8);
    const secondOffer = offer("offer-2");
    view.rerender(root(queryClient, secondForm, secondOffer));
    await waitFor(() => {
      expect(rawCommissionInput()).toHaveValue("8.89");
      expect(screen.getByTestId("commission-store")).toHaveTextContent("8");
    });

    mocks.fee.feePercent = 20;
    view.rerender(root(queryClient, secondForm, secondOffer));
    await waitFor(() => {
      expect(rawCommissionInput()).toHaveValue("10");
      expect(screen.getByTestId("commission-store")).toHaveTextContent("8");
    });
  });
});
