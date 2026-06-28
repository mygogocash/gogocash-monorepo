import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const repoRoot = path.resolve(__dirname, "../..");
const seedPath = process.env.E2E_SEED_OUT ?? path.join(repoRoot, ".e2e/seed.json");

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
      name: "backend-desktop",
      testIgnore: [/design-parity\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 2048, height: 1005 },
      },
    },
    {
      name: "backend-mobile",
      testIgnore: [/design-parity\.spec\.ts/],
      use: { ...devices["iPhone 12"] },
    },
    {
      name: "design-parity-desktop",
      testMatch: [/design-parity\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 2048, height: 1005 },
      },
    },
    {
      name: "design-parity-mobile",
      testMatch: [/design-parity\.spec\.ts/],
      use: { ...devices["iPhone 12"] },
    },
  ],
  ...(process.env.MOBILE_PLAYWRIGHT_NO_SERVER
    ? {}
    : {
        webServer: {
          command: "npm run web -- --port 8081 --non-interactive",
          url: "http://127.0.0.1:8081",
          timeout: 180_000,
          reuseExistingServer: !process.env.CI,
          env: {
            EXPO_PUBLIC_API_URL: process.env.E2E_API_URL ?? "http://localhost:8080",
            EXPO_PUBLIC_ACCOUNT_DATA_SOURCE: "backend",
            EXPO_PUBLIC_FRONTEND_URL:
              process.env.MOBILE_PLAYWRIGHT_BASE_URL ?? "http://localhost:8081",
            EXPO_PUBLIC_APP_ENV: "development",
          },
        },
      }),
  metadata: { seedPath },
});
