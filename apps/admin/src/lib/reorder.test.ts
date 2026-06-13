import { describe, it, expect } from "vitest";
import { reorder } from "@/lib/reorder";

describe("reorder > moving an item", () => {
  it("moves the first item to the last position", () => {
    expect(reorder(["A", "B", "C"], 0, 2)).toEqual(["B", "C", "A"]);
  });

  it("moves the last item to the first position", () => {
    expect(reorder(["A", "B", "C"], 2, 0)).toEqual(["C", "A", "B"]);
  });

  it("drops A onto B's slot (adjacent swap forward)", () => {
    expect(reorder(["A", "B", "C"], 0, 1)).toEqual(["B", "A", "C"]);
  });

  it("drops C onto B's slot (adjacent move back)", () => {
    expect(reorder(["A", "B", "C"], 2, 1)).toEqual(["A", "C", "B"]);
  });
});

describe("reorder > no-op and guards", () => {
  it("returns equal contents when from === to", () => {
    expect(reorder(["A", "B", "C"], 1, 1)).toEqual(["A", "B", "C"]);
  });

  it("returns equal contents when an index is out of range", () => {
    expect(reorder(["A", "B", "C"], 0, 5)).toEqual(["A", "B", "C"]);
    expect(reorder(["A", "B", "C"], -1, 1)).toEqual(["A", "B", "C"]);
  });

  it("returns equal contents when an index is NaN or non-integer", () => {
    expect(reorder(["A", "B", "C"], NaN, 1)).toEqual(["A", "B", "C"]);
    expect(reorder(["A", "B", "C"], 0, NaN)).toEqual(["A", "B", "C"]);
    expect(reorder(["A", "B", "C"], 0.5, 2)).toEqual(["A", "B", "C"]);
  });
});

describe("reorder > purity", () => {
  it("does not mutate the input array", () => {
    const input = ["A", "B", "C"];
    const out = reorder(input, 0, 2);
    expect(input).toEqual(["A", "B", "C"]);
    expect(out).not.toBe(input);
  });
});
