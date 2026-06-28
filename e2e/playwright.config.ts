import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");

export default defineConfig({
  testDir: path.join(__dirname, "cross-system"),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: path.join(__dirname, "global-setup.ts"),
  use: {
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  projects: [
    {
      name: "cross-system",
      use: {
        baseURL: process.env.E2E_ADMIN_URL ?? "http://localhost:3000",
      },
    },
  ],
  metadata: { repoRoot },
});
