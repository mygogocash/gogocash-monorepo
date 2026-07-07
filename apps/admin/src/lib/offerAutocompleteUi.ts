import type { AutocompleteRenderInputParams } from "@mui/material/Autocomplete";

/** Above admin modals/drawers so offer pickers stay usable. */
export const OFFER_AUTOCOMPLETE_POPPER_Z = 100002;

export const offerAutocompletePopperSlotProps = {
  popper: {
    sx: { zIndex: OFFER_AUTOCOMPLETE_POPPER_Z },
  },
} as const;

/** Preserve MUI Autocomplete input wiring (onChange, ref, combobox role). */
export function mergeAutocompleteTextFieldSlotProps(
  params: AutocompleteRenderInputParams,
  ariaLabel: string,
) {
  return {
    ...params.slotProps,
    htmlInput: {
      ...params.slotProps?.htmlInput,
      "aria-label": ariaLabel,
    },
  };
}

export function syncAutocompleteSearchInput(
  reason: string,
  value: string,
  setSearch: (value: string) => void,
) {
  if (reason === "input" || reason === "clear" || reason === "reset") {
    setSearch(value);
  }
}

export function partitionOffersByIdPresence<T extends { _id: string }>(
  offers: readonly T[],
  ids: ReadonlySet<string>,
): { available: T[]; hidden: T[] } {
  const available: T[] = [];
  const hidden: T[] = [];
  for (const offer of offers) {
    if (ids.has(offer._id)) {
      hidden.push(offer);
    } else {
      available.push(offer);
    }
  }
  return { available, hidden };
}
