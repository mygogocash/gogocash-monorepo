import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  buildMediaObjectKey,
  buildR2PublicUrl,
  parseArgs,
  policyMediaUrlHash,
  runOfferMediaSync,
} from "./sync-offer-media-from-manifest.mjs";

const manifest = [
  {
    slug: "acme",
    category: "logo-circle",
    relativePath: "docs/assets/brand-logos/acme/logo-circle/logo.png",
  },
  {
    slug: "acme",
    category: "shop-page-banner",
    relativePath: "docs/assets/brand-logos/acme/shop-page-banner/logo.png",
  },
];

function completeManifest(...slugs) {
  return slugs.flatMap((slug) => [
    {
      slug,
      category: "logo-circle",
      relativePath: `docs/assets/brand-logos/${slug}/logo-circle/logo.png`,
    },
    {
      slug,
      category: "shop-page-banner",
      relativePath: `docs/assets/brand-logos/${slug}/shop-page-banner/logo.png`,
    },
  ]);
}

function offer(patch = {}) {
  return {
    _id: "offer-1",
    offer_name: "Acme",
    lookup_value: "acme_th",
    logo_desktop: "https://legacy.example/logo.png",
    logo_mobile: "https://legacy.example/logo.png",
    logo_circle: "https://legacy.example/cover.png",
    ...patch,
  };
}

function harness({
  offers = [offer()],
  manifestRows = manifest,
  registry = [],
  registryAfterPut,
  registryAfterUpdate,
  updateResult = { matchedCount: 1, modifiedCount: 1 },
} = {}) {
  const events = [];
  const readPaths = [];
  const updates = [];
  const puts = [];
  const offersCollection = {
    find() {
      return {
        project() {
          return {
            async toArray() {
              events.push("offers:read");
              return offers;
            },
          };
        },
      };
    },
    async updateOne(filter, update) {
      events.push("offer:update");
      updates.push({ filter, update });
      return updateResult;
    },
  };
  const registryCollection = {
    find(filter) {
      return {
        async toArray() {
          events.push("registry:read");
          const hashes = new Set(filter.url_hash.$in);
          const source =
            updates.length > 0 && registryAfterUpdate
              ? registryAfterUpdate
              : puts.length > 0 && registryAfterPut
                ? registryAfterPut
                : registry;
          return source.filter((row) => hashes.has(row.url_hash));
        },
      };
    },
  };
  return {
    events,
    readPaths,
    updates,
    puts,
    options: {
      manifest: manifestRows,
      slugFilter: undefined,
      repoRoot: "/repo",
      offersCollection,
      registryCollection,
      readFile: async (absolutePath) => {
        events.push("file:read");
        readPaths.push(absolutePath);
        return Buffer.from(`file:${absolutePath}`);
      },
      publicBaseUrl: "https://media.example",
      putObject: async (entry) => {
        events.push("r2:put");
        puts.push(entry);
      },
      logger: { log() {}, warn() {}, error() {}, table() {} },
    },
  };
}

test("manifest sync defaults to dry-run and rejects conflicting mode flags", () => {
  assert.deepEqual(parseArgs([]), { dryRun: true, slugFilter: undefined });
  assert.deepEqual(parseArgs(["--slug=Acme"]), {
    dryRun: true,
    slugFilter: "acme",
  });
  assert.deepEqual(parseArgs(["--apply"]), {
    dryRun: false,
    slugFilter: undefined,
  });
  assert.throws(
    () => parseArgs(["--apply", "--dry-run"]),
    /either --apply or --dry-run/,
  );
});

test("dry-run performs all safety reads but no Put or database mutation", async () => {
  const h = harness();
  const stats = await runOfferMediaSync({ ...h.options, dryRun: true });

  assert.equal(stats.dryRun, true);
  assert.equal(stats.offersMatched, 1);
  assert.equal(stats.uploadsPlanned, 2);
  assert.equal(h.puts.length, 0);
  assert.equal(h.updates.length, 0);
  assert.equal(h.events.filter((event) => event === "registry:read").length, 2);
});

test("SHEIN and Taobao pairs resolve each offer to its exact normalized slug once", async () => {
  const h = harness({
    manifestRows: completeManifest(
      "shein",
      "shein_global",
      "taobao",
      "taobao_deeplinkable",
    ),
    offers: [
      offer({ _id: "shein-offer", lookup_value: "shein_global_th" }),
      offer({
        _id: "taobao-offer",
        lookup_value: "taobao_deeplinkable_th",
      }),
    ],
  });

  const stats = await runOfferMediaSync({ ...h.options, dryRun: true });

  assert.equal(stats.offersMatched, 2);
  assert.equal(stats.uploadsPlanned, 4);
  assert.equal(stats.fieldUpdatesPlanned, 6);
  assert.equal(h.readPaths.length, 4);
  assert.ok(
    h.readPaths.every(
      (entry) =>
        entry.includes("shein_global") || entry.includes("taobao_deeplinkable"),
    ),
  );
  assert.equal(h.puts.length, 0);
  assert.equal(h.updates.length, 0);
});

