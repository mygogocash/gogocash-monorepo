import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.MOBILE_PLAYWRIGHT_BASE_URL ?? "http://localhost:8081",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "mobile-web-wide",
      use: { ...devices["Desktop Chrome"], viewport: { width: 2048, height: 1005 } },
    },
    { name: "mobile-web-iphone", use: { ...devices["iPhone 12"] } },
  ],
  ...(process.env.MOBILE_PLAYWRIGHT_NO_SERVER
    ? {}
    : {
        webServer: {
          command: "npm run web -- --port 8081 --non-interactive",
          url: "http://127.0.0.1:8081",
          timeout: 180_000,
          reuseExistingServer: !process.env.CI,
        },
      }),
});
