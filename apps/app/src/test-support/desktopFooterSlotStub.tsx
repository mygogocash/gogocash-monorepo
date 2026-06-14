// Test stub for CustomerDesktopFooterSlot used ONLY by the render-test config.
// The real slot pulls in CustomerDesktopFooter, whose line-16 type alias uses a
// value-position `typeof` ((typeof webDesktopFooter.socialLinks)[number]["icon"])
// that the render config's rolldown/oxc TS-stripping transform mis-tokenizes
// ("Unexpected token 'typeof'") — even though tsc accepts it. The desktop footer
// is presentational chrome irrelevant to component render smoke tests, so we
// render nothing. Never bundled into the app; production source is untouched.
export function CustomerDesktopFooterSlot() {
  return null;
}