for (const { slugFilter, longerSlug, lookupValue } of [
  {
    slugFilter: "shein",
    longerSlug: "shein_global",
    lookupValue: "shein_global_th",
  },
  {
    slugFilter: "taobao",
    longerSlug: "taobao_deeplinkable",
    lookupValue: "taobao_deeplinkable_th",
  },
]) {
  test(`--slug=${slugFilter} leaves the longer ${longerSlug} offer untouched`, async () => {
    const h = harness({
      manifestRows: completeManifest(slugFilter, longerSlug),
      offers: [offer({ lookup_value: lookupValue })],
    });

    const stats = await runOfferMediaSync({
      ...h.options,
      dryRun: false,
      slugFilter,
    });

    assert.equal(stats.offersMatched, 0);
    assert.equal(stats.uploadsPlanned, 0);
    assert.equal(h.puts.length, 0);
    assert.equal(h.updates.length, 0);
  });
}

test("a non-exact lookup selects the unique longest boundary slug", async () => {
  const h = harness({
    manifestRows: completeManifest("shein", "shein_global"),
    offers: [offer({ lookup_value: "shein_global_affiliate_th" })],
  });

  const stats = await runOfferMediaSync({ ...h.options, dryRun: true });

  assert.equal(stats.offersMatched, 1);
  assert.equal(stats.uploadsPlanned, 2);
  assert.ok(h.readPaths.every((entry) => entry.includes("shein_global")));
});

test("an exact raw lookup wins before country-suffix normalization", async () => {
  const h = harness({
    manifestRows: completeManifest("shopee", "shopee_th"),
    offers: [offer({ lookup_value: "shopee_th" })],
  });

  const stats = await runOfferMediaSync({ ...h.options, dryRun: true });

  assert.equal(stats.offersMatched, 1);
  assert.equal(stats.uploadsPlanned, 2);
  assert.ok(h.readPaths.every((entry) => entry.includes("shopee_th")));
});

test("ambiguous normalized manifest slugs fail the complete plan before mutations", async () => {
  const h = harness({
    manifestRows: completeManifest("safe", "Acme", "acme"),
    offers: [
      offer({ _id: "safe-offer", lookup_value: "safe_th" }),
      offer({ _id: "ambiguous-offer", lookup_value: "acme_th" }),
    ],
  });

  await assert.rejects(
    runOfferMediaSync({ ...h.options, dryRun: false }),
    /Ambiguous manifest slugs.*Acme.*acme/,
  );
  assert.equal(h.readPaths.length, 0);
  assert.equal(h.puts.length, 0);
  assert.equal(h.updates.length, 0);
});

test("structured owner proof blocks the whole run before any Put", async () => {
  const h = harness({
    offers: [offer({ logo_asset: { owner_key: "command-1" } })],
  });

  await assert.rejects(
    runOfferMediaSync({ ...h.options, dryRun: false }),
    /has logo_asset; refusing legacy raw replacement/,
  );
  assert.equal(h.puts.length, 0);
  assert.equal(h.updates.length, 0);
});

test("an existing tracked target URL blocks before any Put regardless of state", async () => {
  const url = "https://legacy.example/logo.png";
  const h = harness({
    registry: [
      {
        url_hash: policyMediaUrlHash(url),
        url,
        state: "deleting",
      },
    ],
  });

  await assert.rejects(
    runOfferMediaSync({ ...h.options, dryRun: false }),
    /tracked in policy_media_asset_registry \(deleting\)/,
  );
  assert.equal(h.puts.length, 0);
  assert.equal(h.updates.length, 0);
});

test("a prospective destination URL is registry-checked before its Put", async () => {
  const objectKey = buildMediaObjectKey(
    "brands",
    "acme-logo-circle-logo.png",
    `manifest-${createHash("sha256")
      .update(
        Buffer.from(
          "file:/repo/docs/assets/brand-logos/acme/logo-circle/logo.png",
        ),
      )
      .digest("hex")}`,
  );
  const url = buildR2PublicUrl("https://media.example", objectKey);
  const h = harness({
    registry: [{ url_hash: policyMediaUrlHash(url), url, state: "active" }],
  });

  await assert.rejects(
    runOfferMediaSync({ ...h.options, dryRun: false }),
    /Refusing new legacy media upload/,
  );
  assert.equal(h.puts.length, 0);
  assert.equal(h.updates.length, 0);
  assert.equal(h.events.filter((event) => event === "registry:read").length, 2);
});

