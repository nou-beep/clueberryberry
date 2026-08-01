import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  retries: 0,
  // The dev server compiles routes on first visit, so give navigations and
  // assertions room; these are not indicative of production latency.
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:3105",
    trace: "retain-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /mobile/,
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
    {
      name: "mobile",
      testMatch: /mobile/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3105",
    url: "http://localhost:3105/en",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
