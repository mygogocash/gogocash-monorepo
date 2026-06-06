// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import NoData from "./NoData";

// `globals` is off in vitest.config, so register RTL cleanup explicitly.
afterEach(cleanup);

describe("NoData", () => {
  it("given no props > then shows the 'No Data' headline", () => {
    render(<NoData />);
    expect(screen.getByText("No Data")).toBeInTheDocument();
  });

  it("given subtext children > then renders them beneath the headline", () => {
    render(<NoData>No tracking links for this user.</NoData>);
    expect(screen.getByText("No Data")).toBeInTheDocument();
    expect(
      screen.getByText("No tracking links for this user."),
    ).toBeInTheDocument();
  });

  it("given a custom title > then overrides the default headline", () => {
    render(<NoData title="Nothing here yet" />);
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.queryByText("No Data")).not.toBeInTheDocument();
  });
});
