import { createElement, type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { IntlProvider } from "react-intl";
import { describe, expect, it } from "vitest";

import { toastErrorMessages } from "@mobile/i18n/toastMessages";
import { ApiError } from "@mobile/api/client";
import { CustomerRouteState } from "@mobile/components/CustomerRouteState";
import { CustomerAccountResourceState } from "@mobile/account/CustomerAccountResourceState";
import type { CustomerAccountResourceResult } from "@mobile/account/customerAccountResource";
import { MESSAGES } from "@mobile/i18n/messages";

// A6 — i18n for non-ready states. The render harness stubs @mobile/i18n/useCopy but NOT react-intl,
// so we mount the RAW components inside our own <IntlProvider locale="th"> with the merged Thai
// catalog (web th + mobile overlay th). This proves the loading/empty/error/offline/unauthenticated
// copy is localized via react-intl formatMessage + ICU {label}, not the old raw-English strings.
function renderTh(node: ReactElement) {
  return render(
    createElement(IntlProvider, { locale: "th", messages: MESSAGES.th }, node),
  );
}

// The English baselines that must NOT appear under th (would mean copy wasn't localized).
const ENGLISH_THAT_MUST_NOT_LEAK = [
  "No activity yet",
  "Nothing is available here yet.",
  "We could not load this page",
  toastErrorMessages.generic,
  "Loading GoGoCash",
  "Preparing your GoGoCash experience.",
  "You are offline",
  "Reconnect to the internet, then try again.",
  "Sign in required",
  "Sign in to continue to this GoGoCash page.",
];

describe("CustomerRouteState i18n (render, th)", () => {
  it("renders Thai (non-English) titles and bodies for every variant", () => {
    for (const variant of [
      "empty",
      "error",
      "loading",
      "offline",
      "unauthenticated",
    ] as const) {
      const { unmount } = renderTh(createElement(CustomerRouteState, { variant }));
      for (const english of ENGLISH_THAT_MUST_NOT_LEAK) {
        expect(
          screen.queryByText(english),
          `variant=${variant} leaked English "${english}" under th`,
        ).toBeNull();
      }
      unmount();
    }
  });

  it("renders the specific Thai loading copy", () => {
    renderTh(createElement(CustomerRouteState, { variant: "loading" }));
    // th of "Loading GoGoCash" / "Preparing your GoGoCash experience."
    expect(screen.getByText("กำลังโหลด GoGoCash")).toBeTruthy();
    expect(screen.getByText("กำลังเตรียมประสบการณ์ GoGoCash ของคุณ")).toBeTruthy();
  });

  it("still honours an explicit title/body override (not localized)", () => {
    renderTh(
      createElement(CustomerRouteState, {
        variant: "empty",
        title: "Custom heading",
        body: "Custom explanatory body.",
      }),
    );
    expect(screen.getByText("Custom heading")).toBeTruthy();
    expect(screen.getByText("Custom explanatory body.")).toBeTruthy();
  });
});

function resourceOf<T>(
  status: CustomerAccountResourceResult<T>["status"],
): CustomerAccountResourceResult<T> {
  // retry exists on error/offline; harmless to attach to all for the test.
  return { status, retry: () => {} } as CustomerAccountResourceResult<T>;
}

describe("CustomerAccountResourceState i18n (render, th)", () => {
  it("interpolates the localized {label} into the loading title/body (wallet -> Thai)", () => {
    renderTh(
      createElement(CustomerAccountResourceState, {
        resource: resourceOf("loading"),
        resourceLabel: "wallet",
      }),
    );
    // th label for "wallet" is "กระเป๋าเงิน"; it appears in both the localized loading
    // title and body, and the raw English template must NOT.
    expect(screen.getAllByText(/กระเป๋าเงิน/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Loading wallet")).toBeNull();
    expect(screen.queryByText("Fetching the latest wallet from GoGoCash.")).toBeNull();
  });

  it("localizes the empty state with the {label} for referral activity", () => {
    renderTh(
      createElement(CustomerAccountResourceState, {
        resource: resourceOf("empty"),
        resourceLabel: "referral activity",
      }),
    );
    // th label for "referral activity" is "กิจกรรมการแนะนำเพื่อน"; it appears in both the
    // localized title and body, so match all occurrences.
    expect(screen.getAllByText(/กิจกรรมการแนะนำเพื่อน/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("No referral activity yet")).toBeNull();
  });

  it("localizes the error state with the {label} for profile", () => {
    renderTh(
      createElement(CustomerAccountResourceState, {
        resource: resourceOf("error"),
        resourceLabel: "profile",
      }),
    );
    // th label for "profile" is "โปรไฟล์"; appears in both the localized title and body.
    expect(screen.getAllByText(/โปรไฟล์/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("We could not load profile")).toBeNull();
  });

  it("localizes the offline state with the {label} for offers", () => {
    renderTh(
      createElement(CustomerAccountResourceState, {
        resource: resourceOf("offline"),
        resourceLabel: "offers",
      }),
    );
    // th label for "offers" is "ข้อเสนอ"; appears in the localized offline body.
    expect(screen.getAllByText(/ข้อเสนอ/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("You are offline")).toBeNull();
  });

  it("localizes the disabled error state (no {label} dependency)", () => {
    renderTh(
      createElement(CustomerAccountResourceState, {
        resource: resourceOf("disabled"),
        resourceLabel: "billing",
      }),
    );
    expect(screen.queryByText("Account data unavailable")).toBeNull();
    expect(
      screen.queryByText(
        "Your account details aren't available right now. Please try again later or contact support.",
      ),
    ).toBeNull();
  });

  it("surfaces the API error message on the error state body", () => {
    renderTh(
      createElement(CustomerAccountResourceState, {
        resource: {
          ...resourceOf("error"),
          error: new ApiError("Fee rate not found", 400),
        },
        resourceLabel: "wallet",
      }),
    );
    expect(screen.getByText("Fee rate not found")).toBeTruthy();
  });
});
