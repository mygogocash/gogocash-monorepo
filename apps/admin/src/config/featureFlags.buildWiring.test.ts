import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Source-pinned build wiring for the pre-launch feature flags.
 *
 * NEXT_PUBLIC_* is inlined by Next at BUILD time, so a flag set to "0" only
 * hides a surface if its value reaches the Next build. Every Docker path that
 * bakes the admin image must therefore:
 *   - declare + export the ARG (Railway injects service variables only into
 *     ARGs the Dockerfile declares), and
 *   - be passed the staging value by the CI / Cloud Build pipelines.
 *
 * Without this a "0" set in Railway or CI never reaches Next and the pre-launch
 * surfaces stay visible in the deployed image. These assertions fail CI if any
 * build path drops a flag. Staging ships the pre-launch surfaces HIDDEN ("0").
 */
const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const read = (relPath: string): string =>
  readFileSync(resolve(REPO_ROOT, relPath), "utf8");

const FLAGS = [
  "NEXT_PUBLIC_ENABLE_CREDIT_SCORE",
  "NEXT_PUBLIC_ENABLE_GOGOPASS",
] as const;

describe("admin Dockerfile declares + exports the pre-launch flag ARGs", () => {
  for (const flag of FLAGS) {
    it(`declares ARG ${flag} and exports it as ENV`, () => {
      const dockerfile = read("apps/admin/Dockerfile");
      expect(dockerfile).toContain(`ARG ${flag}`);
      expect(dockerfile).toContain(`ENV ${flag}=$${flag}`);
    });
  }
});

describe("staging build pipelines pass the pre-launch flags as build args", () => {
  for (const flag of FLAGS) {
    it(`_build-push.yml passes --build-arg ${flag}=0`, () => {
      const workflow = read(".github/workflows/_build-push.yml");
      expect(workflow).toContain(`--build-arg ${flag}=0`);
    });

    it(`cloudbuild/build-staging.yaml passes ${flag}=0`, () => {
      const cloudbuild = read("cloudbuild/build-staging.yaml");
      expect(cloudbuild).toContain(`${flag}=0`);
    });
  }
});

// Firebase App Hosting builds Next.js from source (buildpacks), NOT via
// apps/admin/Dockerfile, so the Dockerfile ARG never reaches it — the flags must
// be declared as BUILD-availability env in apphosting.yaml to be inlined.
describe("Firebase App Hosting inlines the pre-launch flags at build (hidden)", () => {
  for (const flag of FLAGS) {
    it(`apphosting.yaml sets ${flag}="0" with BUILD availability`, () => {
      const apphosting = read("apps/admin/apphosting.yaml");
      expect(apphosting).toMatch(
        new RegExp(`variable:\\s*${flag}\\s*\\n\\s*value:\\s*"0"`),
      );
    });
  }
});

// Railway is the live staging/prod deploy; the value is an operator-set service
// variable (a dashboard action, not in the repo), so we can only pin that the
// operator runbook documents it.
describe("Railway runbook documents hiding the pre-launch surfaces", () => {
  for (const flag of FLAGS) {
    it(`railway-env-matrix.md instructs setting ${flag}=0`, () => {
      const doc = read("docs/railway-env-matrix.md");
      expect(doc).toContain(`${flag}=0`);
    });
  }
});

// KNOWN LIMITATION (see PR discussion): these last three describe blocks assert
// on files OUTSIDE apps/admin/**. This suite runs in the admin vitest job, which
// CI triggers only on apps/admin/** (or root) changes — a PR touching ONLY
// _build-push.yml / cloudbuild/** / docs would not run this guard. It still
// protects the common case (flag/config edits under apps/admin land together).
