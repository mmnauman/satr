import type { IncomingMessage, ServerResponse } from "node:http";
import { usingDemoKey } from "./_lib/auth";
import { hasDatabaseUrl, sendJson } from "./_lib/db";

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  sendJson(res, 200, {
    ok: true,
    store: hasDatabaseUrl() ? "neon" : "file",
    neon: hasDatabaseUrl(),
    demoKey: usingDemoKey(),
    synthesis: Boolean(process.env.SATR_SYNTHESIS_KEY && process.env.SATR_SYNTHESIS_URL),
  });
}
