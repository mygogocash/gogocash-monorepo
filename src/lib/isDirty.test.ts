import { describe, it, expect } from "vitest";
import { deepEqual, isDirty } from "./isDirty";

describe("deepEqual", () => {
  it("given primitives > compares by value", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual("a", "b")).toBe(false);
    expect(deepEqual(1, "1")).toBe(false);
  });

  it("given objects with same entries in different key order > are equal", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("given nested objects and arrays > compares deeply", () => {
    expect(deepEqual({ a: [1, { x: 2 }] }, { a: [1, { x: 2 }] })).toBe(true);
    expect(deepEqual({ a: [1, { x: 2 }] }, { a: [1, { x: 3 }] })).toBe(false);
  });

  it("given different array length or object keys > not equal", () => {
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("given null/undefined > handled without throwing", () => {
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual(undefined, undefined)).toBe(true);
  });
});

describe("isDirty", () => {
  it("given current equals initial > then not dirty (Save stays disabled)", () => {
    expect(
      isDirty({ amount: "", reason: "" }, { amount: "", reason: "" }),
    ).toBe(false);
  });

  it("given a field changed > then dirty (Save enables)", () => {
    expect(
      isDirty({ amount: "10", reason: "" }, { amount: "", reason: "" }),
    ).toBe(true);
  });
});
