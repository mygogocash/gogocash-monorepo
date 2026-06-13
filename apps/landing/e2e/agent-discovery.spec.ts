import { expect, test } from "@playwright/test";

const DISCOVERY_FILES = [
  {
    path: "/sitemap.md",
    contentType: /markdown|text\/plain/i,
    marker: /# GoGoCash Public Discovery/i,
  },
  {
    path: "/llms.txt",
    contentType: /text\/plain/i,
    marker: /GoGoCash public discovery/i,
  },
  {
    path: "/skills.md",
    contentType: /markdown|text\/plain/i,
    marker: /# GoGoCash Agent Skills/i,
  },
  {
    path: "/rss.xml",
    contentType: /xml|text\/plain/i,
    marker: /<rss version="2\.0"|<title>GoGoCash Learn<\/title>/i,
  },
] as const;

test.describe("agent discovery files", () => {
  for (const file of DISCOVERY_FILES) {
    test(`${file.path} returns 200 with expected discovery content`, async ({
      request,
    }) => {
      const response = await request.get(file.path);

      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"] ?? "").toMatch(
        file.contentType,
      );
      expect(await response.text()).toMatch(file.marker);
    });
  }
});

test("footer exposes the Agents discovery column", async ({ page }) => {
  await page.goto("/learn");

  const footer = page.getByRole("contentinfo");
  await expect(
    footer.getByRole("heading", { name: "Agents", exact: true }),
  ).toBeVisible();

  for (const { label, href } of [
    { label: "sitemap.md", href: "/sitemap.md" },
    { label: "llms.txt", href: "/llms.txt" },
    { label: "skills.md", href: "/skills.md" },
    { label: "rss.xml", href: "/rss.xml" },
  ]) {
    await expect(footer.getByRole("link", { name: label })).toHaveAttribute(
      "href",
      href,
    );
  }
});
