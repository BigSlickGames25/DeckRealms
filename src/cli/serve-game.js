import http from "node:http";
import { createReadStream, stat } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { projectRootFrom } from "../utils/io.js";

const statAsync = promisify(stat);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp"
};

function parseArgs(argv) {
  const args = { port: 8787, host: "127.0.0.1" };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--port") {
      args.port = Number.parseInt(argv[i + 1], 10) || args.port;
      i += 1;
    } else if (token === "--host") {
      args.host = argv[i + 1] || args.host;
      i += 1;
    }
  }
  return args;
}

function safeResolve(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const requested = decoded === "/" ? "/web/index.html" : decoded;
  const normalized = path.normalize(requested).replace(/^([/\\])+/, "");
  const resolved = path.resolve(root, normalized);
  if (!resolved.startsWith(root)) {
    throw new Error("Path escape denied");
  }
  return resolved;
}

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, headers);
  res.end(body);
}

async function handleRequest(req, res, root) {
  try {
    const filePath = safeResolve(root, req.url || "/");
    const info = await statAsync(filePath);
    if (!info.isFile()) {
      send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    createReadStream(filePath).pipe(res);
  } catch (error) {
    if ((error && error.code) === "ENOENT") {
      send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found");
      return;
    }
    send(res, 500, { "Content-Type": "text/plain; charset=utf-8" }, `Server error: ${error.message}`);
  }
}

async function main() {
  const { port, host } = parseArgs(process.argv.slice(2));
  const root = projectRootFrom(import.meta.url);
  const server = http.createServer((req, res) => {
    handleRequest(req, res, root);
  });

  server.listen(port, host, () => {
    console.log(`Deck Realms web prototype server running at http://${host}:${port}/`);
    console.log("Open /web/index.html or just /");
  });
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});