test("dry-run rejects active, deleting, and deleted prospective URLs with zero writes", async () => {
  const objectKey = buildMediaObjectKey(
    "brands",
    "acme-logo-circle-logo.png",
    `manifest-${createHash("sha256")
      .update(
        Buffer.from(
          "file:/repo/docs/assets/brand-logos/acme/logo-circle/logo.png",
        ),
      )
      .digest("hex")}`,
  );
  const url = buildR2PublicUrl("https://media.example", objectKey);

  for (const state of ["active", "deleting", "deleted"]) {
    const h = harness({
      registry: [{ url_hash: policyMediaUrlHash(url), url, state }],
    });
    await assert.rejects(
      runOfferMediaSync({ ...h.options, dryRun: true }),
      new RegExp(`tracked.*\\(${state}\\)`),
    );
    assert.equal(
      h.events.filter((event) => event === "registry:read").length,
      2,
    );
    assert.equal(h.puts.length, 0);
    assert.equal(h.updates.length, 0);
  }
});

test("apply replaces only legacy aliases after every safety check and keeps proof absent", async () => {
  const h = harness();
  const stats = await runOfferMediaSync({ ...h.options, dryRun: false });

  assert.equal(stats.offersUpdated, 1);
  assert.equal(stats.uploadsApplied, 2);
  assert.equal(h.puts.length, 2);
  assert.match(h.puts[0].objectKey, /manifest-[a-f0-9]{64}/);
  assert.equal(h.updates.length, 1);
  const firstPut = h.events.indexOf("r2:put");
  assert.equal(
    h.events.slice(0, firstPut).filter((event) => event === "registry:read")
      .length,
    2,
  );
  assert.ok(
    h.events.lastIndexOf("registry:read") < h.events.indexOf("offer:update"),
  );
  assert.deepEqual(h.updates[0].filter.logo_asset, { $exists: false });
  assert.deepEqual(h.updates[0].filter.banner_asset, { $exists: false });
  assert.deepEqual(Object.keys(h.updates[0].update), ["$set"]);
  assert.match(
    h.updates[0].update.$set.logo_desktop,
    /^https:\/\/media\.example\//,
  );
  assert.equal(
    h.updates[0].update.$set.logo_desktop,
    h.updates[0].update.$set.logo_mobile,
  );
});

test("apply retries reuse deterministic content-addressed object keys", async () => {
  const first = harness();
  const retry = harness();
  await runOfferMediaSync({ ...first.options, dryRun: false });
  await runOfferMediaSync({ ...retry.options, dryRun: false });

  assert.deepEqual(
    first.puts.map((entry) => entry.objectKey),
    retry.puts.map((entry) => entry.objectKey),
  );
});

test("a destination tracked during upload blocks the final compare-and-set", async () => {
  const first = harness();
  await runOfferMediaSync({ ...first.options, dryRun: false });
  const destination = first.puts[0].publicUrl;
  const h = harness({
    registryAfterPut: [
      {
        url_hash: policyMediaUrlHash(destination),
        url: destination,
        state: "active",
      },
    ],
  });

  await assert.rejects(
    runOfferMediaSync({ ...h.options, dryRun: false }),
    /Refusing final legacy media replacement/,
  );
  assert.equal(h.puts.length, 2);
  assert.equal(h.updates.length, 0);
});

test("each offer rechecks the registry immediately before its own compare-and-set", async () => {
  const first = harness();
  await runOfferMediaSync({ ...first.options, dryRun: false });
  const destination = first.puts[0].publicUrl;
  const h = harness({
    offers: [offer(), offer({ _id: "offer-2" })],
    registryAfterUpdate: [
      {
        url_hash: policyMediaUrlHash(destination),
        url: destination,
        state: "active",
      },
    ],
  });

  await assert.rejects(
    runOfferMediaSync({ ...h.options, dryRun: false }),
    /Refusing final legacy media replacement/,
  );
  assert.equal(h.updates.length, 1);
});

test("an idempotent rerun accepts a matched no-op compare-and-set", async () => {
  const h = harness({ updateResult: { matchedCount: 1, modifiedCount: 0 } });
  const stats = await runOfferMediaSync({ ...h.options, dryRun: false });
  assert.equal(stats.offersUpdated, 1);
});
