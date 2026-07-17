// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PolicyTable from "./PolicyTable";

const apiMock = vi.hoisted(() => ({
  fetcher: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}));
const toastMock = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/lib/axios/client", () => ({
  default: { post: apiMock.post, put: apiMock.put },
  fetcher: apiMock.fetcher,
}));

vi.mock("react-hot-toast", () => ({ default: toastMock }));

vi.mock("@/components/common/RemoteOrBlobImage", () => ({
  RemoteOrBlobImage: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const CATEGORY_ID = "507f1f77bcf86cd799439011";
let category: Record<string, unknown>;
let policies: Array<Record<string, unknown>>;

function resetFixtures() {
  category = {
    _id: CATEGORY_ID,
    name: "Travel Deals",
    icon_key: "travel",
    lifecycle_status: "active",
    revision: 7,
  };
  policies = [
    {
      category_id: CATEGORY_ID,
      terms: {
        primary_locale: "en",
        translations: { en: "Old terms" },
        content_source: "custom",
      },
      banner: {
        primary_locale: "en",
        translations: { en: "Old banner" },
        content_source: "custom",
      },
    },
  ];
}

function successfulResponse() {
  return { data: { category: { ...category } } };
}

function renderTable() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PolicyTable />
    </QueryClientProvider>,
  );
}

async function openExisting(user: ReturnType<typeof userEvent.setup>) {
  const row = await screen.findByRole("row", {
    name: "View or edit policy and banner for Travel Deals",
  });
  await user.click(row);
  await screen.findByRole("button", { name: "Close" });
}

async function editTerms(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Edit terms & conditions" }),
  );
  return screen.getByRole("textbox", { name: /Content/ });
}

