// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import Label from "./Label";

afterEach(cleanup);

describe("Label required marker", () => {
  it("given required > then renders a visible asterisk marked aria-hidden", () => {
    render(
      <Label htmlFor="quest-start" required>
        Start date
      </Label>,
    );

    const marker = screen.getByText("*");
    expect(marker).toBeInTheDocument();
    expect(marker).toHaveAttribute("aria-hidden", "true");
  });

  it("given required > then exposes an accessible (required) hint not tied to the glyph", () => {
    render(
      <Label htmlFor="quest-start" required>
        Start date
      </Label>,
    );

    expect(screen.getByText("(required)")).toBeInTheDocument();
  });

  it("given no required prop > then renders no asterisk", () => {
    render(<Label htmlFor="quest-status">Status</Label>);

    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });
});
