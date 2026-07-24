// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Dispatch, SetStateAction } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WithdrawUserEditDraft } from "@/lib/withdrawUserContactState";

/**
 * Pre-launch feature-flag gating for WithdrawDetail's embedded surfaces.
 * Contract mirrors featureFlags.ts: each surface ships ENABLED by default and
 * ONLY the literal env "0" hides it. These render tests pin both flag states
 * for every gated surface (the "Benefits & Scoring" tab, the GoGoPass edit
 * select, the subscription content block, and the inline standing rows), and
 * the documented risk: a ?tab=subscription deep-link must NOT strand activeTab
 * on a removed tab.
 */

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  updateWithdrawUserProfile: vi.fn(async (_body: unknown) => undefined),
  toastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "u-1" }),
  useSearchParams: () => mocks.searchParams,
}));

// A user rich enough to populate every gated standing row + the edit form.
const USER = {
  _id: "u-1",
  firstName: "Ada",
  lastName: "Lovelace",
  username: "ada",
  email: "ada@example.com",
  emails: ["ada@example.com"],
  mobile: "+66810000000",
  mobiles: ["+66810000000"],
  fullName: "Ada Lovelace",
  birthdate: "1990-01-01",
  gender: "female",
  streetAddress: "1 Analytical Way",
  city: "London",
  country: "UK",
  zipCode: "SW1",
  creditScore: 720,
  subscriptionPlan: "monthly",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  buyerId: "b-1",
  publisherId: "p-1",
  gogopassActive: true,
  wallet: "0xabc",
};

vi.mock("@/lib/axios/client", () => ({
  fetcher: vi.fn(async () => []),
  fetcherPost: vi.fn(async (args: string | [string, unknown]) => {
    const url = Array.isArray(args) ? args[0] : args;
    if (url.includes("list-check-admin")) {
      return { user: USER, allConversions: [] };
    }
    return {};
  }),
}));

vi.mock("@/lib/api/adminModulesApi", () => ({
  getMembershipUsers: vi.fn(async () => ({
    data: [{ userId: "u-1", tierName: "GoGoPass Plus" }],
  })),
  resolveCashbackRequest: vi.fn(async () => ({})),
}));

vi.mock("react-hot-toast", () => ({
  default: { error: vi.fn(), success: mocks.toastSuccess },
}));

vi.mock("@/lib/api/withdrawUserContactApi", () => ({
  deleteWithdrawUserData: vi.fn(async () => undefined),
  sendWithdrawUserContactOtp: vi.fn(async () => ({})),
  updateWithdrawUserProfile: mocks.updateWithdrawUserProfile,
  verifyWithdrawUserContactOtp: vi.fn(async () => undefined),
}));

// Sibling surfaces that aren't under test: neutralise them so this test
// isolates WithdrawDetail's own inline JSX. UserActiveBenefits is stubbed to a
// probe so the subscription content block's presence is observable.
vi.mock("./UserActiveBenefits", () => ({
  default: () => <div data-testid="user-active-benefits" />,
}));
vi.mock("./MyCashbackProfileSection", () => ({ default: () => null }));
vi.mock("./ModalWithdraw", () => ({ default: () => null }));
vi.mock("./WithdrawDetailLazyGrids", () => ({ default: () => null }));
vi.mock("./WithdrawUserContactEditor", () => ({
  default: ({
    setUserDraft,
  }: {
    setUserDraft: Dispatch<SetStateAction<WithdrawUserEditDraft>>;
  }) => (
    <button
      type="button"
      onClick={() =>
        setUserDraft((draft) => ({
          ...draft,
          emailRows: [
            {
              clientId: "pending-email",
              value: "new@example.com",
              otpVerified: false,
              otpInput: "",
              otpBusy: "idle",
              contactMsg: null,
            },
          ],
        }))
      }
    >
      Add pending email
    </button>
  ),
}));
vi.mock("@/components/wallet/UserWalletPanel", () => ({ default: () => null }));
vi.mock("@/components/wallet/CashbackApprovalNotice", () => ({
  default: () => null,
}));

import WithdrawDetail from "./WithdrawDetail";

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <WithdrawDetail />
    </QueryClientProvider>,
  );
}

const setFlags = (creditScore?: string, gogopass?: string) => {
  vi.stubEnv("NEXT_PUBLIC_ENABLE_CREDIT_SCORE", creditScore);
  vi.stubEnv("NEXT_PUBLIC_ENABLE_GOGOPASS", gogopass);
};

