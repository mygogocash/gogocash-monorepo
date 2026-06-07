import { test, expect, type Page } from "@playwright/test";

const CONSENT_KEY = "gogocash.cookie_consent";
const SPLASH_SEEN_KEY = "gogocash-landing-splash-seen";
const CUSTOMERIO_FORMS_SCRIPT_URL =
  "https://customerioforms.com/assets/forms.js";
const CUSTOMERIO_FORMS_SUBMIT_URL =
  "https://customerioforms.com/custom_forms/submit_snippet";

async function dismissCookieBanner(page: Page) {
  const reject = page.getByRole("button", { name: "Reject non-essential" });
  if (await reject.isVisible().catch(() => false)) {
    await reject.click();
  }
}

test.describe("footer newsletter signup (#10)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(CUSTOMERIO_FORMS_SCRIPT_URL, (route) =>
      route.fulfill({
        contentType: "application/javascript",
        body: `
          document.addEventListener("submit", (event) => {
            if (!(event.target instanceof HTMLFormElement)) return;
            if (event.target.getAttribute("aria-label") !== "Get cashback tips and offers by email") return;
            event.preventDefault();
            fetch("${CUSTOMERIO_FORMS_SUBMIT_URL}", {
              method: "POST",
              body: new FormData(event.target),
            });
          });
        `,
      }),
    );
    await page.route(CUSTOMERIO_FORMS_SUBMIT_URL, (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
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
    await expect(page.locator("script#cio-forms-handler")).toHaveAttribute(
      "data-site-id",
      "527b19a2b583c66362d2",
    );
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
    const customerIoSubmit = page.waitForRequest(
      (request) =>
        request.url() === CUSTOMERIO_FORMS_SUBMIT_URL &&
        request.method() === "POST",
    );
    await expect(submit).toBeEnabled();
    await submit.click();
    await customerIoSubmit;

    await expect(form).toContainText("You're on the list");
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
