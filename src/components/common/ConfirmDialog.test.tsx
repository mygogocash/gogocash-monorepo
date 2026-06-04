// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ConfirmDialog from "./ConfirmDialog";

// `globals` is off in vitest.config, so RTL's auto-cleanup isn't registered.
// Clean up between cases to keep tests independent (no leaked DOM nodes).
afterEach(cleanup);

describe("ConfirmDialog", () => {
  it("given isOpen with title and description > then renders both", () => {
    render(
      <ConfirmDialog
        isOpen
        title="Are you sure to remove this item?"
        description="You cannot undo this action later"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.getByText("Are you sure to remove this item?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You cannot undo this action later"),
    ).toBeInTheDocument();
  });

  it("given isOpen false > then renders nothing", () => {
    const { container } = render(
      <ConfirmDialog
        isOpen={false}
        title="Are you sure to remove this item?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.queryByText("Are you sure to remove this item?"),
    ).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("when confirm button clicked > then calls onConfirm once and not onCancel", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="Remove?"
        confirmLabel="Remove"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("when cancel button clicked > then calls onCancel once and not onConfirm", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="Remove?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