beforeEach(() => {
  mocks.searchParams = new URLSearchParams();
  USER.fullName = "Ada Lovelace";
  mocks.updateWithdrawUserProfile.mockClear();
  mocks.updateWithdrawUserProfile.mockImplementation(async (body: unknown) => {
    if (
      typeof body === "object" &&
      body !== null &&
      "fullName" in body &&
      typeof body.fullName === "string"
    ) {
      USER.fullName = body.fullName;
    }
  });
  mocks.toastSuccess.mockClear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('WithdrawDetail > "Benefits & Scoring" tab gating', () => {
  it("given both flags default-on > then the tab is shown", async () => {
    setFlags(undefined, undefined);
    renderDetail();
    expect(
      await screen.findByRole("button", { name: "Benefits & Scoring" }),
    ).toBeInTheDocument();
  });

  it('given both flags "0" > then the tab is hidden', async () => {
    setFlags("0", "0");
    renderDetail();
    // Wait for the User Info tab to populate (unique identity row), then assert
    // the tab button is gone. ("User Info" itself is ambiguous — it is both a
    // tab label and the section heading.)
    await screen.findByText("First name:");
    expect(
      screen.queryByRole("button", { name: "Benefits & Scoring" }),
    ).toBeNull();
  });

  it("given only credit-score on > then the tab is still shown", async () => {
    setFlags(undefined, "0");
    renderDetail();
    expect(
      await screen.findByRole("button", { name: "Benefits & Scoring" }),
    ).toBeInTheDocument();
  });
});

describe("WithdrawDetail > subscription content block gating", () => {
  it("given ?tab=subscription with GoGoPass on > then the content renders", async () => {
    setFlags("0", undefined);
    mocks.searchParams = new URLSearchParams("tab=subscription");
    renderDetail();
    expect(
      await screen.findByTestId("user-active-benefits"),
    ).toBeInTheDocument();
  });

  it('given ?tab=subscription with both flags "0" > then activeTab falls back to User Info and no subscription content leaks', async () => {
    setFlags("0", "0");
    mocks.searchParams = new URLSearchParams("tab=subscription");
    renderDetail();
    // Fallback: the User Info tab is active (its Part-1 identity row renders).
    await screen.findByText("First name:");
    expect(screen.queryByTestId("user-active-benefits")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Benefits & Scoring" }),
    ).toBeNull();
  });
});

describe("WithdrawDetail > inline standing rows gating", () => {
  it("given credit-score on > then Credit Score and Credit Tier rows are shown", async () => {
    setFlags(undefined, "0");
    renderDetail();
    expect(await screen.findByText("Credit Score:")).toBeInTheDocument();
    expect(screen.getByText("Credit Tier:")).toBeInTheDocument();
  });

  it('given credit-score "0" > then Credit Score and Credit Tier rows are hidden', async () => {
    setFlags("0", undefined);
    renderDetail();
    await screen.findByText("First name:");
    expect(screen.queryByText("Credit Score:")).toBeNull();
    expect(screen.queryByText("Credit Tier:")).toBeNull();
  });

  it("given GoGoPass on > then Membership and Subscription rows are shown", async () => {
    setFlags("0", undefined);
    renderDetail();
    expect(await screen.findByText("Membership:")).toBeInTheDocument();
    expect(screen.getByText("Subscription:")).toBeInTheDocument();
  });

  it('given GoGoPass "0" > then Membership and Subscription rows are hidden', async () => {
    setFlags(undefined, "0");
    renderDetail();
    await screen.findByText("First name:");
    expect(screen.queryByText("Membership:")).toBeNull();
    expect(screen.queryByText("Subscription:")).toBeNull();
  });
});

describe("WithdrawDetail > profile save with pending contact OTP", () => {
  it("saves profile fields while omitting the unverified contact channel", async () => {
    const user = userEvent.setup();
    mocks.searchParams = new URLSearchParams("editUser=1");
    renderDetail();

    const fullName = await screen.findByLabelText("Full name");
    await user.click(screen.getByRole("button", { name: "Add pending email" }));
    expect(
      screen.getByText(/Unverified email changes will not be saved/),
    ).toBeInTheDocument();

    await user.clear(fullName);
    await user.type(fullName, "Ada Byron");
    const saveButton = screen.getByRole("button", { name: "Save changes" });
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    await waitFor(() =>
      expect(mocks.updateWithdrawUserProfile).toHaveBeenCalledTimes(1),
    );
    const payload = mocks.updateWithdrawUserProfile.mock.calls[0][0];
    expect(payload).toMatchObject({
      userId: "u-1",
      fullName: "Ada Byron",
      gender: "female",
      birthdate: "1990-01-01",
      mobiles: ["+66810000000"],
    });
    expect(payload).not.toHaveProperty("emails");
    expect(payload).not.toHaveProperty("wallet");
    expect(payload).not.toHaveProperty("gogopassActive");
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Changes saved. Unverified email changes were not saved.",
    );
    expect(await screen.findByText("Ada Byron")).toBeInTheDocument();
  });
});
