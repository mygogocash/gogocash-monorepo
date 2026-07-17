// @vitest-environment happy-dom
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UsersTable from "./UsersTable";

const mocks = vi.hoisted(() => ({
  clearError: vi.fn(),
  getUsers: vi.fn(),
  push: vi.fn(),
}));

vi.mock("@/hooks/useApi", () => ({
  useApi: () => ({
    loading: false,
    error: null,
    getUsers: mocks.getUsers,
    clearError: mocks.clearError,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("./FormUpdate", () => ({ default: () => null }));
vi.mock("./ViewMyCashback", () => ({ default: () => null }));

describe("UsersTable search", () => {
  beforeEach(() => {
    mocks.clearError.mockReset();
    mocks.getUsers.mockReset().mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 1,
      },
    });
    mocks.push.mockReset();
  });

  it("renders the supported email, user ID, and phone search contract", async () => {
    render(<UsersTable />);

    expect(
      screen.getByPlaceholderText("Search by email, user ID, or phone"),
    ).toBeInTheDocument();
    await waitFor(() => expect(mocks.getUsers).toHaveBeenCalledTimes(1));
  });
});
