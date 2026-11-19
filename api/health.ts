import type { IncomingMessage, ServerResponse } from "node:http";
import { usingDemoKey } from "./_lib/auth.js";
import { hasDatabaseUrl, sendJson } from "./_lib/db.js";

/**
 * Serverless hosts (Vercel) cannot keep a file between requests, so without DATABASE_URL the
 * server says it cannot store cases and the app keeps them in the browser instead.
 */
function storeKind(): "neon" | "file" | "browser" {
  if (hasDatabaseUrl()) return "neon";
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY) return "browser";
  return "file";
}

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  sendJson(res, 200, {
    ok: true,
    store: storeKind(),
    neon: hasDatabaseUrl(),
    demoKey: usingDemoKey(),
    synthesis: Boolean(process.env.SATR_SYNTHESIS_KEY && process.env.SATR_SYNTHESIS_URL),
  });
}
