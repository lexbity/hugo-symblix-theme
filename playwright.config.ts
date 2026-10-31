import { defineConfig, devices } from "@playwright/test";

const port = process.env.SYMBLIX_TEST_PORT || "1314";
if (!/^\d{4,5}$/.test(port) || Number(port) > 65535) throw new Error("invalid SYMBLIX_TEST_PORT");
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests",
  // Node unit tests have their own runner and must not be transpiled as browser specs.
  testIgnore: ["**/unit/**"],
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run diagrams && hugo server --source exampleSite --theme hugo-theme-symblix --bind 127.0.0.1 --port ${port} --disableFastRender --buildDrafts --buildFuture --renderToMemory`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox-smoke",
      use: { ...devices["Desktop Firefox"] },
      testMatch: [
        /scene-loader\.spec\.ts/,
        /scene-presentation\.spec\.ts/,
        /scene-runtime\.spec\.ts/,
        /scene-lifecycle\.spec\.ts/,
        /scene-assets\.spec\.ts/,
        /no-js\.spec\.ts/,
        /print\.spec\.ts/,
        /accessibility\.spec\.ts/,
      ],
    },
    {
      name: "webkit-smoke",
      use: { ...devices["Desktop Safari"] },
      testMatch: [
        /scene-loader\.spec\.ts/,
        /scene-presentation\.spec\.ts/,
        /scene-runtime\.spec\.ts/,
        /scene-lifecycle\.spec\.ts/,
        /scene-assets\.spec\.ts/,
        /no-js\.spec\.ts/,
        /print\.spec\.ts/,
        /accessibility\.spec\.ts/,
      ],
    },
  ],
});
