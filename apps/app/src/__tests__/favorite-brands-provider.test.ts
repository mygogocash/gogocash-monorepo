import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const favoriteProviderSource = readFileSync(
  resolve(__dirname, "../account/FavoriteBrandsProvider.tsx"),
  "utf8",
);

const favoriteResourceSource = readFileSync(
  resolve(__dirname, "../account/favoriteResource.ts"),
  "utf8",
);

describe("FavoriteBrandsProvider auth gating", () => {
  it("FavoriteBrandsProvider > given backend mode > then waits for a usable session before fetching favorites", () => {
    expect(favoriteProviderSource).toContain("useMobileSessionSnapshot");
    expect(favoriteProviderSource).toContain("hasUsableMobileSessionToken");
    expect(favoriteProviderSource).toContain("if (!isAuthed)");
    expect(favoriteProviderSource).toContain("env.accountDataSource === \"backend\" && env.apiUrl && isAuthed");
  });

  it("FavoriteBrandsProvider > given an in-flight favorites fetch > then ignores superseded resolutions and merges optimistic toggles", () => {
    expect(favoriteProviderSource).toContain("let cancelled = false");
    expect(favoriteProviderSource).toContain("if (cancelled || fetchEpoch !== favoritesFetchEpochRef.current)");
    // A toggle during the initial fetch is merged onto the resolved server favorites
    // instead of dropping them by bumping the fetch epoch (the previous regression).
    expect(favoriteProviderSource).toContain("mergePendingFavoriteToggles");
    expect(favoriteProviderSource).toContain("initialFetchInFlightRef");
    expect(favoriteProviderSource).not.toContain("favoritesFetchEpochRef.current += 1");
  });
});

describe("fetchFavoriteOfferIds auth gating", () => {
  it("fetchFavoriteOfferIds > given no usable session > then returns an empty list without calling the API", async () => {
    expect(favoriteResourceSource).toContain("hasUsableMobileSessionToken");
    expect(favoriteResourceSource).toContain("return [];");
  });
});
