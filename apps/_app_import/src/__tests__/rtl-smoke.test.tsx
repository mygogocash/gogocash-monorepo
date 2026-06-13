// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

/**
 * Phase 0 smoke test for the customer-web RTL infra. Twin of the Admin
 * smoke; pins that vitest can mount JSX, run happy-dom, and that
 * @testing-library/react is wired up.
 *
 * Subsequent component tests (`PolicyBannerSection.test.tsx`, etc.) build
 * on the setup this file pins.
 */
describe("rtl-smoke", () => {
  it("given a trivial component > renders text into document", () => {
    render(<div data-testid="smoke">phase 0 ok</div>);
    expect(screen.getByTestId("smoke")).toHaveTextContent("phase 0 ok");
  });
});
