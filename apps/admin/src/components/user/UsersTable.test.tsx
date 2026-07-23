// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Render tests for the pre-launch feature-flag gating of the Users table.
 *
 * Contract (see src/config/featureFlags.ts): each surface is ENABLED by default
 * and ONLY the literal env "0" hides it. isCreditScoreEnabled()/
 * isGoGoPassEnabled() read the flags at render time, so vi.stubEnv before
 * render() drives the gate — Vitest's esbuild does NOT inline process.env the
 * way the Next build does, so the accessor stays a live read.
 *
 *   NEXT_PUBLIC_ENABLE_CREDIT_SCORE -> "Tier" column + "Credit Tier" filter
 *   NEXT_PUBLIC_ENABLE_GOGOPASS     -> "Membership" + "Subscription" columns/filters
 *
 * The base (never-gated) columns are User, Email, Role, Actions = 4 cells; the
 * per-row cell count is used as a th/td structural-parity assertion.
 */

// getUsers is referenced inside the vi.mock factory, so it must be hoisted.
const { getUsers } = vi.hoisted(() => ({ getUsers: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock("@/hooks/useApi", () => ({
  useApi: () => ({
    loading: false,
    error: null,
    getUsers,
    clearError: vi.fn(),
  }),
}));

// Modal children pull in heavy runtime deps (axios, react-query) that are
// irrelevant to gating; stub them to null.
vi.mock("@/components/user/FormUpdate", () => ({ default: () => null }));
vi.mock("@/components/user/ViewMyCashback", () => ({ default: () => null }));

import UsersTable from "./UsersTable";

const USER = {
  _id: "u1",
  address: "0xabc",
  __v: 0,
  email: "test@example.com",
  id_crossmint: "",
  id_twitter: "",
  username: "testuser",
  id_firebase: "",
  createdAt: new Date(),
  updatedAt: new Date(),
  birthdate: null,
  country: null,
  gender: null,
  membershipTier: "GoGoPass Plus",
  subscriptionPlan: "Monthly Premium",
  creditScore: 750,
};

beforeEach(() => {
  getUsers.mockResolvedValue({
    data: [USER],
    pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
  });
});

afterEach(() => {
  // This vitest config does not enable `globals`, so RTL's auto-cleanup
  // afterEach never registers — unmount explicitly or the DOM accumulates
  // across tests (duplicate rows/comboboxes).
  cleanup();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

/** Render and wait for the async-fetched data row to appear. */
async function renderTable() {
  render(<UsersTable />);
  await screen.findByText("testuser");
}

const header = (name: string) => screen.queryByRole("columnheader", { name });
const dimSelect = () =>
  screen.getByRole("combobox", { name: "Filter dimension" });
const valueSelect = () =>
  screen.getByRole("combobox", { name: "Filter value" });

/** Cells in the (single) data row — the thead row is excluded. */
function dataRowCells() {
  const rows = screen.getAllByRole("row");
  const dataRow = rows[rows.length - 1];
  return within(dataRow).getAllByRole("cell");
}

describe("UsersTable feature-flag gating", () => {
  describe("given both flags unset (default-on)", () => {
    it("then renders Tier, Membership and Subscription columns (7 cells/row)", async () => {
      await renderTable();
      expect(header("Tier")).toBeInTheDocument();
      expect(header("Membership")).toBeInTheDocument();
      expect(header("Subscription")).toBeInTheDocument();
      expect(dataRowCells()).toHaveLength(7);
    });

    it("then offers all three filter dimensions with tier selected", async () => {
      await renderTable();
      expect(
        within(dimSelect()).getByRole("option", { name: "Credit Tier" }),
      ).toBeInTheDocument();
      expect(
        within(dimSelect()).getByRole("option", { name: "Membership" }),
      ).toBeInTheDocument();
      expect(
        within(dimSelect()).getByRole("option", { name: "Subscription" }),
      ).toBeInTheDocument();
      expect(dimSelect()).toHaveValue("tier");
    });
  });

  describe('given NEXT_PUBLIC_ENABLE_CREDIT_SCORE="0"', () => {
    beforeEach(() => vi.stubEnv("NEXT_PUBLIC_ENABLE_CREDIT_SCORE", "0"));

    it("then hides the Tier column but keeps Membership/Subscription (6 cells/row)", async () => {
      await renderTable();
      expect(header("Tier")).not.toBeInTheDocument();
      expect(header("Membership")).toBeInTheDocument();
      expect(header("Subscription")).toBeInTheDocument();
      expect(dataRowCells()).toHaveLength(6);
    });

    it("then hides the Credit Tier filter dimension", async () => {
      await renderTable();
      expect(
        within(dimSelect()).queryByRole("option", { name: "Credit Tier" }),
      ).not.toBeInTheDocument();
    });

    it('then defaults the filter dimension to a visible one (not the hidden "tier")', async () => {
      await renderTable();
      expect(dimSelect()).toHaveValue("membership");
      expect(
        within(valueSelect()).getByRole("option", { name: "All memberships" }),
      ).toBeInTheDocument();
      expect(
        within(valueSelect()).queryByRole("option", { name: "All tiers" }),
      ).not.toBeInTheDocument();
    });
  });

  describe('given NEXT_PUBLIC_ENABLE_GOGOPASS="0"', () => {
    beforeEach(() => vi.stubEnv("NEXT_PUBLIC_ENABLE_GOGOPASS", "0"));

    it("then hides Membership and Subscription columns but keeps Tier (5 cells/row)", async () => {
      await renderTable();
      expect(header("Membership")).not.toBeInTheDocument();
      expect(header("Subscription")).not.toBeInTheDocument();
      expect(header("Tier")).toBeInTheDocument();
      expect(dataRowCells()).toHaveLength(5);
    });

    it("then hides the Membership and Subscription filter dimensions and keeps Credit Tier selected", async () => {
      await renderTable();
      expect(
        within(dimSelect()).queryByRole("option", { name: "Membership" }),
      ).not.toBeInTheDocument();
      expect(
        within(dimSelect()).queryByRole("option", { name: "Subscription" }),
      ).not.toBeInTheDocument();
      expect(
        within(dimSelect()).getByRole("option", { name: "Credit Tier" }),
      ).toBeInTheDocument();
      expect(dimSelect()).toHaveValue("tier");
    });
  });

  describe("given both flags disabled", () => {
    beforeEach(() => {
      vi.stubEnv("NEXT_PUBLIC_ENABLE_CREDIT_SCORE", "0");
      vi.stubEnv("NEXT_PUBLIC_ENABLE_GOGOPASS", "0");
    });

    it("then hides all three gated columns (4 base cells/row)", async () => {
      await renderTable();
      expect(header("Tier")).not.toBeInTheDocument();
      expect(header("Membership")).not.toBeInTheDocument();
      expect(header("Subscription")).not.toBeInTheDocument();
      expect(dataRowCells()).toHaveLength(4);
    });

    it("then hides the filter dropdowns entirely (nothing left to filter)", async () => {
      await renderTable();
      expect(
        screen.queryByRole("combobox", { name: "Filter dimension" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("combobox", { name: "Filter value" }),
      ).not.toBeInTheDocument();
    });
  });
});
