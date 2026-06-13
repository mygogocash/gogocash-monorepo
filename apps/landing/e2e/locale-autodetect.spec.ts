import { test, expect, type Page } from "@playwright/test";
import { AUTO_LOCALE_DONE_KEY, LOCALE_STORAGE_KEY } from "../lib/locale-storage";

/**
 * Init scripts run on every navigation; we only clear locale keys on the first
 * load per tab so multi-step flows (e.g. /ja then /) keep persisted state.
 */
const E2E_LOCALE_CLEAR_ONCE_KEY = "__gogocash_e2e_locale_cleared";

const LOAD = { waitUntil: "load" as const, timeout: 90_000 };
const REDIRECT_TIMEOUT = 25_000;
const STAY_TIMEOUT = 15_000;

type NavigatorPatch = {
  languages: readonly string[];
  language: string;
  userAgent?: string;
};

test.describe("locale auto-detect from /", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ([localeKey, autoKey, onceKey]) => {
        try {
          if (!sessionStorage.getItem(onceKey)) {
            localStorage.removeItem(localeKey);
            localStorage.removeItem(autoKey);
            sessionStorage.setItem(onceKey, "1");
          }
        } catch {
          /* ignore */
        }
      },
      [LOCALE_STORAGE_KEY, AUTO_LOCALE_DONE_KEY, E2E_LOCALE_CLEAR_ONCE_KEY],
    );
  });

  for (const { label, languages, language, path } of [
    { label: "Thai", languages: ["th-TH"], language: "th-TH", path: "/th" },
    { label: "Japanese", languages: ["ja-JP"], language: "ja-JP", path: "/ja" },
    { label: "Indonesian", languages: ["id-ID"], language: "id-ID", path: "/id" },
    {
      label: "Traditional Chinese (Taiwan)",
      languages: ["zh-TW"],
      language: "zh-TW",
      path: "/tw",
    },
    {
      label: "Traditional Chinese (Hong Kong)",
      languages: ["zh-HK"],
      language: "zh-HK",
      path: "/tw",
    },
    {
      label: "Simplified Chinese (China)",
      languages: ["zh-CN"],
      language: "zh-CN",
      path: "/cn",
    },
    {
      label: "Simplified Chinese (Singapore)",
      languages: ["zh-SG"],
      language: "zh-SG",
      path: "/cn",
    },
  ] as const) {
    test(`${label} browser redirects to ${path}`, async ({ page }) => {
      await installNavigatorPatch(page, { languages, language });
      await openHome(page);
      await expect(page).toHaveURL(pathnameEndsWithPattern(path), {
        timeout: REDIRECT_TIMEOUT,
      });
    });
  }

  test("English browser stays on /", async ({ page }) => {
    await installNavigatorPatch(page, { languages: ["en-US"], language: "en-US" });
    await openHome(page);
    await expectRootPathname(page);
  });

  test("bare zh stays on / (ambiguous)", async ({ page }) => {
    await installNavigatorPatch(page, { languages: ["zh"], language: "zh" });
    await openHome(page);
    await expectRootPathname(page);
  });

  test("Googlebot user agent does not redirect from /", async ({ page }) => {
    await installNavigatorPatch(page, {
      languages: ["th-TH"],
      language: "th-TH",
      userAgent:
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    });
    await openHome(page);
    await expectRootPathname(page);
  });

  test("saved locale preference wins over browser hint on /", async ({
    page,
  }) => {
    await page.addInitScript(
      ([localeKey, autoKey, payload]) => {
        localStorage.setItem(localeKey, payload);
        localStorage.removeItem(autoKey);
      },
      [
        LOCALE_STORAGE_KEY,
        AUTO_LOCALE_DONE_KEY,
        JSON.stringify({ lang: "th", region: "TH" }),
      ],
    );
    await installNavigatorPatch(page, { languages: ["ja-JP"], language: "ja-JP" });
    await openHome(page);
    await expectRootPathname(page);
  });

  test("deep link /ja persists locale; revisiting / does not redirect away", async ({
    page,
  }) => {
    await installNavigatorPatch(page, { languages: ["ja-JP"], language: "ja-JP" });
    await page.goto("/ja", LOAD);

    await expect
      .poll(
        () =>
          page.evaluate(
            ([k]) => {
              try {
                const raw = localStorage.getItem(k);
                if (!raw) return null;
                const parsed = JSON.parse(raw) as { lang?: string };
                return parsed.lang ?? null;
              } catch {
                return null;
              }
            },
            [LOCALE_STORAGE_KEY],
          ),
        { timeout: STAY_TIMEOUT },
      )
      .toBe("ja");

    await installNavigatorPatch(page, {
      languages: ["th-TH"],
      language: "th-TH",
    });
    await openHome(page);
    await expectRootPathname(page);
    await openHome(page);
    await expectRootPathname(page);
  });
});

async function installNavigatorPatch(page: Page, patch: NavigatorPatch) {
  await page.addInitScript(
    (p: NavigatorPatch) => {
      Object.defineProperty(navigator, "languages", {
        get: () => p.languages,
        configurable: true,
      });
      Object.defineProperty(navigator, "language", {
        get: () => p.language,
        configurable: true,
      });
      if (p.userAgent !== undefined) {
        Object.defineProperty(navigator, "userAgent", {
          get: () => p.userAgent,
          configurable: true,
        });
      }
    },
    patch,
  );
}

async function openHome(page: Page) {
  await page.goto("/", LOAD);
}

function pathnameEndsWithPattern(path: string): RegExp {
  const segment = path.replace(/^\//, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\/${segment}\\/?(\\?.*)?$`);
}

function normalizedPathname(fullUrl: string): string {
  const path = new URL(fullUrl).pathname.replace(/\/$/, "") || "/";
  return path;
}

async function expectRootPathname(page: Page) {
  await expect
    .poll(() => normalizedPathname(page.url()), { timeout: STAY_TIMEOUT })
    .toBe("/");
}