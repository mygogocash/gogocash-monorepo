import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const AUTH_FILE = path.resolve(__dirname, "../../.e2e/admin-storage.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: path.join(__dirname, "e2e/global-setup.ts"),
  use: {
    baseURL: process.env.E2E_ADMIN_URL ?? "http://localhost:3000",
    storageState: AUTH_FILE,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "admin-chrome",
      testIgnore: [/rbac\.spec\.ts/],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "admin-rbac",
      testMatch: [/rbac\.spec\.ts/],
      use: {
        ...devices["Desktop Chrome"],
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
  ...(process.env.ADMIN_PLAYWRIGHT_NO_SERVER
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: "http://127.0.0.1:3000",
          timeout: 120_000,
          reuseExistingServer: !process.env.CI,
          env: {
            NEXT_PUBLIC_API_URL: process.env.E2E_API_URL ?? "http://localhost:8080",
            NEXTAUTH_URL: process.env.E2E_ADMIN_URL ?? "http://localhost:3000",
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-local-nextauth-secret",
            NEXT_PUBLIC_APP_URL: process.env.E2E_APP_URL ?? "http://localhost:8081",
          },
        },
      }),
});
