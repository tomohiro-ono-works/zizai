const path = require("path");
delete process.env.NO_COLOR;
const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: path.join(__dirname, "specs"),
  globalSetup: require.resolve("./support/global-setup.js"),
  globalTeardown: require.resolve("./support/global-teardown.js"),
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "line",
  outputDir: path.join(__dirname, "results"),
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
