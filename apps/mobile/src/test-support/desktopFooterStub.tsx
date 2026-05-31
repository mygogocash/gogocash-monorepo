// Test stub for CustomerDesktopFooter used ONLY by the render-test config. The
// real component's line-16 type alias uses a value-position `typeof`
// ((typeof webDesktopFooter.socialLinks)[number]["icon"]) that the render config's
// rolldown/oxc TS-stripping transform rejects ("Unexpected token 'typeof'", though
// tsc accepts it). AccountPageShell imports CustomerDesktopFooter DIRECTLY (not via
// CustomerDesktopFooterSlot), so the slot stub doesn't intercept it — this stub
// does, unlocking render coverage for the 14 screens that use AccountPageShell. The
// desktop footer is presentational chrome irrelevant to render smoke tests, so it
// renders nothing. Never bundled into the app.
export function CustomerDesktopFooter() {
  return null;
}
