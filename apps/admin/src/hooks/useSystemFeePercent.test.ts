import { describe, expect, it } from "vitest";
import { resolveSystemFeePercent } from "./useSystemFeePercent";
import type { ResponseFee } from "@/types/api";

const feeResponse = (system: unknown): ResponseFee[] =>
  [{ system } as unknown as ResponseFee];

describe("resolveSystemFeePercent", () => {
  it("given a configured system rate > then returns it verbatim (not the fallback)", () => {
    expect(resolveSystemFeePercent(feeResponse(20))).toEqual({
      feePercent: 20,
      isFallback: false,
    });
  });

  it("given a configured rate of 0 > then returns 0 (0 is a valid fee, not an absence)", () => {
    expect(resolveSystemFeePercent(feeResponse(0))).toEqual({
      feePercent: 0,
      isFallback: false,
    });
  });

  it("given no response > then falls back to 30", () => {
    expect(resolveSystemFeePercent(undefined)).toEqual({
      feePercent: 30,
      isFallback: true,
    });
    expect(resolveSystemFeePercent(null)).toEqual({
      feePercent: 30,
      isFallback: true,
    });
  });

  it("given an empty fee list > then falls back to 30", () => {
    expect(resolveSystemFeePercent([])).toEqual({
      feePercent: 30,
      isFallback: true,
    });
  });

  it("given a missing or non-numeric system field > then falls back to 30", () => {
    expect(resolveSystemFeePercent(feeResponse(undefined))).toEqual({
      feePercent: 30,
      isFallback: true,
    });
    expect(resolveSystemFeePercent(feeResponse("20"))).toEqual({
      feePercent: 30,
      isFallback: true,
    });
    expect(resolveSystemFeePercent(feeResponse(NaN))).toEqual({
      feePercent: 30,
      isFallback: true,
    });
  });

  it("given an out-of-range system rate > then falls back to 30 (fee must be in [0, 100))", () => {
    expect(resolveSystemFeePercent(feeResponse(-5))).toEqual({
      feePercent: 30,
      isFallback: true,
    });
    expect(resolveSystemFeePercent(feeResponse(100))).toEqual({
      feePercent: 30,
      isFallback: true,
    });
  });
});
