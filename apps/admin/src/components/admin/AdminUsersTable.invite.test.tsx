// @vitest-environment happy-dom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminUsersTable from "./AdminUsersTable";

const apiMocks = vi.hoisted(() => ({
  clearError: vi.fn(),
  deleteAdminUser: vi.fn(),
  getAdminUsers: vi.fn(),
  inviteAdminUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  updateAdminUser: vi.fn(),
}));

vi.mock("@/hooks/useApi", () => ({
  useApi: () => ({
    loading: false,
    error: null,
    getAdminUsers: apiMocks.getAdminUsers,
    deleteAdminUser: apiMocks.deleteAdminUser,
    updateAdminUser: apiMocks.updateAdminUser,
    inviteAdminUser: apiMocks.inviteAdminUser,
    clearError: apiMocks.clearError,
  }),
  useAuth: () => ({ requestPasswordReset: apiMocks.requestPasswordReset }),
}));

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    can: () => true,
    canAny: () => true,
    ready: true,
    role: "super_admin",
    rolesLoaded: true,
  }),
}));

vi.mock("@/hooks/useRoles", () => ({
  useRolesQuery: () => ({
    data: {
      data: [
        {
          id: "editor",
          label: "Editor",
          description: "Can edit content",
          system: true,
          permissions: [],
        },
      ],
    },
  }),
}));

vi.mock("@/components/ui/modal", () => ({
  Modal: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
  }) => (isOpen ? <div role="dialog">{children}</div> : null),
}));

vi.mock("@/lib/devConsole", () => ({ devError: vi.fn() }));

describe("AdminUsersTable invitation delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getAdminUsers.mockResolvedValue({
      data: [],
      pagination: { page: 1, totalPages: 1, total: 0, limit: 12 },
    });
    apiMocks.inviteAdminUser.mockResolvedValue({
      message: "Invitation accepted for delivery",
      deliveryStatus: "accepted",
    });
  });

  afterEach(() => cleanup());

  it("shows the API delivery error inside the dialog and preserves the form for retry", async () => {
    const user = userEvent.setup();
    apiMocks.inviteAdminUser.mockRejectedValueOnce(
      Object.assign(
        new Error(
          "Email delivery is temporarily unavailable. Please try again, or contact an administrator if it continues.",
        ),
        { status: 503 },
      ),
    );
    render(<AdminUsersTable />);

    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    const dialog = screen.getByRole("dialog");
    const emailInput = within(dialog).getByLabelText("Email");
    await user.type(emailInput, "new-admin@example.com");
    await user.click(
      within(dialog).getByRole("button", { name: "Send invitation" }),
    );

    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent(
      "Email delivery is temporarily unavailable",
    );
    expect(emailInput).toHaveValue("new-admin@example.com");
    expect(within(dialog).getByLabelText("Role")).toHaveValue("editor");
    expect(
      within(dialog).getByRole("button", { name: "Retry sending" }),
    ).toBeEnabled();
  });

  it("retries with the retained values and reports provider acceptance accurately", async () => {
    const user = userEvent.setup();
    apiMocks.inviteAdminUser
      .mockRejectedValueOnce(
        Object.assign(new Error("Email delivery failed"), { status: 503 }),
      )
      .mockResolvedValueOnce({
        message: "Invitation accepted for delivery",
        deliveryStatus: "accepted",
      });
    render(<AdminUsersTable />);

    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    const dialog = screen.getByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("Email"),
      "new-admin@example.com",
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Send invitation" }),
    );
    await user.click(
      await within(dialog).findByRole("button", { name: "Retry sending" }),
    );

    await waitFor(() =>
      expect(apiMocks.inviteAdminUser).toHaveBeenCalledTimes(2),
    );
    expect(apiMocks.inviteAdminUser).toHaveBeenLastCalledWith(
      "new-admin@example.com",
      "editor",
    );
    expect(
      await within(dialog).findByText(
        "Invitation accepted for delivery to new-admin@example.com",
      ),
    ).toBeInTheDocument();
  });
});
