import { describe, expect, it } from "vitest";

import { resolveOfferMediaUrl, resolveRemoteImageUri } from "@mobile/api/mediaUrl";

describe("resolveOfferMediaUrl", () => {
  it("given a local-media ref > then returns undefined (admin stream is not customer-fetchable)", () => {
    expect(
      resolveOfferMediaUrl("local-media:brands/logo.png", "https://api-staging.gogocash.co"),
    ).toBeUndefined();
  });

  it("given an absolute https logo > then returns it unchanged", () => {
    expect(
      resolveOfferMediaUrl("https://media-staging.gogocash.co/brands/logo.png"),
    ).toBe("https://media-staging.gogocash.co/brands/logo.png");
  });
});

describe("resolveRemoteImageUri", () => {
  it("given an absolute https URL > then returns it unchanged", () => {
    expect(resolveRemoteImageUri("https://media-staging.gogocash.co/brands/logo.png")).toBe(
      "https://media-staging.gogocash.co/brands/logo.png",
    );
  });

  it("given a root-relative API path and api base > then builds an absolute fetch URL", () => {
    expect(
      resolveRemoteImageUri(
        "/admin/stored-media/stream?ref=local-media%3Abrands%2Flogo.png",
        "https://api-staging.gogocash.co",
      ),
    ).toBe(
      "https://api-staging.gogocash.co/admin/stored-media/stream?ref=local-media%3Abrands%2Flogo.png",
    );
  });

  it("given a root-relative path without api base > then returns the relative path", () => {
    expect(resolveRemoteImageUri("/brands/logo.png")).toBe("/brands/logo.png");
  });

  it("given a legacy drive id > then maps to the public view URL", () => {
    expect(resolveRemoteImageUri("1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh")).toBe(
      "https://drive.google.com/uc?export=view&id=1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh",
    );
  });
});

describe("resolve media urls > given an image width option", () => {
  it("staging media URL > then routes through the Cloudflare image transform", () => {
    expect(
      resolveOfferMediaUrl("https://media-staging.gogocash.co/brands/logo.png", undefined, {
        width: 320,
      }),
    ).toBe(
      "https://media-staging.gogocash.co/cdn-cgi/image/width=320,quality=78,fit=scale-down,format=auto,onerror=redirect/brands/logo.png",
    );
  });

  it("root-relative API path > then stays on the api host untransformed", () => {
    expect(
      resolveRemoteImageUri("/brands/logo.png", "https://api-staging.gogocash.co", {
        width: 320,
      }),
    ).toBe("https://api-staging.gogocash.co/brands/logo.png");
  });

  it("legacy drive id > then keeps the drive URL untransformed", () => {
    expect(
      resolveRemoteImageUri("1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh", undefined, { width: 320 }),
    ).toBe("https://drive.google.com/uc?export=view&id=1wqlSrCi2LQ2Q6NohLnWbtpvbvO17_yKh");
  });

  it("local-media ref > then still resolves to undefined", () => {
    expect(
      resolveOfferMediaUrl("local-media:brands/logo.png", undefined, { width: 320 }),
    ).toBeUndefined();
  });
});
