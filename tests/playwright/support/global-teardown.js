const fs = require("fs");
const http = require("http");
const path = require("path");
const { execFileSync } = require("child_process");


const RUNTIME_FILE = path.join(__dirname, "..", ".static-server.runtime.json");


function isAvailable(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve(true);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(500, () => {
      request.destroy();
      resolve(false);
    });
  });
}


module.exports = async () => {
  let runtime = null;
  try {
    runtime = JSON.parse(fs.readFileSync(RUNTIME_FILE, "utf-8"));
  } catch (_error) {
    return;
  } finally {
    fs.rmSync(RUNTIME_FILE, { force: true });
  }
  if (!runtime?.pid) return;

  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/PID", String(runtime.pid), "/T", "/F"], { stdio: "ignore" });
    } catch (_error) {
      // taskkill also returns non-zero when the recorded process already exited.
    }
    return;
  }

  try {
    process.kill(runtime.pid, "SIGTERM");
  } catch (_error) {
    // The server may already have exited; availability check below is authoritative.
  }

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (!(await isAvailable(runtime.url))) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Playwright static server did not stop: ${runtime.url}`);
};
