import { test, expect, type Page } from "@playwright/test";

const CONSENT_KEY = "gogocash.cookie_consent";
const SPLASH_SEEN_KEY = "gogocash-landing-splash-seen";

async function dismissCookieBanner(page: Page) {
  const reject = page.getByRole("button", { name: "Reject non-essential" });
  if (await reject.isVisible().catch(() => false)) {
    await reject.click();
  }
}

test.describe("footer newsletter signup (#10)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      ({ consentKey, splashSeenKey }) => {
        window.localStorage.setItem(
          consentKey,
          JSON.stringify({
            version: 2,
            preferences: { analytics: false, marketing: false },
            decidedAt: "2026-06-07T00:00:00.000Z",
          }),
        );
        window.sessionStorage.setItem(splashSeenKey, "1");
      },
      { consentKey: CONSENT_KEY, splashSeenKey: SPLASH_SEEN_KEY },
    );
  });

  test("renders the secondary email capture with PDPA consent", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "load", timeout: 90_000 });
    await dismissCookieBanner(page);

    const form = page.getByRole("form", {
      name: "Get cashback tips and offers by email",
    });
    await expect(form).toBeVisible();
    await expect(
      form.getByRole("textbox", { name: "Email address" }),
    ).toBeVisible();
    await expect(
      form.getByRole("checkbox", { name: /I agree to receive/ }),
    ).toBeVisible();
  });

  test("enables Subscribe after a valid email and consent", async ({ page }) => {
    await page.goto("/", { waitUntil: "load", timeout: 90_000 });
    await dismissCookieBanner(page);

    const form = page.getByRole("form", {
      name: "Get cashback tips and offers by email",
    });
    const email = form.getByRole("textbox", { name: "Email address" });
    const consent = form.getByRole("checkbox", {
      name: /I agree to receive/,
    });

    await email.fill("reader@example.com");
    await expect(email).toHaveValue("reader@example.com");
    await consent.check();
    await expect(consent).toBeChecked();

    const submit = form.getByRole("button", { name: "Subscribe" });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(form).toContainText("newsletter provider is not connected");
  });

  test("shows a confirmation after a configured provider submit", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "load", timeout: 90_000 });
    await dismissCookieBanner(page);

    const form = page.getByRole("form", {
      name: "Get cashback tips and offers by email",
    });
    test.skip(
      (await form.getAttribute("data-configured")) !== "true",
      "No NEXT_PUBLIC_NEWSLETTER_FORM_ACTION configured for this build",
    );

    await form
      .getByRole("textbox", { name: "Email address" })
      .fill("reader@example.com");
    await form.getByRole("checkbox", { name: /I agree to receive/ }).check();
    await form.getByRole("button", { name: "Subscribe" }).click();

    await expect(form).toContainText("You're on the list");
  });
});
