// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CashbackApprovalNotice from "./CashbackApprovalNotice";

// `globals` is off in vitest.config, so register RTL cleanup explicitly.
afterEach(cleanup);

const req = {
  conversion_id: 5551,
  offer_name: "Extra cashback",
  conversion_status: "pending",
  payout: 75,
  affiliate_remarks: "Giveaway",
};

describe("CashbackApprovalNotice", () => {
  it("given no requests > then renders nothing", () => {
    const { container } = render(
      <CashbackApprovalNotice
        requests={[]}
        resolvingId={null}
        onResolve={() => {}}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("given a pending request > then shows its amount and reason", () => {
    render(
      <CashbackApprovalNotice
        requests={[req]}
        resolvingId={null}
        onResolve={() => {}}
      />,
    );
    expect(screen.getByText("75.00 THB")).toBeInTheDocument();
    expect(screen.getByText("Giveaway")).toBeInTheDocument();
  });

  it("given Approve clicked > then calls onResolve with the id and 'approve'", () => {
    const onResolve = vi.fn();
    render(
      <CashbackApprovalNotice
        requests={[req]}
        resolvingId={null}
        onResolve={onResolve}
      />,
    );
    fireEvent.click(screen.getByText("Approve"));
    expect(onResolve).toHaveBeenCalledWith(5551, "approve");
  });

  it("given Reject clicked > then opens the reason modal without resolving yet", () => {
    const onResolve = vi.fn();
    render(
      <CashbackApprovalNotice
        requests={[req]}
        resolvingId={null}
        onResolve={onResolve}
      />,
    );
    fireEvent.click(screen.getByText("Reject"));
    expect(onResolve).not.toHaveBeenCalled();
    expect(
      screen.getByPlaceholderText("Rejection reason (optional)"),
    ).toBeInTheDocument();
  });

  it("given a reason is entered and Confirm clicked > then resolves reject with the reason", () => {
    const onResolve = vi.fn();
    render(
      <CashbackApprovalNotice
        requests={[req]}
        resolvingId={null}
        onResolve={onResolve}
      />,
    );
    fireEvent.click(screen.getByText("Reject"));
    fireEvent.change(
      screen.getByPlaceholderText("Rejection reason (optional)"),
      { target: { value: "Suspected fraud" } },
    );
    fireEvent.click(screen.getByText("Confirm"));
    expect(onResolve).toHaveBeenCalledWith(5551, "reject", "Suspected fraud");
  });

  it("given Confirm clicked with no reason > then resolves reject with undefined", () => {
    const onResolve = vi.fn();
    render(
      <CashbackApprovalNotice
        requests={[req]}
        resolvingId={null}
        onResolve={onResolve}
      />,
    );
    fireEvent.click(screen.getByText("Reject"));
    fireEvent.click(screen.getByText("Confirm"));
    expect(onResolve).toHaveBeenCalledWith(5551, "reject", undefined);
  });

  it("given Cancel clicked in the reject modal > then closes without resolving", () => {
    const onResolve = vi.fn();
    render(
      <CashbackApprovalNotice
        requests={[req]}
        resolvingId={null}
        onResolve={onResolve}
      />,
    );
    fireEvent.click(screen.getByText("Reject"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(onResolve).not.toHaveBeenCalled();
    expect(
      screen.queryByPlaceholderText("Rejection reason (optional)"),
    ).not.toBeInTheDocument();
  });

  it("given a request is resolving > then both buttons are disabled", () => {
    render(
      <CashbackApprovalNotice
        requests={[req]}
        resolvingId={5551}
        onResolve={() => {}}
      />,
    );
    expect(screen.getByText("Approve")).toBeDisabled();
    expect(screen.getByText("Reject")).toBeDisabled();
  });
});
