import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// CustomerMissingOrdersScreen -> AccountPageShell -> CustomerDesktopHeader ->
// CustomerLocaleRegionControl -> i18n/LocaleProvider pulls in expo-localization
// (-> expo-modules-core), which reaches for the native `expo` global that does
// not exist under happy-dom (`__DEV__ is not defined`). Device locale is not the
// behavior under test, so mock the module at the seam — the same pattern the
// customer-auth render test uses.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

vi.mock("@mobile/api/sharedClient", () => ({
  getSharedMobileApiClient: vi.fn(),
}));

import { CustomerMissingOrdersScreen } from "@mobile/screens/CustomerMissingOrdersScreen";
import { ApiError } from "@mobile/api/client";
import { getSharedMobileApiClient } from "@mobile/api/sharedClient";

// Wave B (cluster B2) per-screen UX adoption for the missing-order CLAIM form. This is
// the RENDER suite: it MOUNTS the screen (react-native -> react-native-web, happy-dom)
// to prove the long multi-field form still renders after wrapping, AND reads the screen
// source to assert a behavior/source signal for each applied Wave A foundation
// (KeyboardAwareScreen — the keyboard-occlusion fix that matters most on this long form;
// haptics on submit success + validation failure; hitSlop on the small icon-only
// buttons). Skeleton/RefreshControl are intentionally NOT adopted here — this is a form,
// not a data list.
const missingOrdersSource = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../screens/CustomerMissingOrdersScreen.tsx",
  ),
  "utf8",
);

function renderMissingOrders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(CustomerMissingOrdersScreen),
    ),
  );
}

function backendClient({
  catalog = {
    data: [
      {
        _id: "live-offer-1",
        offer_name_display: "Live Merchant",
        source: "involve",
      },
    ],
    limit: 20,
    page: 1,
    total: 1,
    totalPages: 1,
  },
  catalogError,
  catalogPending = false,
  claims = { data: [], limit: 10, page: 1, total: 0, totalPages: 0 },
  claimsError,
  claimsPending = false,
}: {
  catalog?: unknown;
  catalogError?: Error;
  catalogPending?: boolean;
  claims?: unknown;
  claimsError?: Error;
  claimsPending?: boolean;
} = {}) {
  const get = vi.fn((path: string) => {
    if (path.startsWith("/offer?")) {
      if (catalogPending) return new Promise(() => undefined);
      if (catalogError) return Promise.reject(catalogError);
      return Promise.resolve(catalog);
    }
    return Promise.resolve({ id: "live-user-1" });
  });
  const post = vi.fn(() => {
    if (claimsPending) return new Promise(() => undefined);
    if (claimsError) return Promise.reject(claimsError);
    return Promise.resolve(claims);
  });
  const client = { get, post, postFormData: vi.fn() };
  vi.mocked(getSharedMobileApiClient).mockResolvedValue(client as never);
  return client;
}

