import { act, createElement } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";

const fetchFavoriteOfferIds = vi.fn();
const toggleFavoriteOffer = vi.fn();

let isAuthed = true;

vi.mock("@mobile/account/favoriteResource", () => ({
  fetchFavoriteOfferIds: (...args: unknown[]) => fetchFavoriteOfferIds(...args),
  toggleFavoriteOffer: (...args: unknown[]) => toggleFavoriteOffer(...args),
}));

vi.mock("@mobile/config/env", () => ({
  getMobileEnv: () => ({
    accountDataSource: "backend",
    apiUrl: "https://api.test",
    appEnv: "test",
    frontendUrl: "http://localhost:8081",
    posthogHost: "",
    posthogKey: "",
    sentryDsn: "",
  }),
}));

vi.mock("@mobile/auth/useMobileSessionSnapshot", () => ({
  useMobileSessionSnapshot: () => (isAuthed ? { token: "session-token" } : null),
}));

vi.mock("@mobile/auth/sessionValidity", () => ({
  hasUsableMobileSessionToken: () => isAuthed,
}));

async function renderFavoriteBrandsProvider() {
  const { render: renderWithoutHarness } =
    await vi.importActual<typeof import("@testing-library/react")>("@testing-library/react");
  const { FavoriteBrandsProvider, useFavoriteBrands } =
    await import("@mobile/account/FavoriteBrandsProvider");

  function FavoriteProbe() {
    const { favoriteIds, toggleFavorite } = useFavoriteBrands();
    return createElement(
      "div",
      {},
      createElement("span", { "data-testid": "favorite-ids" }, favoriteIds.join(",")),
      createElement(
        "button",
        {
          "data-testid": "toggle-offer-b",
          onClick: () => toggleFavorite("offer-b"),
        },
        "Toggle offer-b",
      ),
    );
  }

  return renderWithoutHarness(
    createElement(FavoriteBrandsProvider, {}, createElement(FavoriteProbe)),
  );
}

describe("FavoriteBrandsProvider stale fetch guard", () => {
  beforeEach(() => {
    isAuthed = true;
    fetchFavoriteOfferIds.mockReset();
    toggleFavoriteOffer.mockReset();
    toggleFavoriteOffer.mockResolvedValue(undefined);
    vi.resetModules();
  });

  it("FavoriteBrandsProvider > given a slow favorites fetch > when user toggles optimistically > then merges the toggle onto the fetched favorites (keeps existing)", async () => {
    // Regression: toggling during the initial fetch used to bump the fetch epoch, so the
    // resolving server favorites were dropped and the user's existing favorites vanished.
    // The optimistic toggle must be MERGED onto the fetched set, not replace it.
    let resolveFetch: ((ids: string[]) => void) | null = null;
    fetchFavoriteOfferIds.mockImplementation(
      () =>
        new Promise<string[]>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { getByTestId } = await renderFavoriteBrandsProvider();

    await act(async () => {
      getByTestId("toggle-offer-b").click();
      await Promise.resolve();
    });

    // Optimistic state before the fetch resolves: only the just-toggled id.
    expect(getByTestId("favorite-ids").textContent).toBe("offer-b");

    await act(async () => {
      resolveFetch?.(["offer-a"]);
      await Promise.resolve();
    });

    // The user's existing server favorite (offer-a) is preserved alongside the optimistic toggle.
    expect(getByTestId("favorite-ids").textContent).toBe("offer-a,offer-b");
  });

  it("FavoriteBrandsProvider > given a slow favorites fetch > when session logs out > then ignores the stale snapshot", async () => {
    let resolveFetch: ((ids: string[]) => void) | null = null;
    fetchFavoriteOfferIds.mockImplementation(
      () =>
        new Promise<string[]>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const { getByTestId, rerender } = await renderFavoriteBrandsProvider();

    isAuthed = false;
    const { FavoriteBrandsProvider, useFavoriteBrands } =
      await import("@mobile/account/FavoriteBrandsProvider");

    function FavoriteProbe() {
      const { favoriteIds } = useFavoriteBrands();
      return createElement("span", { "data-testid": "favorite-ids" }, favoriteIds.join(","));
    }

    await act(async () => {
      rerender(createElement(FavoriteBrandsProvider, {}, createElement(FavoriteProbe)));
      await Promise.resolve();
    });

    expect(getByTestId("favorite-ids").textContent).toBe("");

    await act(async () => {
      resolveFetch?.(["offer-a", "offer-b"]);
      await Promise.resolve();
    });

    expect(getByTestId("favorite-ids").textContent).toBe("");
  });
});
