import { describe, it, expect } from "vitest";
import { sortMembers } from "./memberSort";

const rows = [
  { userName: "charlie_lee", startDate: "2026-05-28", status: "active" },
  { userName: "alice_smith", startDate: "2026-06-05", status: "pending" },
  { userName: "bob_jones", startDate: "2026-06-01", status: "cancelled" },
];

describe("sortMembers", () => {
  it("given name-asc > orders userName A–Z", () => {
    expect(sortMembers(rows, "name-asc").map((r) => r.userName)).toEqual([
      "alice_smith",
      "bob_jones",
      "charlie_lee",
    ]);
  });

  it("given name-desc > orders userName Z–A", () => {
    expect(sortMembers(rows, "name-desc").map((r) => r.userName)).toEqual([
      "charlie_lee",
      "bob_jones",
      "alice_smith",
    ]);
  });

  it("given start-desc > orders newest start date first", () => {
    expect(sortMembers(rows, "start-desc").map((r) => r.startDate)).toEqual([
      "2026-06-05",
      "2026-06-01",
      "2026-05-28",
    ]);
  });

  it("given start-asc > orders oldest start date first", () => {
    expect(sortMembers(rows, "start-asc").map((r) => r.startDate)).toEqual([
      "2026-05-28",
      "2026-06-01",
      "2026-06-05",
    ]);
  });

  it("given status > orders status A–Z", () => {
    expect(sortMembers(rows, "status").map((r) => r.status)).toEqual([
      "active",
      "cancelled",
      "pending",
    ]);
  });

  it("does not mutate the input array", () => {
    const original = [...rows];
    sortMembers(rows, "name-desc");
    expect(rows).toEqual(original);
  });
});
