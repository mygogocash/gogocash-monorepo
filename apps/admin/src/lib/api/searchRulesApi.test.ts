import { beforeEach, describe, expect, it, vi } from "vitest";

const mockClient = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/axios/client", () => ({
  default: mockClient,
}));

import {
  deleteSearchRule,
  getSearchRules,
  postSearchRule,
  putSearchRule,
} from "./adminModulesApi";

const rule = {
  id: "507f1f77bcf86cd799439012",
  offer_id: "507f1f77bcf86cd799439011",
  offer_name: "Klook Travel",
  treatment: "pinned" as const,
  keywords: ["travel"],
  weight: 5,
  is_active: true,
  createdAt: "2026-07-15T00:00:00.000Z",
  updatedAt: "2026-07-15T00:00:00.000Z",
};

describe("persistent search rules API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads persisted rules from the unified endpoint", async () => {
    mockClient.get.mockResolvedValue({ data: { data: [rule] } });

    await expect(getSearchRules()).resolves.toEqual([rule]);
    expect(mockClient.get).toHaveBeenCalledWith("/admin/search/rules");
  });

  it("creates a DTO-aligned offer-targeted rule", async () => {
    const input = {
      offer_id: rule.offer_id,
      treatment: rule.treatment,
      keywords: rule.keywords,
      weight: rule.weight,
      is_active: rule.is_active,
    };
    mockClient.post.mockResolvedValue({ data: rule });

    await expect(postSearchRule(input)).resolves.toEqual(rule);
    expect(mockClient.post).toHaveBeenCalledWith("/admin/search/rules", input);
  });

  it("updates and deletes through real rule mutation endpoints", async () => {
    mockClient.put.mockResolvedValue({
      data: { ...rule, treatment: "blocked" },
    });
    mockClient.delete.mockResolvedValue({ data: { success: true } });

    await putSearchRule(rule.id, { treatment: "blocked" });
    await deleteSearchRule(rule.id);

    expect(mockClient.put).toHaveBeenCalledWith(
      `/admin/search/rules/${rule.id}`,
      { treatment: "blocked" },
    );
    expect(mockClient.delete).toHaveBeenCalledWith(
      `/admin/search/rules/${rule.id}`,
    );
  });
});
