// @vitest-environment happy-dom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import CategoryIconPicker from "./CategoryIconPicker";

describe("CategoryIconPicker", () => {
  afterEach(() => {
    cleanup();
  });

  it("selects a built-in icon and updates the preview label", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <CategoryIconPicker value="travel" onChange={onChange} categoryName="Trips" />,
    );

    const group = screen.getByRole("radiogroup", { name: "Category icon" });
    expect(screen.getByText("Selected preview")).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "Travel" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await user.click(within(group).getByRole("radio", { name: "Pets" }));
    expect(onChange).toHaveBeenCalledWith("pets");
  });

  it("moves selection with arrow keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<CategoryIconPicker value="shopping" onChange={onChange} />);

    const group = screen.getByRole("radiogroup", { name: "Category icon" });
    const shopping = within(group).getByRole("radio", { name: "Shopping" });
    shopping.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("travel");
  });

  it("accepts a custom icon file and shows the filename in preview", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onCustomIconChange = vi.fn();

    render(
      <CategoryIconPicker
        value="default"
        onChange={onChange}
        onCustomIconChange={onCustomIconChange}
        customIconPreviewUrl="blob:preview"
        customIconFileName="custom-icon.png"
      />,
    );

    expect(screen.getByText("Custom icon image (optional)")).toBeInTheDocument();
    expect(screen.getAllByText("custom-icon.png").length).toBeGreaterThan(0);

    const file = new File(["icon-bytes"], "pets.png", { type: "image/png" });
    await user.upload(
      screen.getByLabelText("Custom category icon file"),
      file,
    );
    expect(onCustomIconChange).toHaveBeenCalledWith(file);
  });

  it("disables radios and file input when disabled", () => {
    render(
      <CategoryIconPicker
        value="food"
        onChange={() => undefined}
        onCustomIconChange={() => undefined}
        disabled
      />,
    );

    expect(screen.getByRole("radio", { name: "Food" })).toBeDisabled();
    expect(screen.getByLabelText("Custom category icon file")).toBeDisabled();
  });
});
