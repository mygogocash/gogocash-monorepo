import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Source-pin coverage for the admin error-copy sweep (fix/admin-error-copy).
 *
 * These assert the user-facing copy directly in source so a regression that
 * reintroduces a bare/jargon failure string ("Failed", "HTTP Error 403",
 * "Request failed (500)", an env-var name, …) fails CI. Every message must
 * state the problem in plain language AND give a next action.
 */
const SRC_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const read = (relPath: string): string =>
  readFileSync(resolve(SRC_ROOT, relPath), "utf8");

type Pin = { present: string[]; absent: string[] };

const PINS: Record<string, Pin> = {
  "components/subscription/SubscriptionManagement.tsx": {
    present: [
      "Couldn't save the plan. Please try again, or contact an administrator if it continues.",
      "Couldn't load subscriptions. Please refresh the page, or contact an administrator if it continues.",
    ],
    absent: ['toast.error("Failed")', ">Failed to load.<"],
  },
  "components/membership/MembershipManagement.tsx": {
    present: [
      "Couldn't save the membership tier. Please try again, or contact an administrator if it continues.",
      "Couldn't remove the membership tier. Please try again, or contact an administrator if it continues.",
      "Couldn't load members. Please refresh the page, or contact an administrator if it continues.",
    ],
    absent: ['"Save failed"', '"Delete failed"', "Failed to load members."],
  },
  "components/credit-score/UserScoringPanel.tsx": {
    present: [
      "Couldn't save the score override. Please try again, or contact an administrator if it continues.",
    ],
    absent: ['"Override failed"'],
  },
  "components/transaction/TransactionsManagement.tsx": {
    present: [
      "Couldn't export transactions. Please try again, or contact an administrator if it continues.",
    ],
    absent: ['"Export failed"'],
  },
  "components/category/FormCategory.tsx": {
    present: [
      "Couldn't update the category. Please try again, or contact an administrator if it continues.",
    ],
    absent: ['"Category update failed"'],
  },
  "components/banner/FormUpdate.tsx": {
    present: [
      "Couldn't update the banner. Please try again, or contact an administrator if it continues.",
    ],
    absent: ['getApiErrorMessage(err, "Update failed")'],
  },
  "components/policy/PolicyTable.tsx": {
    present: [
      "Couldn't rename the category. Please try again, or contact an administrator if it continues.",
      "Couldn't save your changes. Please try again, or contact an administrator if it continues.",
    ],
    absent: ['"Failed to rename category."', '"Failed to save."'],
  },
  "components/offer/TopBrandManagementPanel.tsx": {
    present: [
      "Couldn't load offers. Please try again.",
      "Couldn't save the top brands. Please try again, or contact an administrator if it continues.",
    ],
    absent: ['"Could not load offers"', '"Could not save top brands."'],
  },
  "components/search-config/SearchConfigManagement.tsx": {
    present: [
      "Couldn't save the search rule. Please try again, or contact an administrator if it continues.",
    ],
    absent: ['"Could not save rule"'],
  },
  "components/coupon/CouponTable.tsx": {
    present: [
      "Couldn't load coupons. Please refresh the page, or contact an administrator if it continues.",
    ],
    absent: ["Request failed (", "`Request failed"],
  },
  "components/withdraw/ManualWithdrawMarkPaid.tsx": {
    present: [
      "Couldn't mark this withdrawal as paid. Please try again, or contact an administrator if it keeps failing.",
      "Enter a valid transaction hash (0x followed by 64 hex characters).",
    ],
    absent: ["on-chain tx hash", '"Failed to mark paid"'],
  },
  "lib/axios/client.ts": {
    present: [
      "Couldn't reach the server. Check your connection and try again.",
      "Something went wrong sending your request. Please try again.",
    ],
    absent: [
      '"No response from server"',
      '"An error occurred while setting up the request"',
    ],
  },
  "app/api/backend/[...path]/route.ts": {
    present: [
      "This service is temporarily unavailable. Please try again later, or contact an administrator if it continues.",
      // Diagnostic detail is preserved server-side for ops, not shown to clients.
      "console.error(",
    ],
    absent: ['"Backend API URL is not configured"'],
  },
};

describe("admin error-copy sweep — source pins", () => {
  for (const [relPath, pin] of Object.entries(PINS)) {
    describe(relPath, () => {
      const source = read(relPath);

      for (const needle of pin.present) {
        it(`contains: ${needle.slice(0, 60)}…`, () => {
          expect(source).toContain(needle);
        });
      }

      for (const needle of pin.absent) {
        it(`no longer contains: ${needle.slice(0, 60)}`, () => {
          expect(source).not.toContain(needle);
        });
      }
    });
  }
});
