import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// CustomerReferralScreen pulls in AccountPageShell -> CustomerDesktopHeader ->
// CustomerLocaleRegionControl -> i18n/LocaleProvider, which reaches expo-localization
// (-> expo-modules-core) and the native `expo` global that does not exist under
// happy-dom (`__DEV__ is not defined`). Device locale is not under test, so mock the
// module at the seam — the same pattern the wallet/shop-detail/auth/profile render
// tests use.
vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-US", languageCode: "en" }],
}));

import { FavoriteBrandsProvider } from "@mobile/account/FavoriteBrandsProvider";
import { ToastProvider } from "@mobile/components/Toast";
import { CustomerReferralScreen } from "@mobile/screens/CustomerReferralScreen";

// Wave B (B5 cluster) per-screen UX adoption for the REFERRAL screen (referral
// link + copy/share + invite activity). RENDER suite: it MOUNTS the screen
// (react-native -> react-native-web, happy-dom) to prove it still renders after
// the additive changes, AND reads the screen source to assert a behavior/source
// signal for each applied Wave A foundation.
//
// Applied here (mirroring the sibling B3 wallet / B4 shop-detail screens — all
// backed by useCustomerAccountResource with a real `/point/referral-list` backend
// endpoint + a `retry` refetch):
//   - Toast + success haptic on copy-referral-link, REUSING the existing translated
//     "Copied to clipboard" string (tc reverse-looks it up to the
//     walletTransactionsCopied catalog key -> Thai "คัดลอกแล้ว"), so no new copy.
//   - hitSlop on the icon-only social share buttons (44px is the parity target; the
//     hitSlop guarantees the tap target even where the visual box dips below 44px).
//   - RefreshControl pull-to-refresh on the content scroll area, wired to the
//     resource refetch (referralResource.retry), + a loadingSkeleton passed to the
//     shared CustomerAccountResourceState guard (central B-phase enhancement).
//   - numberOfLines Thai-truncation guards on overflow-prone labels.
// KeyboardAwareScreen is skipped: the referral screen has no text inputs.
const referralSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../screens/CustomerReferralScreen.tsx"),
  "utf8",
);

// Mount inside QueryClientProvider + ToastProvider: useCustomerAccountResource calls
// useQuery unconditionally (same as the wallet/offers screens), and the screen now
// consumes useToast() for copy confirmation — so both providers must wrap the screen,
// exactly as AppProviders supplies them in the real app. The default account data
// source is "fixtures", so the resource resolves to status "ready" and the screen
// renders the referral dashboard.
function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        FavoriteBrandsProvider,
        {},
        createElement(ToastProvider, {}, createElement(CustomerReferralScreen)),
      ),
    ),
  );
}

describe("CustomerReferralScreen (render)", () => {
  it("mounts the referral screen without throwing inside the providers", () => {
    expect(() => renderScreen()).not.toThrow();
  });

  it("renders the referral dashboard when the backend referral list is empty", () => {
    renderScreen();
    expect(screen.getByText("Refer & Earn")).toBeTruthy();
    expect(screen.queryByText("No referral activity yet")).toBeNull();
  });

  it("renders the Refer & Earn card heading + share section", () => {
    renderScreen();
    expect(screen.getByText("Refer & Earn")).toBeTruthy();
    expect(screen.getByText("Share your referral link")).toBeTruthy();
  });

  it("exposes the copy-referral-link control and the four social share buttons", () => {
    renderScreen();
    expect(screen.getByLabelText("Copy referral link")).toBeTruthy();
    expect(screen.getByLabelText("Facebook")).toBeTruthy();
    expect(screen.getByLabelText("LinkedIn")).toBeTruthy();
    expect(screen.getByLabelText("Instagram")).toBeTruthy();
    expect(screen.getByLabelText("X")).toBeTruthy();
  });

  it("renders the Invitation activity section", () => {
    renderScreen();
    expect(screen.getByText("Invitation")).toBeTruthy();
  });

  it("shows a production-domain invite link (not a dev localhost host)", () => {
    renderScreen();
    // The invite link now sits inline after the "invite link :" label on one line, so match a substring.
    // Mirrors the web's origin-based, …-truncated referral URL — not http://localhost:3001/...
    expect(screen.getByText(/gogocash\.co\/\?r…f86cd799439011/)).toBeTruthy();
    expect(screen.queryByText(/localhost/i)).toBeNull();
  });

  it("explore-shop cards: brand-tint monogram art + human favorite labels (no raw i18n key)", () => {
    renderScreen();
    // The heart's accessible name is real copy, not the leaked "favoritePageAddFavorite" key.
    expect(screen.queryByLabelText("favoritePageAddFavorite")).toBeNull();
    expect(screen.getByLabelText("Save brand: Orbit Airways")).toBeTruthy();
    // The banner carries a brand monogram instead of rendering as an empty gray box.
    expect(referralSource).toContain("exploreCardMonogram");
    expect(referralSource).toContain("shop.tint");
    expect(referralSource).not.toContain("favoritePageAddFavorite");
  });

  it("explore-shop cards > given heart press > then toggles via FavoriteBrandsProvider", () => {
    renderScreen();
    expect(referralSource).toContain("useFavoriteBrands");
    const saveButton = screen.getByLabelText("Save brand: Orbit Airways");
    fireEvent.click(saveButton);
    expect(screen.getByLabelText("Remove from saved brands: Orbit Airways")).toBeTruthy();
  });
});

