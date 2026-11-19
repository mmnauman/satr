import { createReadStream, promises as fs } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import ask from "../api/ask";
import cases from "../api/cases/index";
import caseByCode from "../api/cases/[code]";
import demo from "../api/demo";
import health from "../api/health";
import staff from "../api/staff";

/**
 * Production server for Satr: serves the built app from dist/ and the /api routes from the same
 * handlers the dev server uses. Cases live in Neon when DATABASE_URL is set, otherwise in a JSON
 * file under SATR_DATA_DIR (default ./.data), so give the host a persistent disk and one instance.
 *
 *   npm run build && npm run build:server && npm start
 */

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

const DIST = path.resolve(process.env.SATR_DIST_DIR ?? path.join(process.cwd(), "dist"));
const PORT = Number(process.env.PORT ?? 3000);

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".csv": "text/csv; charset=utf-8",
  ".vcf": "text/plain; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

function route(pathname: string): Handler | null {
  if (pathname === "/api/health") return health;
  if (pathname === "/api/ask") return ask;
  if (pathname === "/api/staff") return staff;
  if (pathname === "/api/demo") return demo;
  if (pathname === "/api/cases") return cases;
  if (pathname.startsWith("/api/cases/")) return caseByCode;
  return null;
}

async function serveStatic(pathname: string, res: ServerResponse) {
  const safe = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = path.join(DIST, safe);
  if (!file.startsWith(DIST)) file = path.join(DIST, "index.html");
  try {
    const stat = await fs.stat(file);
    if (stat.isDirectory()) file = path.join(file, "index.html");
  } catch {
    file = path.join(DIST, "index.html");
  }
  const ext = path.extname(file);
  res.statusCode = 200;
  res.setHeader("Content-Type", TYPES[ext] ?? "application/octet-stream");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  createReadStream(file).on("error", () => res.end()).pipe(res);
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
  if (pathname.startsWith("/api/")) {
    const handler = route(pathname);
    if (!handler) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }
    try {
      await handler(req, res);
    } catch (err) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Server error" }));
    }
    return;
  }
  await serveStatic(pathname, res);
});

server.listen(PORT, () => {
  const store = process.env.DATABASE_URL ? "Neon Postgres" : `file store in ${process.env.SATR_DATA_DIR ?? ".data"}`;
  console.log(`Satr is running on http://localhost:${PORT} (${store})`);
  if (!process.env.SATR_STAFF_KEY) console.log("Staff access key is the published demo key. Set SATR_STAFF_KEY for any shared deployment.");
  if (!process.env.SATR_SESSION_SECRET) console.log("Set SATR_SESSION_SECRET to a long random value for any shared deployment.");
});
