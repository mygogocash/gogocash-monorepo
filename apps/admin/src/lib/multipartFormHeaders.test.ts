import { describe, expect, it } from "vitest";

import {
  MULTIPART_UPLOAD_TIMEOUT_MS,
  multipartPostConfig,
  stripDefaultJsonContentTypeForFormData,
} from "./multipartFormHeaders";

describe("multipartPostConfig", () => {
  it("given no extra config > then returns timeout without Authorization", () => {
    expect(multipartPostConfig()).toEqual({
      timeout: MULTIPART_UPLOAD_TIMEOUT_MS,
      headers: {},
    });
  });

  it("given extra config > then merges timeout override and headers", () => {
    expect(
      multipartPostConfig({ timeout: 30_000, headers: { "X-Test": "1" } }),
    ).toEqual({
      timeout: 30_000,
      headers: {
        "X-Test": "1",
      },
    });
  });
});

describe("stripDefaultJsonContentTypeForFormData", () => {
  it("given FormData payload > then removes default JSON Content-Type headers", () => {
    const headers: Record<string, unknown> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    const formData = new FormData();
    formData.append(
      "image_1",
      new File(["x"], "banner.png", { type: "image/png" }),
    );

    stripDefaultJsonContentTypeForFormData(headers, formData);

    expect(headers).toEqual({ Accept: "application/json" });
    expect(headers).not.toHaveProperty("Content-Type");
    expect(headers).not.toHaveProperty("content-type");
  });

  it("given non-FormData payload > then leaves headers unchanged", () => {
    const headers = { "Content-Type": "application/json" };

    stripDefaultJsonContentTypeForFormData(headers, { link_1: "/promo" });

    expect(headers).toEqual({ "Content-Type": "application/json" });
  });

  it("given FormData and AxiosHeaders-like object > then removes Content-Type via delete()", () => {
    const store = new Map<string, string>([
      ["Content-Type", "application/json"],
      ["Accept", "application/json"],
    ]);
    const headers = {
      delete: (name: string) => store.delete(name),
      get: (name: string) => store.get(name),
    };
    const formData = new FormData();
    formData.append("link_1", "https://example.com");

    stripDefaultJsonContentTypeForFormData(
      headers as unknown as Record<string, unknown>,
      formData,
    );

    expect(store.has("Content-Type")).toBe(false);
    expect(store.get("Accept")).toBe("application/json");
  });

  it("given FormData and AxiosHeaders with setContentType > then disables Content-Type", () => {
    let contentType: false | string | null | undefined = "application/json";
    const headers = {
      setContentType: (value: false | string | null | undefined) => {
        contentType = value;
      },
      getContentType: () => contentType,
    };
    const formData = new FormData();
    formData.append(
      "image_1",
      new File(["x"], "banner.png", { type: "image/png" }),
    );

    stripDefaultJsonContentTypeForFormData(
      headers as unknown as Record<string, unknown>,
      formData,
    );

    expect(contentType).toBe(false);
  });
});
