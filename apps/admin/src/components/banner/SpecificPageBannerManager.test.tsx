// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SpecificPageBannerManager from "./SpecificPageBannerManager";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  query: "target=all-shops",
}));

afterEach(cleanup);

vi.mock("next/navigation", () => ({
  usePathname: () => "/banner/all-brand-page",
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueries: () => [
    {
      data: {
        image_1: "brand-slide",
        link_1: "/brand-offer",
        enabled_1: true,
      },
      isLoading: false,
      isError: false,
    },
    {
      data: {
        image_1: "shop-slide",
        link_1: "/shop-offer",
        enabled_1: true,
        start_date_1: "2099-01-01",
      },
      isLoading: false,
      isError: false,
    },
    { data: {}, isLoading: false, isError: false },
  ],
}));

vi.mock("@/lib/axios/client", () => ({ fetcher: vi.fn() }));

vi.mock("./BannerTable", () => ({
  default: ({ surfaceId }: { surfaceId: string }) => (
    <div data-testid="banner-table">{surfaceId}</div>
  ),
}));

describe("SpecificPageBannerManager", () => {
  it("shows the URL-selected target, summary, and customer-page link", () => {
    render(<SpecificPageBannerManager />);

    const allShopsTab = screen.getByRole("tab", { name: /All Shops/i });
    expect(allShopsTab).toHaveAttribute("aria-selected", "true");
    expect(within(allShopsTab).getByText("1/3 configured")).toBeInTheDocument();
    expect(within(allShopsTab).getByText("1 scheduled")).toBeInTheDocument();
    expect(screen.getByTestId("banner-table")).toHaveTextContent("all-shops");
    expect(
      screen.getByRole("link", { name: "View customer page" }),
    ).toHaveAttribute("href", "http://localhost:19006/shops");
  });

  it("writes a shareable target query without losing the compatibility route", () => {
    navigation.push.mockClear();
    render(<SpecificPageBannerManager />);

    fireEvent.click(screen.getByRole("tab", { name: /Product Discovery/i }));

    expect(navigation.push).toHaveBeenCalledWith(
      "/banner/all-brand-page?target=product-discovery",
      { scroll: false },
    );
  });
});
