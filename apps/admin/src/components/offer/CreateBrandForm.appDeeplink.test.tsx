// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

// #517 — the GoGoCash app tracking link is the OLD manual mapping; it must be
// auto-generated from the affiliate URL, not typed by the admin.
describe("CreateBrandForm app-deeplink auto-generation (#517)", () => {
  it("no longer renders a manual GoGoCash app tracking link input", () => {
    renderForm();
    // The manual field carried this exact id; it must be gone.
    expect(
      document.getElementById("create-brand-app-deeplink"),
    ).toBeNull();
  });

  it("keeps the required Affiliate tracking URL input", () => {
    renderForm();
    expect(document.getElementById("create-brand-tracking")).not.toBeNull();
  });

  it("tells the admin the app link is auto-generated", () => {
    renderForm();
    // Mentioned in both the section note and the form header — either is fine.
    expect(screen.getAllByText(/auto-generated/i).length).toBeGreaterThan(0);
  });
});
