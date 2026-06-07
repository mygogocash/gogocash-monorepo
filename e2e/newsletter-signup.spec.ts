import { test, expect, type Page } from "@playwright/test";

async function dismissCookieBanner(page: Page) {
  const reject = page.getByRole("button", { name: "Reject non-essential" });
  if (await reject.isVisible().catch(() => false)) {
    await reject.click();
  }
}

test.describe("footer newsletter signup (#10)", () => {
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
