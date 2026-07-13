// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BannerRequestForm } from "@/types/banner";
import FormUpdate from "./FormUpdate";

const permissionsMock = vi.hoisted(() => ({
  canManageBanners: true,
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: (permission: string) =>
      permission === "banner:manage" ? permissionsMock.canManageBanners : true,
    canAny: (permissions: string[]) =>
      permissions.some((permission) =>
        permission === "banner:manage" ? permissionsMock.canManageBanners : true,
      ),
    ready: true,
    role: permissionsMock.canManageBanners ? "editor" : "viewer",
    rolesLoaded: true,
  }),
}));

vi.mock("@/hooks/useDataSession", () => ({
  useDataSession: () => ({ user: { email: "admin@gogocash.co" } }),
}));

vi.mock("@/hooks/useObjectUrl", () => ({
  useObjectUrl: () => null,
}));

vi.mock("../ui/modal", () => ({
  Modal: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) =>
    isOpen ? <div>{children}</div> : null,
}));

vi.mock("@/lib/axios/client", () => ({
  default: {
    post: vi.fn(),
  },
}));

function makeForm(patch: Partial<BannerRequestForm> = {}): BannerRequestForm {
  return {
    id: "1",
    image_1: "banner-1",
    image_2: null,
    image_3: null,
    image_4: null,
    image_5: null,
    link_1: "/quest",
    link_2: "",
    link_3: "",
    link_4: "",
    link_5: "",
    enabled_1: true,
    enabled_2: true,
    enabled_3: true,
    enabled_4: true,
    enabled_5: true,
    start_date_1: "",
    start_date_2: "",
    start_date_3: "",
    start_date_4: "",
    start_date_5: "",
    end_date_1: "",
    end_date_2: "",
    end_date_3: "",
    end_date_4: "",
    end_date_5: "",
    end_forever_1: true,
    end_forever_2: true,
    end_forever_3: true,
    end_forever_4: true,
    end_forever_5: true,
    ...patch,
  };
}

function renderForm(form: BannerRequestForm) {
  return render(
    <FormUpdate
      fetchData={vi.fn()}
      form={form}
      isLoading={false}
      openModal
      setForm={vi.fn()}
      setIsLoading={vi.fn()}
      setOpenModal={vi.fn()}
    />,
  );
}

describe("Banner FormUpdate permissions", () => {
  it("given viewer access > then dirty banner fields remain read-only", async () => {
    permissionsMock.canManageBanners = false;

    const initial = makeForm();
    const { container, rerender } = renderForm(initial);

    rerender(
      <FormUpdate
        fetchData={vi.fn()}
        form={makeForm({ link_1: "/new-campaign" })}
        isLoading={false}
        openModal
        setForm={vi.fn()}
        setIsLoading={vi.fn()}
        setOpenModal={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Enabled" })).toBeDisabled();
    expect(container.querySelector('input[name="link_1"]')).toBeDisabled();
    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
  });
});
