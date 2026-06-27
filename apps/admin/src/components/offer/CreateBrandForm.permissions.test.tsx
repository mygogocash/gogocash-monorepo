// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CreateBrandForm from "./CreateBrandForm";

const permissionsMock = vi.hoisted(() => ({
  canManageBrands: true,
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: (permission: string) =>
      permission === "brands:manage" ? permissionsMock.canManageBrands : true,
    canAny: (permissions: string[]) =>
      permissions.some((permission) =>
        permission === "brands:manage" ? permissionsMock.canManageBrands : true,
      ),
    ready: true,
    role: permissionsMock.canManageBrands ? "editor" : "viewer",
    rolesLoaded: true,
  }),
}));

vi.mock("@/hooks/useDataSession", () => ({
  useDataSession: () => ({ accessToken: "test-token" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  apiClient: { createBrandFromAffiliate: vi.fn() },
}));

vi.mock("@/lib/axios/client", () => ({
  fetcher: vi.fn().mockResolvedValue([]),
}));

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateBrandForm />
    </QueryClientProvider>,
  );
}

describe("CreateBrandForm permissions", () => {
  it("given viewer access > then shows permission denied and disables create", () => {
    permissionsMock.canManageBrands = false;

    renderForm();

    expect(
      screen.getByText(/do not have permission to create brands/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create brand" }),
    ).toBeDisabled();
  });
});
