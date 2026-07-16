import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SpecificPageBannerCarousel } from "@mobile/screens/discovery/SpecificPageBannerCarousel";

describe("SpecificPageBannerCarousel", () => {
  it("renders a blank-link banner as an image-only slide", () => {
    render(
      <SpecificPageBannerCarousel
        contentWidth={1200}
        isDesktop
        pageTarget="all-shops"
        promo={{
          aspectRatio: 800 / 450,
          title: "Promotion by Brands",
          slides: [
            {
              accessibilityLabel: "All Shops promotion 1",
              id: "all-shops-banner-1",
              imageUri: "https://cdn.example/banner.png",
            },
          ],
        }}
      />,
    );

    expect(screen.getByLabelText("All Shops promotion 1")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });
});
