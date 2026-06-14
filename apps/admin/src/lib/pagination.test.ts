import { describe, it, expect } from "vitest";
import { clampPage } from "./pagination";

describe("clampPage", () => {
  it("given a page within range > returns it unchanged", () => {
    expect(clampPage(5, 46)).toBe(5);
    expect(clampPage(1, 46)).toBe(1);
    expect(clampPage(46, 46)).toBe(46);
  });

  it("given a page below 1 > returns 1", () => {
    expect(clampPage(0, 46)).toBe(1);
    expect(clampPage(-3, 46)).toBe(1);
  });

  it("given a page above totalPages > returns totalPages", () => {
    expect(clampPage(99, 46)).toBe(46);
    expect(clampPage(Infinity, 46)).toBe(46);
  });

  it("given a non-integer page > rounds to the nearest integer", () => {
    expect(clampPage(3.7, 46)).toBe(4);
    expect(clampPage(3.2, 46)).toBe(3);
  });

  it("given NaN (e.g. empty/invalid input) > returns 1", () => {
    expect(clampPage(NaN, 46)).toBe(1);
  });

  it("given totalPages < 1 > clamps the maximum to 1", () => {
    expect(clampPage(5, 0)).toBe(1);
    expect(clampPage(1, 0)).toBe(1);
  });
});
