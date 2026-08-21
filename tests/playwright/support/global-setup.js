const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");


const HOST = "127.0.0.1";
const PORT = 4173;
const URL = `http://${HOST}:${PORT}/static/home.html`;
const RUNTIME_FILE = path.join(__dirname, "..", ".static-server.runtime.json");


function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}


function isAvailable() {
  return new Promise((resolve) => {
    const request = http.get(URL, (response) => {
      response.resume();
      resolve(Number(response.statusCode || 0) === 200);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(500, () => {
      request.destroy();
      resolve(false);
    });
  });
}


module.exports = async () => {
  if (await isAvailable()) {
    throw new Error(`Playwright static-server port is already in use: ${URL}`);
  }

  const child = spawn(
    process.execPath,
    [path.join(__dirname, "static-server.js"), "--host", HOST, "--port", String(PORT)],
    { stdio: "ignore", windowsHide: true }
  );
  if (!child.pid) {
    throw new Error("Playwright static server did not return a process ID.");
  }
  child.unref();
  fs.writeFileSync(RUNTIME_FILE, JSON.stringify({ pid: child.pid, url: URL }), "utf-8");

  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await isAvailable()) return;
    await sleep(100);
  }
  throw new Error(`Playwright static server did not become ready: ${URL}`);
};