describe("PolicyTable interactions", () => {
  beforeEach(() => {
    resetFixtures();
    apiMock.fetcher.mockImplementation(async (path: string) => {
      if (path === "/offer/get-category/list") return [{ ...category }];
      if (path === "/policy/category-list") return policies;
      throw new Error(`Unexpected fetch: ${path}`);
    });
    apiMock.put.mockImplementation(async () => successfulResponse());
    apiMock.post.mockImplementation(async () => {
      throw new Error("Unexpected lifecycle request");
    });
  });

  afterEach(() => {
    cleanup();
    vi.resetAllMocks();
  });

  it("Create -> Close and existing -> Close perform zero writes", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(await screen.findByRole("button", { name: "Create New" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(apiMock.put).not.toHaveBeenCalled();

    await openExisting(user);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(apiMock.put).not.toHaveBeenCalled();
  });

  it("section Cancel restores only that section's snapshot", async () => {
    const user = userEvent.setup();
    renderTable();
    await openExisting(user);

    const terms = await editTerms(user);
    await user.clear(terms);
    await user.type(terms, "Draft terms");

    await user.click(screen.getByRole("button", { name: "Edit banner text" }));
    const banner = screen.getByRole("textbox", {
      name: "Policy banner text",
    });
    await user.clear(banner);
    await user.type(banner, "Draft banner");

    await user.click(
      screen.getByRole("button", { name: "Cancel terms changes" }),
    );
    expect(screen.getByText("Old terms")).toBeInTheDocument();
    expect(banner).toHaveValue("Draft banner");
    expect(apiMock.put).not.toHaveBeenCalled();
  });

  it("new-draft terms Cancel clears only terms before the unified Save", async () => {
    const user = userEvent.setup();
    apiMock.put.mockImplementationOnce(
      async (_path: string, body: FormData) => ({
        data: {
          category: {
            _id: "507f1f77bcf86cd799439099",
            name: String(body.get("category_name")),
            icon_key: String(body.get("icon_key")),
            lifecycle_status: "active",
          },
        },
      }),
    );
    renderTable();

    await user.click(await screen.findByRole("button", { name: "Create New" }));
    const name = screen.getByRole("textbox", { name: "Category name" });
    await user.type(name, "New Travel Category");
    await user.selectOptions(screen.getByLabelText("Category icon"), "food");

    const terms = screen.getByRole("textbox", { name: /Content/ });
    const banner = screen.getByRole("textbox", {
      name: "Policy banner text",
    });
    await user.type(terms, "Canceled terms");
    await user.type(banner, "Banner draft persists");

    await user.click(
      screen.getByRole("button", { name: "Cancel terms changes" }),
    );

    expect(apiMock.put).not.toHaveBeenCalled();
    expect(
      screen.getByText("No terms set yet — click Edit to add."),
    ).toBeInTheDocument();
    expect(banner).toHaveValue("Banner draft persists");
    expect(name).toHaveValue("New Travel Category");
    expect(screen.getByLabelText("Category icon")).toHaveValue("food");

    await user.click(
      screen.getByRole("button", { name: "Edit terms & conditions" }),
    );
    const restoredTerms = screen.getByRole("textbox", { name: /Content/ });
    expect(restoredTerms).toHaveValue("");
    await user.type(restoredTerms, "Replacement terms");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1));
    const [path, form] = apiMock.put.mock.calls[0] as [string, FormData];
    expect(path).toBe("/policy/aggregate");
    expect(form.get("category_name")).toBe("New Travel Category");
    expect(form.get("icon_key")).toBe("food");
    const payload = JSON.parse(String(form.get("policy")));
    expect(payload.terms.translations).toEqual({ th: "Replacement terms" });
    expect(payload.banner.translations).toEqual({
      th: "Banner draft persists",
    });
    expect(String(form.get("policy"))).not.toContain("Canceled terms");
  });

  it("new-draft banner Cancel clears text and file while preserving other draft fields", async () => {
    const user = userEvent.setup();
    apiMock.put.mockImplementationOnce(
      async (_path: string, body: FormData) => ({
        data: {
          category: {
            _id: "507f1f77bcf86cd799439098",
            name: String(body.get("category_name")),
            icon_key: String(body.get("icon_key")),
            lifecycle_status: "active",
          },
        },
      }),
    );
    renderTable();

    await user.click(await screen.findByRole("button", { name: "Create New" }));
    const name = screen.getByRole("textbox", { name: "Category name" });
    await user.type(name, "New Shopping Category");
    await user.selectOptions(
      screen.getByLabelText("Category icon"),
      "shopping",
    );

    const terms = screen.getByRole("textbox", { name: /Content/ });
    const banner = screen.getByRole("textbox", {
      name: "Policy banner text",
    });
    await user.type(terms, "Terms draft persists");
    await user.type(banner, "Canceled banner");
    await user.upload(
      screen.getByLabelText("Default banner file"),
      new File(["canceled-banner"], "canceled.png", { type: "image/png" }),
    );
    expect(
      screen.getByRole("img", { name: "Default category banner" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Cancel banner text changes" }),
    );

    expect(apiMock.put).not.toHaveBeenCalled();
    expect(
      screen.getByText("No banner text set yet — click Edit to add."),
    ).toBeInTheDocument();
    expect(screen.getByText("No uploaded files")).toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Default category banner" }),
    ).not.toBeInTheDocument();
    expect(terms).toHaveValue("Terms draft persists");
    expect(name).toHaveValue("New Shopping Category");
    expect(screen.getByLabelText("Category icon")).toHaveValue("shopping");

    await user.click(screen.getByRole("button", { name: "Edit banner text" }));
    const restoredBanner = screen.getByRole("textbox", {
      name: "Policy banner text",
    });
    expect(restoredBanner).toHaveValue("");
    await user.type(restoredBanner, "Replacement banner");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1));
    const [path, form] = apiMock.put.mock.calls[0] as [string, FormData];
    expect(path).toBe("/policy/aggregate");
    expect(form.get("category_name")).toBe("New Shopping Category");
    expect(form.get("icon_key")).toBe("shopping");
    expect(form.get("default_banner")).toBeNull();
    const payload = JSON.parse(String(form.get("policy")));
    expect(payload.terms.translations).toEqual({
      th: "Terms draft persists",
    });
    expect(payload.banner.translations).toEqual({
      th: "Replacement banner",
    });
    expect(String(form.get("policy"))).not.toContain("Canceled banner");
  });

  it("Clear remains local until Save, then emits one explicit aggregate clear", async () => {
    const user = userEvent.setup();
    renderTable();
    await openExisting(user);
    await editTerms(user);

    await user.click(screen.getByRole("button", { name: "Clear T&C" }));
    expect(apiMock.put).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1));
    const [path, body] = apiMock.put.mock.calls[0] as [string, FormData];
    expect(path).toBe("/policy/aggregate");
    expect(JSON.parse(String(body.get("policy")))).toMatchObject({
      category_id: CATEGORY_ID,
      clear_terms: true,
    });
  });

  it("a failed identical retry reuses its request key", async () => {
    const user = userEvent.setup();
    apiMock.put
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockImplementationOnce(async () => successfulResponse());
    renderTable();
    await openExisting(user);
    const terms = await editTerms(user);
    await user.clear(terms);
    await user.type(terms, "Retried terms");

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(2));

    const first = apiMock.put.mock.calls[0][1] as FormData;
    const retry = apiMock.put.mock.calls[1][1] as FormData;
    expect(retry.get("request_key")).toBe(first.get("request_key"));
  });

  it("changing the payload after a failed save rotates the request key", async () => {
    const user = userEvent.setup();
    apiMock.put
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockImplementationOnce(async () => successfulResponse());
    renderTable();
    await openExisting(user);
    const terms = await editTerms(user);
    await user.clear(terms);
    await user.type(terms, "First draft");

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledTimes(1));
    await user.type(terms, " changed");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(2));

    const first = apiMock.put.mock.calls[0][1] as FormData;
    const changed = apiMock.put.mock.calls[1][1] as FormData;
    expect(changed.get("request_key")).not.toBe(first.get("request_key"));
  });

  it("rotates the request key after success before an identical file save", async () => {
    const user = userEvent.setup();
    renderTable();
    await openExisting(user);
    const input = screen.getByLabelText("Default banner file");
    const file = new File(["same-banner"], "default.png", {
      type: "image/png",
      lastModified: 123,
    });

    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1));

    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(2));

    const first = apiMock.put.mock.calls[0][1] as FormData;
    const laterIdentical = apiMock.put.mock.calls[1][1] as FormData;
    expect(laterIdentical.get("request_key")).not.toBe(
      first.get("request_key"),
    );
  });

  it("surfaces the specific aggregate API error message", async () => {
    const user = userEvent.setup();
    apiMock.put.mockRejectedValueOnce({
      data: { message: 'A category named "Travel Deals" already exists.' },
    });
    renderTable();
    await openExisting(user);
    const terms = await editTerms(user);
    await user.type(terms, " updated");

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        'A category named "Travel Deals" already exists.',
      ),
    );
  });

  it("persists the selected icon in the aggregate and renders the returned icon", async () => {
    const user = userEvent.setup();
    apiMock.put.mockImplementationOnce(
      async (_path: string, body: FormData) => {
        category = { ...category, icon_key: String(body.get("icon_key")) };
        return successfulResponse();
      },
    );
    const view = renderTable();
    await openExisting(user);

    await user.selectOptions(screen.getByLabelText("Category icon"), "food");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(apiMock.put).toHaveBeenCalledTimes(1));
    const form = apiMock.put.mock.calls[0][1] as FormData;
    expect(form.get("icon_key")).toBe("food");
    expect(screen.getByLabelText("Category icon")).toHaveValue("food");

    await user.click(screen.getByRole("button", { name: "Close" }));
    const row = await screen.findByRole("row", {
      name: "View or edit policy and banner for Travel Deals",
    });
    expect(within(row).getByText("Travel Deals")).toBeInTheDocument();
    expect(
      view.container.querySelector('[data-category-icon="food"]'),
    ).not.toBeNull();
  });

  it("shows distinct content-delete and retirement dialogs without a purge control", async () => {
    const user = userEvent.setup();
    renderTable();

    const row = await screen.findByRole("row", {
      name: "View or edit policy and banner for Travel Deals",
    });
    expect(
      within(row).getByRole("button", {
        name: "Delete policy content for Travel Deals",
      }),
    ).toBeInTheDocument();
    expect(
      within(row).getByRole("button", { name: "Retire Travel Deals" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /purge/i })).toBeNull();

    await user.click(
      within(row).getByRole("button", {
        name: "Delete policy content for Travel Deals",
      }),
    );
    const deleteDialog = screen.getByRole("dialog", {
      name: "Delete policy content?",
    });
    expect(deleteDialog).toHaveTextContent(
      "The category remains active and available to offers.",
    );
    expect(deleteDialog).toHaveTextContent("policy terms");
    await user.click(
      within(deleteDialog).getByRole("button", { name: "Cancel" }),
    );
    expect(apiMock.post).not.toHaveBeenCalled();

    await user.click(
      within(row).getByRole("button", { name: "Retire Travel Deals" }),
    );
    const retireDialog = screen.getByRole("dialog", {
      name: "Retire category?",
    });
    expect(retireDialog).toHaveTextContent(
      "can only be retired when no offers reference it",
    );
    expect(retireDialog).toHaveTextContent(
      "disappear from active policy editing and category selection",
    );
    await user.click(
      within(retireDialog).getByRole("button", { name: "Cancel" }),
    );
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("closes a lifecycle dialog with Escape, restores focus, and performs zero writes", async () => {
    const user = userEvent.setup();
    renderTable();

    const row = await screen.findByRole("row", {
      name: "View or edit policy and banner for Travel Deals",
    });
    const trigger = within(row).getByRole("button", {
      name: "Delete policy content for Travel Deals",
    });
    await user.click(trigger);
    expect(
      screen.getByRole("dialog", { name: "Delete policy content?" }),
    ).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "Delete policy content?" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("dismisses from the backdrop, restores trigger focus, and performs zero writes", async () => {
    const user = userEvent.setup();
    renderTable();

    const row = await screen.findByRole("row", {
      name: "View or edit policy and banner for Travel Deals",
    });
    const trigger = within(row).getByRole("button", {
      name: "Retire Travel Deals",
    });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Retire category?" });
    const backdrop = dialog.parentElement;
    expect(backdrop).not.toBeNull();

    fireEvent.mouseDown(backdrop as HTMLElement);

    expect(
      screen.queryByRole("dialog", { name: "Retire category?" }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it("POSTs content deletion with revision and a command key, then renders the server-refetched empty policy", async () => {
    const user = userEvent.setup();
    apiMock.post.mockImplementationOnce(
      async (_path: string, body: unknown) => {
        policies = [];
        category = { ...category, revision: 8 };
        return {
          data: {
            request_key: (body as { request_key: string }).request_key,
            operation: "delete-content",
            category: { ...category },
            policy_deleted: true,
            cleanup_scheduled: 2,
          },
        };
      },
    );
    const view = renderTable();

    const row = await screen.findByRole("row", {
      name: "View or edit policy and banner for Travel Deals",
    });
    await user.click(
      within(row).getByRole("button", {
        name: "Delete policy content for Travel Deals",
      }),
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Delete policy content?" }),
      ).getByRole("button", { name: "Delete content" }),
    );

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    const [path, body] = apiMock.post.mock.calls[0] as [
      string,
      { request_key: string; expected_revision: number },
    ];
    expect(path).toBe(`/policy/category/${CATEGORY_ID}/delete-content`);
    expect(body.expected_revision).toBe(7);
    expect(body.request_key).toMatch(/^policy-lifecycle-/);
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Delete policy content?" }),
      ).not.toBeInTheDocument(),
    );
    const refreshedRow = await screen.findByRole("row", {
      name: "View or edit policy and banner for Travel Deals",
    });
    expect(within(refreshedRow).getByText("Not set")).toBeInTheDocument();
    expect(
      view.container.querySelector('[data-category-icon="travel"]'),
    ).not.toBeNull();
  });

  it("retires only after the server returns retired lifecycle truth", async () => {
    const user = userEvent.setup();
    apiMock.post.mockImplementationOnce(
      async (_path: string, body: unknown) => {
        category = {
          ...category,
          lifecycle_status: "retired",
          revision: 8,
          retired_at: "2026-07-17T01:00:00.000Z",
          purge_after: "2026-08-16T01:00:00.000Z",
        };
        return {
          data: {
            request_key: (body as { request_key: string }).request_key,
            operation: "retire",
            category: { ...category },
            reference_counts: {
              offer_policy_category_id: 0,
              offer_categories_normalized: 0,
              unique_offers: 0,
            },
          },
        };
      },
    );
    renderTable();

    const row = await screen.findByRole("row", {
      name: "View or edit policy and banner for Travel Deals",
    });
    await user.click(
      within(row).getByRole("button", { name: "Retire Travel Deals" }),
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Retire category?" }),
      ).getByRole("button", { name: "Retire category" }),
    );

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    expect(apiMock.post.mock.calls[0][0]).toBe(
      `/policy/category/${CATEGORY_ID}/retire`,
    );
    expect(apiMock.post.mock.calls[0][1]).toMatchObject({
      expected_revision: 7,
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("row", {
          name: "View or edit policy and banner for Travel Deals",
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it("keeps the retire dialog open and displays the server's exact reference counts", async () => {
    const user = userEvent.setup();
    apiMock.post.mockRejectedValueOnce({
      status: 409,
      data: {
        statusCode: 409,
        code: "POLICY_CATEGORY_REFERENCED",
        message: "Category is referenced by offers and cannot be retired.",
        reference_counts: {
          offer_policy_category_id: 2,
          offer_categories_normalized: 3,
          unique_offers: 4,
        },
      },
    });
    renderTable();

    const row = await screen.findByRole("row", {
      name: "View or edit policy and banner for Travel Deals",
    });
    await user.click(
      within(row).getByRole("button", { name: "Retire Travel Deals" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Retire category?" });
    await user.click(
      within(dialog).getByRole("button", { name: "Retire category" }),
    );

    expect(
      await within(dialog).findByText(
        "Category is referenced by offers and cannot be retired.",
      ),
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent("offer_policy_category_id: 2");
    expect(dialog).toHaveTextContent("offer_categories_normalized: 3");
    expect(dialog).toHaveTextContent("unique_offers: 4");
    expect(dialog).toHaveTextContent(
      "Remove every offer reference, reload category data, and try again.",
    );
    expect(
      screen.getByRole("row", {
        name: "View or edit policy and banner for Travel Deals",
      }),
    ).toBeInTheDocument();
  });

  it("rejects a successful response that does not carry authoritative retired lifecycle truth", async () => {
    const user = userEvent.setup();
    apiMock.post.mockImplementationOnce(
      async (_path: string, body: unknown) => ({
        data: {
          request_key: (body as { request_key: string }).request_key,
          operation: "retire",
          category: { ...category, lifecycle_status: "active", revision: 8 },
          reference_counts: {
            offer_policy_category_id: 0,
            offer_categories_normalized: 0,
            unique_offers: 0,
          },
        },
      }),
    );
    renderTable();

    const row = await screen.findByRole("row", {
      name: "View or edit policy and banner for Travel Deals",
    });
    await user.click(
      within(row).getByRole("button", { name: "Retire Travel Deals" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Retire category?" });
    await user.click(
      within(dialog).getByRole("button", { name: "Retire category" }),
    );

    expect(
      await within(dialog).findByText(
        "The server did not return authoritative category lifecycle data. Reload category data before retrying.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("row", {
        name: "View or edit policy and banner for Travel Deals",
      }),
    ).toBeInTheDocument();
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("shows a clear reload-and-retry path for revision conflicts", async () => {
    const user = userEvent.setup();
    apiMock.post.mockRejectedValueOnce({
      status: 409,
      data: {
        statusCode: 409,
        code: "POLICY_CATEGORY_REVISION_CONFLICT",
        message: "Category changed; refresh and try again.",
      },
    });
    renderTable();

    const row = await screen.findByRole("row", {
      name: "View or edit policy and banner for Travel Deals",
    });
    await user.click(
      within(row).getByRole("button", {
        name: "Delete policy content for Travel Deals",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Delete policy content?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Delete content" }),
    );

    expect(
      await within(dialog).findByText(
        "Category changed; refresh and try again. Reload category data before retrying this action.",
      ),
    ).toBeInTheDocument();
    const fetchesBeforeReload = apiMock.fetcher.mock.calls.length;
    await user.click(
      within(dialog).getByRole("button", { name: "Reload category data" }),
    );
    await waitFor(() =>
      expect(apiMock.fetcher.mock.calls.length).toBeGreaterThan(
        fetchesBeforeReload,
      ),
    );
    expect(
      screen.queryByRole("dialog", { name: "Delete policy content?" }),
    ).not.toBeInTheDocument();
  });

  it("prevents double submits and reuses the lifecycle request key on retry", async () => {
    const user = userEvent.setup();
    let rejectFirst!: (reason: unknown) => void;
    const firstAttempt = new Promise((_resolve, reject) => {
      rejectFirst = reject;
    });
    apiMock.post
      .mockImplementationOnce(async () => firstAttempt)
      .mockImplementationOnce(async (_path: string, body: unknown) => {
        policies = [];
        category = { ...category, revision: 8 };
        return {
          data: {
            request_key: (body as { request_key: string }).request_key,
            operation: "delete-content",
            category: { ...category },
            policy_deleted: true,
            cleanup_scheduled: 0,
          },
        };
      });
    renderTable();

    const row = await screen.findByRole("row", {
      name: "View or edit policy and banner for Travel Deals",
    });
    await user.click(
      within(row).getByRole("button", {
        name: "Delete policy content for Travel Deals",
      }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Delete policy content?",
    });
    const confirm = within(dialog).getByRole("button", {
      name: "Delete content",
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(apiMock.post).toHaveBeenCalledTimes(1);
    expect(confirm).toBeDisabled();

    rejectFirst(new Error("Temporary lifecycle failure"));
    expect(
      await within(dialog).findByText("Temporary lifecycle failure"),
    ).toBeInTheDocument();
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(2));

    const firstBody = apiMock.post.mock.calls[0][1] as {
      request_key: string;
    };
    const retryBody = apiMock.post.mock.calls[1][1] as {
      request_key: string;
    };
    expect(retryBody.request_key).toBe(firstBody.request_key);
  });

  it("rotates the lifecycle request key after closing and reopening the dialog", async () => {
    const user = userEvent.setup();
    apiMock.post
      .mockRejectedValueOnce(new Error("First attempt failed"))
      .mockRejectedValueOnce(new Error("Retry failed"))
      .mockRejectedValueOnce(new Error("Reopened attempt failed"));
    renderTable();

    const row = await screen.findByRole("row", {
      name: "View or edit policy and banner for Travel Deals",
    });
    const trigger = within(row).getByRole("button", {
      name: "Delete policy content for Travel Deals",
    });
    await user.click(trigger);
    let dialog = screen.getByRole("dialog", {
      name: "Delete policy content?",
    });
    let confirm = within(dialog).getByRole("button", {
      name: "Delete content",
    });

    await user.click(confirm);
    expect(
      await within(dialog).findByText("First attempt failed"),
    ).toBeInTheDocument();
    await user.click(confirm);
    expect(await within(dialog).findByText("Retry failed")).toBeInTheDocument();
    expect(apiMock.post).toHaveBeenCalledTimes(2);

    const firstBody = apiMock.post.mock.calls[0][1] as {
      request_key: string;
    };
    const retryBody = apiMock.post.mock.calls[1][1] as {
      request_key: string;
    };
    expect(retryBody.request_key).toBe(firstBody.request_key);

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await user.click(trigger);
    dialog = screen.getByRole("dialog", { name: "Delete policy content?" });
    confirm = within(dialog).getByRole("button", { name: "Delete content" });
    await user.click(confirm);
    expect(
      await within(dialog).findByText("Reopened attempt failed"),
    ).toBeInTheDocument();
    expect(apiMock.post).toHaveBeenCalledTimes(3);

    const reopenedBody = apiMock.post.mock.calls[2][1] as {
      request_key: string;
    };
    expect(reopenedBody.request_key).not.toBe(firstBody.request_key);
  });
});
