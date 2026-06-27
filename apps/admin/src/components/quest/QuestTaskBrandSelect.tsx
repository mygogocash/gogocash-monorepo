"use client";

import { useMemo, useState } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import { useQuery } from "@tanstack/react-query";

import { isActiveGoGoCashOffer } from "@/lib/isActiveGoGoCashOffer";
import {
  brandSearchOptionLabel,
  getOfferDisplayName,
} from "@/lib/offerDisplay";
import { fetchOffersList, offersListQueryKey } from "@/lib/query/offersQueries";
import type { Offer, OffersQuery } from "@/types/api";

const BRAND_AUTOCOMPLETE_POPPER_Z = 100002;

const BASE_OFFERS_QUERY: OffersQuery = {
  search: "",
  limit: 100,
  page: 1,
  country: "",
};

type BrandOption = {
  id: string;
  label: string;
  offer: Offer;
};

type QuestTaskBrandSelectProps = {
  id: string;
  disabled?: boolean;
  selectedOffer: Offer | null | undefined;
  valueOfferId: string;
  onSelect: (offer: Offer) => void;
};

export function QuestTaskBrandSelect({
  id,
  disabled = false,
  selectedOffer,
  valueOfferId,
  onSelect,
}: QuestTaskBrandSelectProps) {
  const [search, setSearch] = useState("");

  const offersQuery = useMemo<OffersQuery>(
    () => ({
      ...BASE_OFFERS_QUERY,
      search: search.trim(),
    }),
    [search],
  );

  const { data: brandOffers, isFetching } = useQuery({
    queryKey: offersListQueryKey(offersQuery),
    queryFn: () => fetchOffersList(offersQuery),
    staleTime: 30_000,
  });

  const options = useMemo(() => {
    const byId = new Map<string, BrandOption>();
    for (const offer of brandOffers?.data ?? []) {
      if (!isActiveGoGoCashOffer(offer)) continue;
      byId.set(offer._id, {
        id: offer._id,
        label: brandSearchOptionLabel(offer),
        offer,
      });
    }
    if (
      selectedOffer &&
      valueOfferId === selectedOffer._id &&
      !byId.has(selectedOffer._id)
    ) {
      byId.set(selectedOffer._id, {
        id: selectedOffer._id,
        label: brandSearchOptionLabel(selectedOffer),
        offer: selectedOffer,
      });
    }
    return Array.from(byId.values()).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [brandOffers?.data, selectedOffer, valueOfferId]);

  const selectedOption =
    options.find((option) => option.id === valueOfferId) ??
    (selectedOffer && valueOfferId === selectedOffer._id
      ? {
          id: selectedOffer._id,
          label: brandSearchOptionLabel(selectedOffer),
          offer: selectedOffer,
        }
      : null);

  return (
    <Autocomplete
      id={id}
      disabled={disabled}
      options={options}
      value={selectedOption}
      inputValue={search}
      loading={isFetching}
      openOnFocus
      filterOptions={(items) => items}
      getOptionLabel={(option) => option.label}
      getOptionKey={(option) => option.id}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      noOptionsText={
        isFetching ? "Loading brands…" : "No active brands found"
      }
      slotProps={{
        popper: {
          sx: { zIndex: BRAND_AUTOCOMPLETE_POPPER_Z },
        },
      }}
      sx={{ width: "100%" }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search active brands…"
          inputProps={{
            ...params.inputProps,
            "aria-label": "Brand",
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key: _key, ...optionProps } = props;
        return (
          <li {...optionProps} key={option.id}>
            <div className="flex min-w-0 flex-col">
              <span className="truncate">{getOfferDisplayName(option.offer)}</span>
              <span className="truncate text-xs text-gray-500">
                {option.label}
              </span>
            </div>
          </li>
        );
      }}
      onInputChange={(_event, value, reason) => {
        if (reason === "input") setSearch(value);
        if (reason === "clear") setSearch("");
      }}
      onChange={(_event, value) => {
        if (!value) return;
        onSelect(value.offer);
        setSearch("");
      }}
    />
  );
}
