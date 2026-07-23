import { describe, expect, it } from "vitest";

import {
  assertWebExportEnv,
  findWebExportEnvProblems,
  HOSTED_BUILD_ENV_NAME,
} from "../../scripts/webExportEnvGuard.mjs";

/**
 * The exact config that shipped to beta.gogocash.co and broke it: the export ran
 * without EXPO_PUBLIC_API_URL / EXPO_PUBLIC_FRONTEND_URL, fell back to
 * envDefaults, and went live pointing at the staging API from the beta origin.
 */
const BROKEN_BETA_BUILD = {
  EXPO_PUBLIC_ACCOUNT_DATA_SOURCE: "backend",
  [HOSTED_BUILD_ENV_NAME]: "1",
} as Record<string, string>;

const CORRECT_BETA_BUILD = {
  EXPO_PUBLIC_ACCOUNT_DATA_SOURCE: "backend",
  EXPO_PUBLIC_API_URL: "https://api-beta.gogocash.co",
  EXPO_PUBLIC_APP_ENV: "staging",
  EXPO_PUBLIC_FRONTEND_URL: "https://beta.gogocash.co",
  [HOSTED_BUILD_ENV_NAME]: "1",
} as Record<string, string>;

describe("web export env guard", () => {
  it("given the env that broke beta > refuses the build", () => {
    expect(() => assertWebExportEnv(BROKEN_BETA_BUILD)).toThrowError(
      /EXPO_PUBLIC_API_URL is not set/,
    );
  });

  it("given a correct beta build > allows the export", () => {
    expect(() => assertWebExportEnv(CORRECT_BETA_BUILD)).not.toThrow();
  });

  it("given a beta frontend pointed at the staging API > refuses the build", () => {
    const problems = findWebExportEnvProblems({
      EXPO_PUBLIC_API_URL: "https://api-staging.gogocash.co",
      EXPO_PUBLIC_FRONTEND_URL: "https://beta.gogocash.co",
    });

    expect(problems.join(" ")).toMatch(/cross-origin/);
  });

  it("given a genuine staging build > allows staging URLs together", () => {
    expect(
      findWebExportEnvProblems({
        EXPO_PUBLIC_API_URL: "https://api-staging.gogocash.co",
        EXPO_PUBLIC_FRONTEND_URL: "https://app-staging.gogocash.co",
      }),
    ).toEqual([]);
  });

  it("given a local export > stays out of the way", () => {
    // No hosted marker: `expo start` / a local export must keep working with the
    // envDefaults fallback and no env file.
    expect(() => assertWebExportEnv({} as Record<string, string>)).not.toThrow();
  });
});
