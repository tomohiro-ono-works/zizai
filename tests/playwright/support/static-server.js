const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");


const repositoryRoot = path.resolve(__dirname, "..", "..", "..");
const staticRoot = path.resolve(repositoryRoot, "static");
const hostIndex = process.argv.indexOf("--host");
const portIndex = process.argv.indexOf("--port");
const host = hostIndex >= 0 ? String(process.argv[hostIndex + 1] || "") : "127.0.0.1";
const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4173;
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);


function resolveStaticPath(rawUrl) {
  const pathname = new URL(rawUrl, `http://${host}:${port}`).pathname;
  if (!pathname.startsWith("/static/")) return null;
  const candidate = path.resolve(staticRoot, decodeURIComponent(pathname.slice("/static/".length)));
  if (candidate !== staticRoot && !candidate.startsWith(`${staticRoot}${path.sep}`)) return null;
  return candidate;
}


const server = http.createServer((request, response) => {
  const target = resolveStaticPath(request.url || "/");
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not Found");
    return;
  }
  const body = fs.readFileSync(target);
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": String(body.length),
    "Content-Type": contentTypes.get(path.extname(target).toLowerCase()) || "application/octet-stream",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(request.method === "HEAD" ? undefined : body);
});


server.listen(port, host);
