// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * Component test for the customer-side <PolicyBannerSection>.
 *
 * Mocks the architectural seams (per CLAUDE.md §2.6):
 *   - useCategoryPolicy: our hook that wraps GET /policy/category/:id
 *   - useLocale / useTranslations: next-intl, third-party
 *   - isCategoryPolicyTermsEnabled: env-flag wrapper, ours
 *
 * Asserts the visible behaviour: when the chain produces text, render it;
 * otherwise render nothing.
 */

vi.mock("next-intl", () => ({
  useLocale: vi.fn(() => "th"),
}));

vi.mock("@/lib/env", () => ({
  isCategoryPolicyTermsEnabled: vi.fn(() => true),
}));

// Mock both exports of the hook module. `pickPolicyText` is covered
// thoroughly by useCategoryPolicy.test.ts so here we just assert that the
// component CALLS it with the right inputs and renders the result.
vi.mock("../hooks/useCategoryPolicy", () => ({
  useCategoryPolicy: vi.fn(),
  pickPolicyText: vi.fn(),
}));

import PolicyBannerSection from "./PolicyBannerSection";
import { useCategoryPolicy, pickPolicyText } from "../hooks/useCategoryPolicy";
import { isCategoryPolicyTermsEnabled } from "@/lib/env";
import { useLocale } from "next-intl";

const mockUseCategoryPolicy = vi.mocked(useCategoryPolicy);
const mockPickPolicyText = vi.mocked(pickPolicyText);
const mockEnabled = vi.mocked(isCategoryPolicyTermsEnabled);
const mockUseLocale = vi.mocked(useLocale);

beforeEach(() => {
  vi.clearAllMocks();
  mockEnabled.mockReturnValue(true);
  mockUseLocale.mockReturnValue("th");
  // Default: no resolved text → component renders nothing. Each test that
  // wants visible output overrides this with a return value.
  mockPickPolicyText.mockReturnValue("");
});

describe("PolicyBannerSection", () => {
  it("given pickPolicyText returns text + flag on > renders the text", () => {
    mockUseCategoryPolicy.mockReturnValue({
      data: {
        category_id: "cat-1",
        banner: { primary_locale: "th", translations: { th: "ไทย" } },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockPickPolicyText.mockReturnValue("โปรโมชั่นพิเศษเดือนนี้");
    render(<PolicyBannerSection categoryId="cat-1" />);
    expect(screen.getByText("โปรโมชั่นพิเศษเดือนนี้")).toBeInTheDocument();
  });

  it("given feature flag off > renders nothing AND skips the policy fetch", () => {
    mockEnabled.mockReturnValue(false);
    const { container } = render(<PolicyBannerSection categoryId="cat-1" />);
    expect(container).toBeEmptyDOMElement();
    // Hook still gets called but with null categoryId → soft-fail path,
    // no network request. Asserts the wiring rather than the null result.
    expect(mockUseCategoryPolicy).toHaveBeenCalledWith(null);
  });

  it("given hook returns null policy > renders nothing", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseCategoryPolicy.mockReturnValue({ data: null } as any);
    mockPickPolicyText.mockReturnValue("");
    const { container } = render(<PolicyBannerSection categoryId="cat-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("given pickPolicyText returns empty (no usable translation) > renders nothing", () => {
    mockUseCategoryPolicy.mockReturnValue({
      data: {
        category_id: "cat-1",
        terms: { primary_locale: "th", translations: { th: "ไม่มี banner" } },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockPickPolicyText.mockReturnValue("");
    const { container } = render(<PolicyBannerSection categoryId="cat-1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("given a banner block > calls pickPolicyText with banner + userLocale", () => {
    const banner = { primary_locale: "th", translations: { th: "ไทย" } };
    mockUseCategoryPolicy.mockReturnValue({
      data: { category_id: "cat-1", banner },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseLocale.mockReturnValue("ja");
    mockPickPolicyText.mockReturnValue("ไทย");
    render(<PolicyBannerSection categoryId="cat-1" />);
    expect(mockPickPolicyText).toHaveBeenCalledWith(banner, "ja");
  });
});
