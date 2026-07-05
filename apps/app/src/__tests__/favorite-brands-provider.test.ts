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
});

describe("fetchFavoriteOfferIds auth gating", () => {
  it("fetchFavoriteOfferIds > given no usable session > then returns an empty list without calling the API", async () => {
    expect(favoriteResourceSource).toContain("hasUsableMobileSessionToken");
    expect(favoriteResourceSource).toContain("return [];");
  });
});
