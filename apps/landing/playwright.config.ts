import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT || 3000);
const host = process.env.PLAYWRIGHT_HOST || "127.0.0.1";
const defaultBase = `http://${host}:${port}`;

/**
 * CI / production-like runs: serve `out/` after `next build` (static export).
 * Local: `npm run dev` with reuse if port is already in use.
 */
const serveStaticOut =
  process.env.CI === "true" ||
  process.env.PLAYWRIGHT_SERVE_STATIC === "1";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? defaultBase,
    trace: "on-first-retry",
  },
  projects: [
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 12"] } },
  ],
  webServer: serveStaticOut
    ? {
        command: `npx --yes serve@14 out -l ${port} --no-clipboard`,
        url: defaultBase,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : {
        command: "npm run dev",
        url: defaultBase,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