beforeEach(() => {
  vi.mocked(getSharedMobileApiClient).mockReset();
  backendClient();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CustomerMissingOrdersScreen (render)", () => {
  it("mounts the claim form without throwing", () => {
    expect(() => renderMissingOrders()).not.toThrow();
    // The page title appears as the top-bar label + the form panel heading.
    expect(screen.getAllByText("Missing Orders").length).toBeGreaterThan(0);
  });

  it("renders the submit action so the keyboard-avoidance wrapper has a real CTA", () => {
    renderMissingOrders();
    expect(screen.getAllByText("Submit claim").length).toBeGreaterThan(0);
  });

  it("FAQ accordion (web parity): first answer open; tapping another question reveals its answer", () => {
    renderMissingOrders();
    // The first FAQ is expanded by default → its answer is visible.
    expect(screen.getByText(/GoGoCash is a cashback platform/)).toBeTruthy();
    // The second FAQ's answer stays hidden until its question is tapped.
    expect(screen.queryByText(/Shop via GoGoCash tracked links/)).toBeNull();
    fireEvent.click(screen.getByText("How to claim cashback?"));
    expect(screen.getByText(/Shop via GoGoCash tracked links/)).toBeTruthy();
  });

  it("store field is a dropdown select (web parity): opening it and picking a shop fills the field", () => {
    renderMissingOrders();
    // The store field shows its label as the placeholder while empty.
    // The field is `required`, so MissingOrdersSelectField renders the label as
    // "Store or marketplace *". Match the label without pinning the asterisk.
    fireEvent.click(screen.getByText(/^Store or marketplace/));
    // Pick a shop from the dropdown menu.
    fireEvent.click(screen.getByRole("button", { name: "Lazada" }));
    // The chosen shop now shows in the field.
    expect(screen.getByText("Lazada")).toBeTruthy();
  });

  it("order id is a real editable text input (web parity), not a static value row", () => {
    renderMissingOrders();
    const input = screen.getByPlaceholderText("Order ID *");
    fireEvent.change(input, { target: { value: "GC-2026-0001" } });
    expect(screen.getByDisplayValue("GC-2026-0001")).toBeTruthy();
  });

  it("user id is masked with an eye toggle that reveals it (web parity)", () => {
    renderMissingOrders();
    // Masked by default; the real id is hidden.
    expect(screen.getByText("******")).toBeTruthy();
    expect(screen.queryByText("mock-user-001")).toBeNull();
    // Tap the eye to reveal the user id.
    fireEvent.click(screen.getByLabelText("Show user ID"));
    expect(screen.getByText("mock-user-001")).toBeTruthy();
  });

  it("submitting with no screenshot shows the required-attachment validation error", () => {
    renderMissingOrders();
    // No image added yet → submit surfaces the inline validation alert (web parity: required).
    fireEvent.click(screen.getAllByText("Submit claim")[0]);
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("backend mode allows metadata-only claims and hides the insecure evidence picker", () => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    try {
      renderMissingOrders();
      expect(
        screen.getByText(
          "Secure evidence uploads are temporarily unavailable. Submit this claim without attachments.",
        ),
      ).toBeTruthy();
      expect(screen.queryByLabelText("Add images")).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("backend mode shows explicit catalog and claim loading states without fixture merchants", async () => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    backendClient({ catalogPending: true, claimsPending: true });

    renderMissingOrders();

    expect(await screen.findByText("Loading merchant catalog")).toBeTruthy();
    expect(await screen.findByText("Loading missing conversions")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Lazada" })).toBeNull();
  });

  it("backend catalog error exposes exact detail and retries instead of falling back to fixtures", async () => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    const client = backendClient({
      catalogError: new ApiError("Catalog unavailable", 503),
    });

    renderMissingOrders();

    expect(await screen.findByText("Catalog unavailable")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Lazada" })).toBeNull();
    const callsBeforeRetry = client.get.mock.calls.filter(([path]) =>
      String(path).startsWith("/offer?"),
    ).length;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => {
      const callsAfterRetry = client.get.mock.calls.filter(([path]) =>
        String(path).startsWith("/offer?"),
      ).length;
      expect(callsAfterRetry).toBeGreaterThan(callsBeforeRetry);
    });
  });

  it("backend true-empty catalog and claim history stay empty without fixture rows", async () => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    backendClient({
      catalog: { data: [], limit: 20, page: 1, total: 0, totalPages: 0 },
      claims: { data: [], limit: 10, page: 1, total: 0, totalPages: 0 },
    });

    renderMissingOrders();

    expect(await screen.findByText("No merchants available")).toBeTruthy();
    expect(await screen.findByText("No missing conversions yet")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Lazada" })).toBeNull();
  });

  it("renders the real customer claim list with every canonical workflow status", async () => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    backendClient({
      claims: {
        data: [
          {
            id: "c1",
            merchantName: "One",
            orderId: "ORDER-PENDING",
            orderAmount: 1,
            currency: "THB",
            purchaseDate: "2026-07-01T00:00:00.000Z",
            remarks: "",
            status: "pending",
            submittedDate: "2026-07-01T01:00:00.000Z",
            resolvedAt: null,
          },
          {
            id: "c2",
            merchantName: "Two",
            orderId: "ORDER-REVIEW",
            orderAmount: 2,
            currency: "THB",
            purchaseDate: "2026-07-01T00:00:00.000Z",
            remarks: "",
            status: "under_review",
            submittedDate: "2026-07-01T01:00:00.000Z",
            resolvedAt: null,
          },
          {
            id: "c3",
            merchantName: "Three",
            orderId: "ORDER-APPROVED",
            orderAmount: 3,
            currency: "THB",
            purchaseDate: "2026-07-01T00:00:00.000Z",
            remarks: "",
            status: "approved",
            submittedDate: "2026-07-01T01:00:00.000Z",
            resolvedAt: "2026-07-02T01:00:00.000Z",
          },
          {
            id: "c4",
            merchantName: "Four",
            orderId: "ORDER-REJECTED",
            orderAmount: 4,
            currency: "THB",
            purchaseDate: "2026-07-01T00:00:00.000Z",
            remarks: "",
            status: "rejected",
            submittedDate: "2026-07-01T01:00:00.000Z",
            resolvedAt: "2026-07-02T01:00:00.000Z",
          },
        ],
        limit: 10,
        page: 1,
        total: 4,
        totalPages: 1,
      },
    });

    renderMissingOrders();

    for (const orderId of [
      "ORDER-PENDING",
      "ORDER-REVIEW",
      "ORDER-APPROVED",
      "ORDER-REJECTED",
    ]) {
      expect(await screen.findByText(orderId)).toBeTruthy();
    }
    for (const status of ["Pending", "Under review", "Approved", "Rejected"]) {
      expect(screen.getByText(status)).toBeTruthy();
    }
  });

  it("renders exact claim-list errors with retry and uses field validation copy unrelated to attachments", async () => {
    vi.stubEnv("EXPO_PUBLIC_ACCOUNT_DATA_SOURCE", "backend");
    const client = backendClient({
      claimsError: new ApiError("Claim history unavailable", 503),
    });

    renderMissingOrders();

    expect(
      await screen.findByText("HTTP 503: Claim history unavailable"),
    ).toBeTruthy();
    const callsBeforeRetry = client.post.mock.calls.length;
    fireEvent.click(
      screen.getByRole("button", { name: "Retry claim history" }),
    );
    await waitFor(() =>
      expect(client.post.mock.calls.length).toBeGreaterThan(callsBeforeRetry),
    );

    fireEvent.click(screen.getAllByText("Submit claim")[0]);
    expect(
      screen.getByText(
        "User ID, Brand, Order ID, Amount, and Purchase date are required.",
      ),
    ).toBeTruthy();
  });
});

describe("CustomerMissingOrdersScreen — Wave B foundations adopted (source signals)", () => {
  it("wraps the long form in KeyboardAwareScreen so the keyboard never covers the focused field", () => {
    expect(missingOrdersSource).toContain(
      'from "@mobile/components/KeyboardAwareScreen"',
    );
    expect(missingOrdersSource).toContain("<KeyboardAwareScreen");
  });

  it("imports haptics and fires success on a submitted claim + error on a failed validation", () => {
    expect(missingOrdersSource).toContain('from "@mobile/lib/haptics"');
    expect(missingOrdersSource).toContain("haptics.success(");
    expect(missingOrdersSource).toContain("haptics.error(");
  });

  it("surfaces the exact canonical API failure instead of replacing it with attachment copy", () => {
    expect(missingOrdersSource).toContain("formatMissingOrderApiError");
    expect(missingOrdersSource).toContain("catch (error)");
    expect(missingOrdersSource).toContain(
      "setSubmitError(formatMissingOrderApiError(error))",
    );
  });

  it("gives the icon-only buttons (<44px) a hitSlop so the tap target reaches 44px", () => {
    // The back-nav chevron and the attachment add-image trigger are icon-only and
    // shorter than 44px; hitSlop expands their tappable area.
    const hitSlopCount = (missingOrdersSource.match(/hitSlop=\{/g) ?? [])
      .length;
    expect(hitSlopCount).toBeGreaterThanOrEqual(2);
  });

  it("uses MUI-style outlined inputs (web parity): text inputs + store dropdown + date field, no icon chips", () => {
    expect(missingOrdersSource).toContain("MissingOrdersTextField");
    expect(missingOrdersSource).toContain("MissingOrdersSelectField");
    expect(missingOrdersSource).toContain("MissingOrdersDateField");
    expect(missingOrdersSource).toContain("MissingOrdersUserIdField");
    expect(missingOrdersSource).toContain("BirthDateField");
    expect(missingOrdersSource).toContain("MISSING_ORDERS_SHOPS");
    expect(missingOrdersSource).toContain("floatLabel");
    // The old icon-chip display rows are gone.
    expect(missingOrdersSource).not.toContain("renderFieldIcon");
    expect(missingOrdersSource).not.toContain("fieldIcon:");
  });

  it("store dropdown anchors under the field, Add images opens a real picker, submit shows the success modal", () => {
    // Store dropdown is anchored to the field's measured rect (web parity: <Select> opens below).
    expect(missingOrdersSource).toContain("measureInWindow");
    expect(missingOrdersSource).toContain("dropdownAnchoredMenu");
    // Add images opens a real multi-file image picker (web: <input type=file accept image multiple>).
    expect(missingOrdersSource).toContain("pickMissingOrderImages");
    expect(missingOrdersSource).toContain('input.type = "file"');
    expect(missingOrdersSource).toContain("input.multiple = true");
    // Submit shows the "Order Tracking Submitted!" success modal with Go to Wallet / Shop More!.
    expect(missingOrdersSource).toContain("setSubmittedOpen");
    expect(missingOrdersSource).toContain("Order Tracking Submitted!");
    expect(missingOrdersSource).toContain('href="/wallet"');
    expect(missingOrdersSource).toContain('href="/brand"');
  });

  it("aligns to the web design: footer LINE+submit, green pill submit, gradient quick cards, accordion FAQ", () => {
    // The LINE help button moved from the header into a top-bordered footer next to submit.
    expect(missingOrdersSource).toContain("formFooter");
    expect(missingOrdersSource).toContain("borderTopColor: colors.border");
    // Submit is a green pill (rounded-full), not a md-radius rectangle.
    expect(missingOrdersSource).toContain("borderRadius: 999");
    // Quick-card art uses the web's radial mint→white→grey wash.
    expect(missingOrdersSource).toContain("radial-gradient");
    // FAQ is a state-driven accordion (web parity), not a static first-answer.
    expect(missingOrdersSource).toContain("setOpenIndex");
  });
});
