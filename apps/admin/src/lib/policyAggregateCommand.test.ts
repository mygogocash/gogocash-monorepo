import { describe, expect, it } from "vitest";

import {
  buildPolicyAggregateFormData,
  policyAggregateSignature,
} from "./policyAggregateCommand";

const policy = {
  category_id: "507f1f77bcf86cd799439011",
  terms: {
    primary_locale: "th",
    translations: { th: "ข้อกำหนด" },
    content_source: "custom" as const,
    template_id: null,
  },
  banner: {
    primary_locale: "th",
    translations: { th: "ข้อความแบนเนอร์" },
    content_source: "custom" as const,
    template_id: null,
  },
};

describe("policy aggregate command", () => {
  it("builds one multipart command with category, policy text, icon, and optional Default banner", () => {
    const defaultBanner = new File(["banner"], "default.png", {
      type: "image/png",
    });
    const form = buildPolicyAggregateFormData({
      requestKey: "policy-save-1",
      categoryId: policy.category_id,
      categoryName: "  Travel   Deals  ",
      iconKey: "travel",
      policy,
      defaultBanner,
    });

    expect(form.get("request_key")).toBe("policy-save-1");
    expect(form.get("category_id")).toBe(policy.category_id);
    expect(form.get("category_name")).toBe("Travel Deals");
    expect(form.get("icon_key")).toBe("travel");
    expect(JSON.parse(String(form.get("policy")))).toEqual(policy);
    expect(form.get("default_banner")).toBe(defaultBanner);
    expect([...form.keys()].filter((key) => key.includes("banner"))).toEqual([
      "default_banner",
    ]);
  });

  it("changes the retry signature when any persisted field or file identity changes", async () => {
    const base = {
      categoryId: undefined,
      categoryName: "Travel Deals",
      iconKey: "travel" as const,
      policy: { ...policy, category_id: "__new__" },
      defaultBanner: new File(["banner"], "one.png", { type: "image/png" }),
    };

    expect(await policyAggregateSignature(base)).toBe(
      await policyAggregateSignature({ ...base }),
    );
    expect(await policyAggregateSignature(base)).not.toBe(
      await policyAggregateSignature({ ...base, iconKey: "food" }),
    );
    expect(await policyAggregateSignature(base)).not.toBe(
      await policyAggregateSignature({
        ...base,
        defaultBanner: new File(["banner"], "two.png", {
          type: "image/png",
        }),
      }),
    );
  });

  it("distinguishes different bytes even when File metadata is identical", async () => {
    const fileOptions = {
      type: "image/png",
      lastModified: 1_700_000_000_000,
    };
    const base = {
      categoryId: undefined,
      categoryName: "Travel Deals",
      iconKey: "travel" as const,
      policy: { ...policy, category_id: "__new__" },
      defaultBanner: new File(["aaaa"], "same.png", fileOptions),
    };
    const changed = {
      ...base,
      defaultBanner: new File(["bbbb"], "same.png", fileOptions),
    };
    expect(base.defaultBanner.size).toBe(changed.defaultBanner.size);
    expect(await policyAggregateSignature(base)).not.toBe(
      await policyAggregateSignature(changed),
    );
  });
});
