// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

/**
 * Phase 0 smoke test. The job of this file is to fail-then-pass when RTL
 * infra is wired up. It is intentionally trivial — its only assertion is
 * that the test runner can mount a React tree and query it.
 *
 * Subsequent component tests (`PolicyTable.test.tsx`, etc.) build on the
 * setup this smoke pins.
 */
describe("rtl-smoke", () => {
  it("given a trivial component > renders text into document", () => {
    render(<div data-testid="smoke">phase 0 ok</div>);
    expect(screen.getByTestId("smoke")).toHaveTextContent("phase 0 ok");
  });
});