describe("CustomerReferralScreen — Wave B foundations adopted (source signals)", () => {
  it("imports useToast and shows a copy-confirmation toast on copy", () => {
    expect(referralSource).toContain('from "@mobile/hooks/useToast"');
    expect(referralSource).toContain("useToast(");
    expect(referralSource).toContain(".show(");
  });

  it("reuses the existing translated 'Copied to clipboard' string for the toast (no new copy)", () => {
    // tc("Copied to clipboard") reverse-looks-up the walletTransactionsCopied catalog key,
    // which already has a Thai translation — so the toast localizes without a new string.
    expect(referralSource).toContain('tc("Copied to clipboard")');
  });

  it("imports haptics and fires success feedback on copy", () => {
    expect(referralSource).toContain('from "@mobile/lib/haptics"');
    expect(referralSource).toContain("haptics.success(");
  });

  it("gives the icon-only copy/share buttons a hitSlop so the tap target reaches 44px", () => {
    expect(referralSource).toContain("hitSlop=");
  });

  it("adopts pull-to-refresh (RefreshControl wired to the resource refetch)", () => {
    expect(referralSource).toContain("RefreshControl");
    expect(referralSource).toContain("refreshControl=");
    expect(referralSource).toContain(".retry");
  });

  it("does not replace the whole page when referral activity is empty", () => {
    expect(referralSource).toContain("isReferralResourceBlocking");
    expect(referralSource).toContain('referralResource.status === "empty"');
    expect(referralSource).toContain("styles.tableEmptyState");
    expect(referralSource).not.toContain('emptyTitle={tc("No referral activity yet")');
  });

  it("empty invites copy > given tc's English-value lookup > then no raw catalog keys leak", () => {
    // Field bug 2026-07-11: the empty table rendered the literal strings
    // "referralEmptyInvitesTitle/Subtitle" — tc() translates English VALUES
    // via the reverse index, not catalog keys.
    expect(referralSource).not.toContain('tc("referralEmptyInvitesTitle")');
    expect(referralSource).not.toContain('tc("referralEmptyInvitesSubtitle")');
    expect(referralSource).toContain("It's been a while since your last invite.");
    expect(referralSource).toContain("Share with friends and earn rewards together!");
  });

  it("invitation tabs > given three labels on a phone > then normal weight and no ellipsis truncation", () => {
    // Founder feedback 2026-07-11: "All Invitatio…"/"Created Ac…" truncated at
    // bold weight. Tabs are normal weight and may wrap to a second line.
    expect(referralSource).toMatch(/tabText:[\s\S]*?fontWeight: typography\.bodyWeight/);
    expect(referralSource).not.toMatch(/accessibilityRole="tab"[\s\S]*?numberOfLines=\{1\}/);
  });

  it("passes a loadingSkeleton to the shared resource state guard", () => {
    expect(referralSource).toContain("loadingSkeleton=");
  });

  it("uses a white surface — the blue shell/surface was recolored to white", () => {
    expect(referralSource).toContain("referralShell");
    expect(referralSource).not.toContain("referralBlueShell");
    expect(referralSource).not.toContain('backgroundColor: "#DCEEFF"');
  });

  it("premium pass: real brand icons, numbered step cards, reward callout, code chip + copied state", () => {
    // Real brand SVGs replace the f/in/◎/X text glyphs.
    expect(referralSource).toContain("SocialBrandIcons");
    expect(referralSource).toContain("FacebookBrandIcon");
    // How-it-works renders as numbered cards (the flat banner image is gone).
    expect(referralSource).toContain("stepCard");
    expect(referralSource).not.toContain("referralStepBannerImage");
    expect(referralSource).not.toContain("stepsBannerImage");
    // Reward callout + referral code chip + copy "Copied!" micro-interaction.
    expect(referralSource).toContain("rewardPill");
    expect(referralSource).toContain("referralCode");
    expect(referralSource).toContain("setCopied");
  });

  it("invitation tabs are interactive (state-driven) + filter the table, with the focus ring suppressed", () => {
    // Tabs switch via state (not hardcoded index 0) and filter the rows by category, like the web.
    expect(referralSource).toContain("onSelectTab");
    expect(referralSource).toContain("setActiveTab");
    expect(referralSource).toContain("REFERRAL_INVITE_ROWS");
    expect(referralSource).toContain("REFERRAL_TAB_CATEGORIES");
    // The orange browser focus ring is suppressed on the tab buttons (web parity: outline-none).
    expect(referralSource).toContain('outlineColor: "transparent"');
    // No longer hardcoded to the first tab.
    expect(referralSource).not.toContain("selected: index === 0");
  });
});
