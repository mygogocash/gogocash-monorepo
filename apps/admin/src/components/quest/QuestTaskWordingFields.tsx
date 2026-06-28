"use client";

import { useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

import {
  buildQuestWordingOptions,
  defaultQuestTaskWording,
  filterQuestWordingOptions,
  type QuestWordingLocale,
} from "@/lib/questTaskWording";
import { getOfferDisplayName } from "@/lib/offerDisplay";
import type { Offer } from "@/types/api";

const WORDING_AUTOCOMPLETE_POPPER_Z = 100002;

export type QuestTaskWordingValue = {
  wording_en: string;
  wording_th: string;
};

type QuestTaskWordingFieldsProps = {
  idPrefix: string;
  disabled?: boolean;
  offer: Offer | null | undefined;
  value: QuestTaskWordingValue;
  onChange: (next: QuestTaskWordingValue) => void;
};

function WordingAutocomplete({
  id,
  disabled,
  label,
  locale,
  offer,
  value,
  onChange,
}: {
  id: string;
  disabled?: boolean;
  label: string;
  locale: QuestWordingLocale;
  offer: Offer | null | undefined;
  value: string;
  onChange: (next: string) => void;
}) {
  const brandLabel = getOfferDisplayName(offer);
  const [inputValue, setInputValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(value);
  }

  const options = useMemo(
    () => buildQuestWordingOptions(locale, brandLabel),
    [brandLabel, locale],
  );
  const filteredOptions = useMemo(
    () => filterQuestWordingOptions(options, inputValue),
    [inputValue, options],
  );

  return (
    <Autocomplete
      id={id}
      disabled={disabled}
      freeSolo
      options={filteredOptions}
      value={value}
      inputValue={inputValue}
      openOnFocus
      filterOptions={(items) => items}
      noOptionsText="Type to search presets or enter custom wording"
      slotProps={{
        popper: {
          sx: { zIndex: WORDING_AUTOCOMPLETE_POPPER_Z },
        },
      }}
      sx={{ width: "100%" }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={defaultQuestTaskWording(offer, locale)}
          slotProps={{
            htmlInput: {
              maxLength: 140,
            },
          }}
        />
      )}
      onInputChange={(_event, nextValue, reason) => {
        if (reason === "input" || reason === "clear") {
          setInputValue(nextValue);
          onChange(nextValue);
        }
      }}
      onChange={(_event, nextValue) => {
        const resolved = typeof nextValue === "string" ? nextValue : "";
        setInputValue(resolved);
        onChange(resolved);
      }}
    />
  );
}

export function QuestTaskWordingFields({
  idPrefix,
  disabled = false,
  offer,
  value,
  onChange,
}: QuestTaskWordingFieldsProps) {
  return (
    <div className="space-y-3">
      <WordingAutocomplete
        id={`${idPrefix}-wording-en`}
        disabled={disabled}
        label="English"
        locale="en"
        offer={offer}
        value={value.wording_en}
        onChange={(wording_en) => onChange({ ...value, wording_en })}
      />
      <WordingAutocomplete
        id={`${idPrefix}-wording-th`}
        disabled={disabled}
        label="Thai"
        locale="th"
        offer={offer}
        value={value.wording_th}
        onChange={(wording_th) => onChange({ ...value, wording_th })}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Shown on the customer Quest page by language. Search presets or type
        custom copy. Leave blank to use the brand default for that language.
      </p>
    </div>
  );
}
