import { describe, expect, it } from "vitest";

import {
  isListCheckResponse,
  mapListCheckToWalletTxRows,
} from "@mobile/api/walletTransactions";

const conv = (o: Record<string, unknown>) => ({
  conversion_id: 1,
  offer_name: "Nike",
  payoutNew: 120,
  currency: "THB",
  conversion_status: "approved",
  datetime_conversion: "2026-03-28T00:00:00.000Z",
  ...o,
});

const wd = (o: Record<string, unknown>) => ({
  _id: "w1",
  amount_net: 500,
  currency: "THB",
  status: "pending",
  method: "bank",
  bank_name: "SCB",
  account_number: "1234567890",
  createdAt: "2026-03-26T00:00:00.000Z",
  ...o,
});

describe("isListCheckResponse", () => {
  it("accepts a payload with allConversions or withdrawList arrays", () => {
    expect(isListCheckResponse({ allConversions: [], withdrawList: [] })).toBe(true);
    expect(isListCheckResponse({ allConversions: [conv({})] })).toBe(true);
  });
  it("rejects non-list-check payloads", () => {
    expect(isListCheckResponse(null)).toBe(false);
    expect(isListCheckResponse([])).toBe(false);
    expect(isListCheckResponse({ netAmountTHB: 5 })).toBe(false);
  });
});

describe("mapListCheckToWalletTxRows", () => {
  it("maps an approved earning conversion to a positive earn row", () => {
    const [row] = mapListCheckToWalletTxRows({ allConversions: [conv({})], withdrawList: [] });
    expect(row).toMatchObject({
      kind: "earn",
      brand: "Nike",
      amount: "+120.00",
      currency: "THB",
      status: "success",
      statusLabel: "Success",
      info: "Cashback confirmed",
    });
    expect(row.dateLabel).toContain("2026");
    expect(row.id).toBe("conv-1");
  });

  it("maps a bank withdrawal to a negative withdraw row with a masked account", () => {
    const [row] = mapListCheckToWalletTxRows({ allConversions: [], withdrawList: [wd({})] });
    expect(row).toMatchObject({
      kind: "withdraw",
      amount: "-500.00",
      status: "pending",
      info: "Bank transfer",
    });
    expect(row.brand).toBe("Withdraw to SCB ***7890");
  });

  it('treats method "bank_transfer" (real prod value) as a bank transfer', () => {
    const [row] = mapListCheckToWalletTxRows({
      allConversions: [],
      withdrawList: [wd({ method: "bank_transfer", bank_name: "Kasikornbank", account_number: "0009", amount_net: 80 })],
    });
    expect(row.info).toBe("Bank transfer");
    expect(row.amount).toBe("-80.00");
    expect(row.brand).toBe("Withdraw to Kasikornbank ***0009");
  });

  it("maps statuses: approved/paid→success, pending→pending, rejected→failed", () => {
    const rows = mapListCheckToWalletTxRows({
      allConversions: [
        conv({ conversion_id: 1, conversion_status: "approved", datetime_conversion: "2026-03-05" }),
        conv({ conversion_id: 2, conversion_status: "pending", datetime_conversion: "2026-03-04" }),
        conv({ conversion_id: 3, conversion_status: "rejected", datetime_conversion: "2026-03-03" }),
        conv({ conversion_id: 4, conversion_status: "paid", datetime_conversion: "2026-03-02" }),
      ],
      withdrawList: [],
    });
    expect(rows.map((r) => r.status)).toEqual(["success", "pending", "failed", "success"]);
  });

  it("sorts earnings and withdrawals together, newest first", () => {
    const rows = mapListCheckToWalletTxRows({
      allConversions: [conv({ conversion_id: 9, datetime_conversion: "2026-03-10" })],
      withdrawList: [wd({ _id: "wA", createdAt: "2026-03-20" })],
    });
    expect(rows.map((r) => r.kind)).toEqual(["withdraw", "earn"]);
  });

  it("formats thousands and never emits NaN for missing/garbage amounts", () => {
    const [big] = mapListCheckToWalletTxRows({ allConversions: [conv({ payoutNew: 1234.5 })], withdrawList: [] });
    expect(big.amount).toBe("+1,234.50");
    const [none] = mapListCheckToWalletTxRows({ allConversions: [conv({ payoutNew: undefined, payout: undefined, base_payout: undefined })], withdrawList: [] });
    expect(none.amount).toBe("+0.00");
  });

  it("returns [] for empty, malformed, or non-list-check payloads", () => {
    expect(mapListCheckToWalletTxRows({ allConversions: [], withdrawList: [] })).toEqual([]);
    expect(mapListCheckToWalletTxRows(null)).toEqual([]);
    expect(mapListCheckToWalletTxRows({ netAmountTHB: 5 })).toEqual([]);
  });
});
