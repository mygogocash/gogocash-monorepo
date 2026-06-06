import { describe, it, expect } from "vitest";
import { filterMyCashbackByStatus, sortMyCashback } from "./myCashbackList";

type U = {
  id: string;
  banned?: boolean;
  createdAt?: string | Date;
  firstName?: string;
  lastName?: string;
  email?: string;
  balance?: { amount: number }[];
};

const ids = (rows: U[]) => rows.map((u) => u.id);

describe("filterMyCashbackByStatus", () => {
  const users: U[] = [
    { id: "active1", banned: false },
    { id: "banned1", banned: true },
    { id: "active2", banned: false },
  ];

  it("given active > returns only non-banned users", () => {
    expect(ids(filterMyCashbackByStatus(users, "active"))).toEqual([
      "active1",
      "active2",
    ]);
  });

  it("given banned > returns only banned users", () => {
    expect(ids(filterMyCashbackByStatus(users, "banned"))).toEqual(["banned1"]);
  });

  it("given empty status > returns every user", () => {
    expect(ids(filterMyCashbackByStatus(users, ""))).toEqual(ids(users));
  });
});

describe("sortMyCashback", () => {
  it("given newest > orders by createdAt descending", () => {
    const rows: U[] = [
      { id: "old", createdAt: new Date("2023-01-01") },
      { id: "new", createdAt: new Date("2025-01-01") },
      { id: "mid", createdAt: new Date("2024-06-01") },
    ];
    expect(ids(sortMyCashback(rows, "newest"))).toEqual(["new", "mid", "old"]);
  });

  it("given name > orders by full name A–Z, case-insensitively", () => {
    const rows: U[] = [
      { id: "1", firstName: "Bob", lastName: "Zed" },
      { id: "2", firstName: "alice", lastName: "Smith" },
      { id: "3", firstName: "Carol", lastName: "Jones" },
    ];
    expect(ids(sortMyCashback(rows, "name"))).toEqual(["2", "1", "3"]);
  });

  it("given balance > orders by primary balance amount descending", () => {
    const rows: U[] = [
      { id: "low", balance: [{ amount: 100 }] },
      { id: "high", balance: [{ amount: 900 }] },
      { id: "none", balance: [] },
    ];
    expect(ids(sortMyCashback(rows, "balance"))).toEqual([
      "high",
      "low",
      "none",
    ]);
  });

  it("given no sort argument > defaults to newest", () => {
    const rows: U[] = [
      { id: "old", createdAt: new Date("2023-01-01") },
      { id: "new", createdAt: new Date("2025-01-01") },
    ];
    expect(ids(sortMyCashback(rows))).toEqual(["new", "old"]);
  });

  it("given any sort > does not mutate the input array", () => {
    const rows: U[] = [
      { id: "old", createdAt: new Date("2023-01-01") },
      { id: "new", createdAt: new Date("2025-01-01") },
    ];
    sortMyCashback(rows, "newest");
    expect(ids(rows)).toEqual(["old", "new"]);
  });
});
