// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VerifiedPill } from "./VerifiedPill";

// `globals` is off in vitest.config, so register RTL cleanup explicitly.
afterEach(cleanup);

describe("VerifiedPill", () => {
  it("given verified null > then renders nothing", () => {
    const { container } = render(
      <VerifiedPill verified={null} label="Email" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("given verified true > then shows Verified with a check icon", () => {
    const { container } = render(<VerifiedPill verified label="Email" />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByTitle("Email verified")).toBeInTheDocument();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("given verified false > then shows Unverified", () => {
    render(<VerifiedPill verified={false} label="Phone" />);
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getByTitle("Phone not verified")).toBeInTheDocument();
  });
});
