// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api";
import CreateBrandForm from "./CreateBrandForm";

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
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/api", () => ({
  apiClient: {
    createBrandFromAffiliate: vi.fn(),
    getFee: vi.fn().mockResolvedValue([{ system: 30 }]),
  },
}));
vi.mock("@/lib/axios/client", () => ({ fetcher: vi.fn().mockResolvedValue([]) }));

function renderForm() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CreateBrandForm />
    </QueryClientProvider>,
  );
}

// Fill the two required fields (brand name + affiliate URL) so the submit passes
// validation and the disabled-until-dirty Save button enables.
function fillRequiredFields() {
  fireEvent.change(document.getElementById("create-brand-name")!, {
    target: { value: "Multi Country Brand" },
  });
  fireEvent.change(document.getElementById("create-brand-tracking")!, {
    target: { value: "https://partner.example/track?aff=1" },
  });
}

function submittedCountries(): string | null {
  const call = vi.mocked(apiClient.createBrandFromAffiliate).mock.calls[0];
  const formData = call?.[0] as FormData | undefined;
  return (formData?.get("countries") as string | null) ?? null;
}

// #519 — a country-specific brand can target multiple countries. The picker is a
// chip list with a per-chip remove control; submit sends a comma-separated string
// (the API + admin table already split/trim on comma).
describe("CreateBrandForm multi-country availability (#519)", () => {
  beforeEach(() => {
    vi.mocked(apiClient.createBrandFromAffiliate).mockClear();
  });
  afterEach(cleanup);

  it("sends every selected country as a comma-separated string", async () => {
    renderForm();
    fillRequiredFields();

    // Thailand is the default chip; add a second country via the add-dropdown.
    fireEvent.change(document.getElementById("create-brand-country")!, {
      target: { value: "Malaysia" },
    });

    const chips = screen.getByTestId("create-brand-country-chips");
    expect(chips.textContent).toContain("Thailand");
    expect(chips.textContent).toContain("Malaysia");

    fireEvent.click(screen.getByRole("button", { name: "Create brand" }));

    await waitFor(() =>
      expect(apiClient.createBrandFromAffiliate).toHaveBeenCalledTimes(1),
    );
    expect(submittedCountries()).toBe("Thailand, Malaysia");
  });

  it("drops a country when its chip remove control is clicked", async () => {
    renderForm();
    fillRequiredFields();
    fireEvent.change(document.getElementById("create-brand-country")!, {
      target: { value: "Vietnam" },
    });

    // Remove the default Thailand chip, leaving only Vietnam.
    fireEvent.click(screen.getByRole("button", { name: "Remove Thailand" }));

    fireEvent.click(screen.getByRole("button", { name: "Create brand" }));

    await waitFor(() =>
      expect(apiClient.createBrandFromAffiliate).toHaveBeenCalledTimes(1),
    );
    expect(submittedCountries()).toBe("Vietnam");
  });

  it("blocks submit when a country-specific brand has no countries selected", () => {
    renderForm();
    fillRequiredFields();

    // Remove the only (default) country → empty country-specific list.
    fireEvent.click(screen.getByRole("button", { name: "Remove Thailand" }));
    expect(
      screen.getByText("Select at least one country."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create brand" }));
    expect(apiClient.createBrandFromAffiliate).not.toHaveBeenCalled();
  });
});
