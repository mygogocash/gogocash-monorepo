import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Source-pinned build wiring for the pre-launch feature flags.
 *
 * NEXT_PUBLIC_* is inlined by Next at BUILD time, so a flag set to "0" only
 * hides a surface if its value reaches the Next build. Every Docker path that
 * bakes the admin image must therefore declare + export the ARG (Railway injects
 * service variables only into ARGs the Dockerfile declares), and the CI / Cloud
 * Build pipelines must be passed the staging value.
 *
 * History: #573 added this wiring; #574's Node-24→26 auto-merge clobbered it off
 * `main` and — because this guard was clobbered with it — CI stayed green. The
 * ci.yml assertion below keeps the guard running whenever a pinned build file
 * changes, so a future clobber fails CI instead of silently regressing.
 *
 * Staging ships the pre-launch surfaces HIDDEN ("0").
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
// apps/admin/Dockerfile, so the flags must be declared as BUILD-availability env.
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
// variable (a dashboard action), so we pin only that the runbook documents it.
describe("Railway runbook documents hiding the pre-launch surfaces", () => {
  for (const flag of FLAGS) {
    it(`railway-env-matrix.md instructs setting ${flag}=0`, () => {
      const doc = read("docs/railway-env-matrix.md");
      expect(doc).toContain(`${flag}=0`);
    });
  }
});

// The guard above asserts on files OUTSIDE apps/admin/**. The admin vitest job
// (which runs this suite) triggers only on its ci.yml `admin` path filter, so
// those build files must be listed there or a clobber of them would not re-run
// the guard — exactly how #574 regressed unnoticed.
describe("ci.yml admin filter triggers this guard on the pinned build files", () => {
  const PINNED = [
    ".github/workflows/_build-push.yml",
    "cloudbuild/build-staging.yaml",
    "docs/railway-env-matrix.md",
  ];
  for (const path of PINNED) {
    it(`admin path filter includes ${path}`, () => {
      const ci = read(".github/workflows/ci.yml");
      expect(ci).toContain(`'${path}'`);
    });
  }
});

// Doc-trap guard: the documented manual `docker build` commands must show the
// flag build-args, or a human following them ships the surfaces VISIBLE.
describe("manual docker-build docs include the pre-launch build args", () => {
  for (const relPath of ["apps/admin/DEPLOYMENT.md", "apps/admin/README.md"]) {
    it(`${relPath} documents --build-arg NEXT_PUBLIC_ENABLE_CREDIT_SCORE=0`, () => {
      const doc = read(relPath);
      expect(doc).toContain("--build-arg NEXT_PUBLIC_ENABLE_CREDIT_SCORE=0");
    });
  }
});
