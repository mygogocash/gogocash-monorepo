import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(process.env.PLAYWRIGHT_NO_SERVER
    ? {}
    : {
        webServer: {
          command: "npm run build && npm run start",
          url: "http://127.0.0.1:3000",
          timeout: 180_000,
          reuseExistingServer: !process.env.CI,
          env: {
            ...process.env,
            SKIP_ENV_VALIDATION: "1",
            NEXTAUTH_SECRET:
              process.env.NEXTAUTH_SECRET ?? "playwright-test-secret-min-32-characters!!",
            // Must match Playwright baseURL so NextAuth session fetch succeeds (otherwise useSession can stay "loading").
            NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "http://127.0.0.1:3000",
          },
        },
      }),
});
