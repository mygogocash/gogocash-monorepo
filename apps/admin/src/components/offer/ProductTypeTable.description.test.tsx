// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProductTypeTable from "./ProductTypeTable";

afterEach(cleanup);

describe("ProductTypeTable product descriptions", () => {
  it("#565 > renders a saved description under its product type name", () => {
    render(
      <ProductTypeTable
        title="Added product type list"
        rows={[
          {
            name: "Books",
            pay_in: "cashback",
            commission_info: "5.6",
            description: "Children / Comics / Manga",
          },
        ]}
        editingIndex={null}
        onReorder={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const row = screen.getByRole("row", { name: /Books/ });
    expect(within(row).getByText("Books")).toBeInTheDocument();
    expect(
      within(row).getByText("Children / Comics / Manga"),
    ).toBeInTheDocument();
  });

  it("#565 > keeps a row without a description compact", () => {
    render(
      <ProductTypeTable
        title="Added product type list"
        rows={[
          {
            name: "Fashion",
            pay_in: "cashback",
            commission_info: "4",
            description: "",
          },
        ]}
        editingIndex={null}
        onReorder={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const nameCell = screen.getByText("Fashion").closest("td");
    expect(nameCell).not.toBeNull();
    expect(nameCell?.querySelector("p")).toBeNull();
  });
});
