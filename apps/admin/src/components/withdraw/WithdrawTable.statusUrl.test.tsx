// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clearError: vi.fn(),
  getWithdraws: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("@/hooks/useApi", () => ({
  useApi: () => ({
    loading: false,
    error: null,
    getWithdraws: mocks.getWithdraws,
    clearError: mocks.clearError,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
    push: mocks.push,
  }),
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("./ModalWithdraw", () => ({ default: () => null }));

import WithdrawTable from "./WithdrawTable";

const emptyPage = {
  data: [],
  pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
};

describe("WithdrawTable status URL sync", () => {
  beforeEach(() => {
    mocks.clearError.mockReset();
    mocks.replace.mockReset();
    mocks.push.mockReset();
    mocks.getWithdraws.mockReset().mockResolvedValue(emptyPage);
    mocks.searchParams = new URLSearchParams();
  });

  afterEach(() => {
    cleanup();
  });

  it("given ?status=pending > then selects Pending and fetches once with that status", async () => {
    mocks.searchParams = new URLSearchParams("status=pending");
    render(<WithdrawTable />);

    await waitFor(() => {
      expect(mocks.getWithdraws).toHaveBeenCalledTimes(1);
    });
    expect(mocks.getWithdraws).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending", page: 1 }),
    );
    expect(screen.getByLabelText(/^status$/i)).toHaveValue("pending");
  });

  it("given Status dropdown change > then only updates the URL (effect owns the fetch)", async () => {
    const user = userEvent.setup();
    render(<WithdrawTable />);

    await waitFor(() => expect(mocks.getWithdraws).toHaveBeenCalledTimes(1));
    mocks.getWithdraws.mockClear();

    await user.selectOptions(screen.getByLabelText(/^status$/i), "approved");

    expect(mocks.replace).toHaveBeenCalledWith("/withdraw?status=approved", {
      scroll: false,
    });
    // Without a searchParams change in this mock, no second fetch is triggered
    // by the URL effect — proving handleStatusFilter itself does not fetch.
    expect(mocks.getWithdraws).not.toHaveBeenCalled();
  });

  it("given invalid ?status=paid > then strips it from the URL", async () => {
    mocks.searchParams = new URLSearchParams("status=paid&method=web3");
    render(<WithdrawTable />);

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith("/withdraw?method=web3", {
        scroll: false,
      });
    });
  });
});
