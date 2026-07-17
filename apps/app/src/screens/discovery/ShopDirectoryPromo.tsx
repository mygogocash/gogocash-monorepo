// Backward-compatible export for callers outside the discovery screens. New code
// should use the target-explicit name so a page cannot silently inherit a fixture.
export {
  SpecificPageBannerCarousel,
  SpecificPageBannerCarousel as ShopDirectoryPromo,
} from "./SpecificPageBannerCarousel";
