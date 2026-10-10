// Browser tests (test/browser/), in every engine: happy-dom proves the
// structure; these prove real inputs, real events and real realms.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "test/browser",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  // Its own port, so `node scripts/serve.mjs` on 4759 can keep running.
  use: { baseURL: "http://localhost:4769/" },
  webServer: {
    command: "PORT=4769 node scripts/serve.mjs",
    url: "http://localhost:4769/package.json",
    // Never reuse whatever already listens on the port.
    reuseExistingServer: false,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
