import { describe, it, expect } from "vitest";
import { sortUsers } from "./userSort";
import type { RegularUser } from "@/types/api";

/** Minimal RegularUser factory — only the fields the sort cares about vary. */
const mk = (over: Partial<RegularUser>): RegularUser => ({
  _id: "x",
  address: "",
  __v: 0,
  email: "e@x.co",
  id_crossmint: "",
  id_twitter: "",
  username: "user",
  id_firebase: "",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  birthdate: null,
  country: null,
  gender: null,
  ...over,
});

describe("sortUsers", () => {
  it("given newest > orders by createdAt descending (newest first)", () => {
    const old = mk({ _id: "old", createdAt: new Date("2023-01-01") });
    const recent = mk({ _id: "new", createdAt: new Date("2025-01-01") });
    const mid = mk({ _id: "mid", createdAt: new Date("2024-06-01") });
    expect(sortUsers([old, recent, mid], "newest").map((u) => u._id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
  });

  it("given name > orders by username A–Z, case-insensitively", () => {
    const bob = mk({ _id: "1", username: "bob" });
    const alice = mk({ _id: "2", username: "Alice" });
    const charlie = mk({ _id: "3", username: "charlie" });
    expect(sortUsers([bob, alice, charlie], "name").map((u) => u._id)).toEqual([
      "2",
      "1",
      "3",
    ]);
  });

  it("given tier > orders by creditScore descending, users without a score last", () => {
    const low = mk({ _id: "low", creditScore: 300 });
    const high = mk({ _id: "high", creditScore: 800 });
    const none = mk({ _id: "none", creditScore: undefined });
    expect(sortUsers([low, high, none], "tier").map((u) => u._id)).toEqual([
      "high",
      "low",
      "none",
    ]);
  });

  it("given membership > orders GoGoPass Plus before Basic before none", () => {
    const basic = mk({ _id: "basic", membershipTier: "Basic" });
    const plus = mk({ _id: "plus", membershipTier: "GoGoPass Plus" });
    const none = mk({ _id: "none", membershipTier: undefined });
    expect(
      sortUsers([basic, plus, none], "membership").map((u) => u._id),
    ).toEqual(["plus", "basic", "none"]);
  });

  it("given no sort argument > defaults to newest", () => {
    const old = mk({ _id: "old", createdAt: new Date("2023-01-01") });
    const recent = mk({ _id: "new", createdAt: new Date("2025-01-01") });
    expect(sortUsers([old, recent]).map((u) => u._id)).toEqual(["new", "old"]);
  });

  it("given any sort > does not mutate the input array", () => {
    const old = mk({ _id: "old", createdAt: new Date("2023-01-01") });
    const recent = mk({ _id: "new", createdAt: new Date("2025-01-01") });
    const input = [old, recent];
    sortUsers(input, "newest");
    expect(input.map((u) => u._id)).toEqual(["old", "new"]);
  });
});
