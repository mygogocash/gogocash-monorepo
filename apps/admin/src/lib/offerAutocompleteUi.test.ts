import { describe, expect, it } from "vitest";

import {
  mergeAutocompleteTextFieldSlotProps,
  partitionOffersByIdPresence,
  syncAutocompleteSearchInput,
} from "./offerAutocompleteUi";

describe("offerAutocompleteUi", () => {
  it("mergeAutocompleteTextFieldSlotProps > preserves Autocomplete htmlInput props", () => {
    const onChange = () => undefined;
    const params = {
      slotProps: {
        htmlInput: { onChange, role: "combobox" as const },
      },
    };

    const merged = mergeAutocompleteTextFieldSlotProps(
      params as unknown as Parameters<typeof mergeAutocompleteTextFieldSlotProps>[0],
      "Search offers",
    );

    expect(merged.htmlInput?.onChange).toBe(onChange);
    expect(merged.htmlInput?.role).toBe("combobox");
    expect(merged.htmlInput?.["aria-label"]).toBe("Search offers");
  });

  it("syncAutocompleteSearchInput > updates search for input, clear, and reset", () => {
    let search = "old";
    const setSearch = (value: string) => {
      search = value;
    };

    syncAutocompleteSearchInput("input", "Shopee", setSearch);
    expect(search).toBe("Shopee");

    syncAutocompleteSearchInput("clear", "", setSearch);
    expect(search).toBe("");

    syncAutocompleteSearchInput("reset", "Banana", setSearch);
    expect(search).toBe("Banana");

    syncAutocompleteSearchInput("blur", "ignored", setSearch);
    expect(search).toBe("Banana");
  });

  it("partitionOffersByIdPresence > splits available and hidden offers", () => {
    const offers = [
      { _id: "a", name: "A" },
      { _id: "b", name: "B" },
      { _id: "c", name: "C" },
    ];
    const listed = new Set(["b"]);

    expect(partitionOffersByIdPresence(offers, listed)).toEqual({
      available: [
        { _id: "a", name: "A" },
        { _id: "c", name: "C" },
      ],
      hidden: [{ _id: "b", name: "B" }],
    });
  });
});
