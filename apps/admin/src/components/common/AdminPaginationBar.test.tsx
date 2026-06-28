// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminPaginationBar } from "./AdminPaginationBar";

// `globals` is off in vitest.config, so register RTL cleanup explicitly.
afterEach(cleanup);

describe("AdminPaginationBar", () => {
  it("given no onPageSizeChange > then shows a plain summary with no page-size dropdown", () => {
    render(
      <AdminPaginationBar
        page={1}
        totalPages={5}
        total={50}
        limit={10}
        onPageChange={() => {}}
      />,
    );
    expect(
      screen.getByText("Showing 1 to 10 of 50 results"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Rows per page")).not.toBeInTheDocument();
  });

  it("given onPageSizeChange + options > then renders a page-size dropdown reflecting the current limit", () => {
    render(
      <AdminPaginationBar
        page={1}
        totalPages={5}
        total={50}
        limit={10}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        pageSizeOptions={[5, 10, 15, 20]}
      />,
    );
    const select = screen.getByLabelText("Rows per page");
    expect(select).toHaveValue("10");
    [5, 10, 15, 20].forEach((n) =>
      expect(
        screen.getByRole("option", { name: String(n) }),
      ).toBeInTheDocument(),
    );
  });

  it("given jump input not focused > when page prop changes > then syncs pageInput", () => {
    const { rerender } = render(
      <AdminPaginationBar
        page={1}
        totalPages={5}
        total={50}
        limit={10}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("Jump to page")).toHaveValue("1");
    rerender(
      <AdminPaginationBar
        page={3}
        totalPages={5}
        total={50}
        limit={10}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("Jump to page")).toHaveValue("3");
  });

  it("given jump input focused > when page prop changes > then keeps typed value", () => {
    const { rerender } = render(
      <AdminPaginationBar
        page={1}
        totalPages={5}
        total={50}
        limit={10}
        onPageChange={() => {}}
      />,
    );
    const input = screen.getByLabelText("Jump to page");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "4" } });
    rerender(
      <AdminPaginationBar
        page={2}
        totalPages={5}
        total={50}
        limit={10}
        onPageChange={() => {}}
      />,
    );
    expect(input).toHaveValue("4");
  });

  it("given the page size is changed > then calls onPageSizeChange with the new number", () => {
    const onPageSizeChange = vi.fn();
    render(
      <AdminPaginationBar
        page={1}
        totalPages={5}
        total={50}
        limit={10}
        onPageChange={() => {}}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={[5, 10, 15, 20]}
      />,
    );
    fireEvent.change(screen.getByLabelText("Rows per page"), {
      target: { value: "15" },
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(15);
  });
});
