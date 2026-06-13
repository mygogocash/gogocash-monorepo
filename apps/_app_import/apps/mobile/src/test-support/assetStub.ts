// Test stub for static asset imports (png/jpg/svg/etc.) used ONLY by the
// render-test config. rolldown/vitest cannot parse binary assets as modules, so
// the render config aliases every asset extension here. React Native's Image
// `source` accepts an opaque value; tests only assert structure/copy, not pixels.
export default "test-asset-stub";
