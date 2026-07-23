// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CreateBrandForm from "./CreateBrandForm";

const mocks = vi.hoisted(() => ({
  createBrandFromAffiliate: vi.fn(),
  fetcher: vi.fn(),
  push: vi.fn(),
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

vi.mock("@/hooks/useDataSession", () => ({
  useDataSession: () => ({ user: { email: "admin@gogocash.co" } }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/lib/api", () => ({
  apiClient: {
    createBrandFromAffiliate: mocks.createBrandFromAffiliate,
    getFee: vi.fn().mockResolvedValue([{ system: 30 }]),
  },
}));

vi.mock("@/lib/axios/client", () => ({
  fetcher: mocks.fetcher,
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

function renderForm(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateBrandForm />
    </QueryClientProvider>,
  );
}

function policyTextarea(): HTMLTextAreaElement {
  const section = document.getElementById("create-brand-section-policy");
  const textarea = section?.querySelector("textarea");
  if (!(textarea instanceof HTMLTextAreaElement)) {
    throw new Error("Expected the template policy textarea to render");
  }
  return textarea;
}

describe("CreateBrandForm policy behavior", () => {
  beforeEach(() => {
    mocks.createBrandFromAffiliate.mockReset().mockResolvedValue(undefined);
    mocks.fetcher.mockReset();
    mocks.push.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // 63 typed characters re-render the whole form per keystroke; with the
  // default per-event macrotask delay this hit vitest's 5s cap on slow
  // Cloud Build runners (build 99f519fb, 5085ms) while passing locally.
  // delay: null removes the per-keystroke wait; the raised timeout is
  // headroom for CI machines ~14x slower than a dev laptop.
  it("adopts a delayed template, preserves an authored edit across refresh, and submits that exact text", { timeout: 15_000 }, async () => {
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
      return Promise.resolve([]);
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const user = userEvent.setup({ delay: null });

    renderForm(queryClient);

    expect(
      screen.getByText(/No T&C configured for this category yet/i),
    ).toBeInTheDocument();

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

    await user.clear(policyTextarea());
    await user.type(policyTextarea(), "Admin-authored policy");

    const refreshPromise = queryClient.invalidateQueries({
      queryKey: ["policyList", "create-brand"],
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

    await user.type(screen.getByLabelText(/Brand name/i), "Policy Brand");
    await user.type(
      screen.getByLabelText(/Affiliate tracking URL/i),
      "https://merchant.example/track",
    );
    await user.click(screen.getByRole("button", { name: "Create brand" }));

    await waitFor(() => {
      expect(mocks.createBrandFromAffiliate).toHaveBeenCalledTimes(1);
    });
    const submitted = mocks.createBrandFromAffiliate.mock.calls[0]?.[0];
    expect(submitted).toBeInstanceOf(FormData);
    expect((submitted as FormData).get("custom_terms")).toBe(
      "Admin-authored policy",
    );
    expect((submitted as FormData).get("policy_category_id")).toBe("");
  });
});
