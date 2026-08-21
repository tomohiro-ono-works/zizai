const fs = require("fs");


try {
  const { chromium } = require("@playwright/test");
  const executable = chromium.executablePath();
  if (!executable || !fs.existsSync(executable)) {
    process.stderr.write(`Playwright Chromium is missing: ${executable || "unknown"}\n`);
    process.exit(2);
  }
} catch (error) {
  process.stderr.write(`Playwright dependency is unavailable: ${error.message}\n`);
  process.exit(2);
}
