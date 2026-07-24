// @vitest-environment happy-dom

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({
  pathname: "/brands",
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => navigation.searchParams,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import OffersManagementTabs, {
  offersManagementTabHref,
} from "./OffersManagementTabs";

describe("issue #611 Brands Management navigation", () => {
  beforeEach(() => {
    navigation.pathname = "/brands";
    navigation.searchParams = new URLSearchParams("tab=top-brands");
  });

  it("builds canonical URLs that clear stale tab state for the Brands list", () => {
    expect(offersManagementTabHref("brands")).toBe("/brands");
    expect(offersManagementTabHref("top-brands")).toBe(
      "/brands?tab=top-brands",
    );
  });

  it("exposes a direct Brands link while Top brands is selected", () => {
    render(<OffersManagementTabs />);

    const tablist = screen.getByRole("tablist", {
      name: "Brands management sections",
    });
    const brandsTab = within(tablist).getByRole("tab", {
      name: /^Brands$/,
    });
    const topBrandsTab = within(tablist).getByRole("tab", {
      name: /^Top brands$/,
    });

    expect(brandsTab.getAttribute("href")).toBe("/brands");
    expect(brandsTab.getAttribute("aria-selected")).toBe("false");
    expect(topBrandsTab.getAttribute("aria-selected")).toBe("true");
  });
});
