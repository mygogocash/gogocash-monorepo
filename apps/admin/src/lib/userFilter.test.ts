import { describe, it, expect } from "vitest";
import { filterUsers } from "./userFilter";

type U = {
  id: string;
  creditScore?: number;
  membershipTier?: string;
  subscriptionPlan?: string;
};

// Tiers via tierFromScore: <300 bronze, 300–599 silver, 600–799 gold, ≥800 platinum.
const users: U[] = [
  { id: "bronze", creditScore: 250, membershipTier: "Basic" },
  {
    id: "silver",
    creditScore: 500,
    membershipTier: "Basic",
    subscriptionPlan: "Monthly Premium",
  },
  {
    id: "gold",
    creditScore: 700,
    membershipTier: "GoGoPass Plus",
    subscriptionPlan: "Annual Premium",
  },
  {
    id: "platinum",
    creditScore: 850,
    membershipTier: "GoGoPass Plus",
    subscriptionPlan: "Monthly Premium",
  },
  { id: "noscore", membershipTier: "Basic" },
];

const ids = (rows: U[]) => rows.map((u) => u.id);

describe("filterUsers", () => {
  it("given tier gold > returns only users whose score maps to gold", () => {
    expect(ids(filterUsers(users, { tier: "gold" }))).toEqual(["gold"]);
  });

  it("given tier platinum > returns only platinum-tier users", () => {
    expect(ids(filterUsers(users, { tier: "platinum" }))).toEqual(["platinum"]);
  });

  it("given membership > returns only users with that membership tier", () => {
    expect(ids(filterUsers(users, { membership: "GoGoPass Plus" }))).toEqual([
      "gold",
      "platinum",
    ]);
  });

  it("given subscription monthly > returns only Monthly Premium users", () => {
    expect(ids(filterUsers(users, { subscription: "monthly" }))).toEqual([
      "silver",
      "platinum",
    ]);
  });

  it("given subscription annual > returns only Annual Premium users", () => {
    expect(ids(filterUsers(users, { subscription: "annual" }))).toEqual([
      "gold",
    ]);
  });

  it("given subscription none > returns only users without a plan", () => {
    expect(ids(filterUsers(users, { subscription: "none" }))).toEqual([
      "bronze",
      "noscore",
    ]);
  });

  it("given no filters > returns every user unchanged", () => {
    expect(ids(filterUsers(users, {}))).toEqual(ids(users));
  });

  it("given multiple filters > applies them together (AND)", () => {
    expect(
      ids(
        filterUsers(users, {
          membership: "GoGoPass Plus",
          subscription: "monthly",
        }),
      ),
    ).toEqual(["platinum"]);
  });

  it("given any filter > does not mutate the input array", () => {
    const input = [...users];
    filterUsers(input, { tier: "gold" });
    expect(ids(input)).toEqual(ids(users));
  });
});
