import type { IncomingMessage, ServerResponse } from "node:http";
import { buildSeedCase, DEMO_SEEDS, seedLabel } from "../src/domain/demoSeed.js";
import { keyMatches, usingDemoKey } from "./_lib/auth.js";
import { randomCapabilityToken, randomPairingCode, readJsonBody, sendJson } from "./_lib/db.js";
import { getRepo } from "./_lib/repo.js";

/**
 * Demo access, for reviewers. Needs the staff access key, like every staff action.
 * POST { action: "seed", key }  -> sample couples at different stages, with each person's sign-in token
 * POST { action: "reset", key } -> removes every case on this server
 * GET                            -> whether the published demo key is in use
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "GET") {
    sendJson(res, 200, { demoKey: usingDemoKey() });
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const body = await readJsonBody<{ action?: "seed" | "reset"; key?: string }>(req);
  if (!keyMatches(body.key)) {
    sendJson(res, 403, { error: "That access key is not right." });
    return;
  }
  const repo = getRepo();
  try {
    if (body.action === "reset") {
      await repo.deleteAll();
      sendJson(res, 200, { ok: true });
      return;
    }
    if (body.action === "seed") {
      const now = Date.now();
      const couples = [];
      for (const spec of DEMO_SEEDS) {
        let code = randomPairingCode();
        for (let i = 0; i < 5 && (await repo.exists(code)); i++) code = randomPairingCode();
        const canonical = buildSeedCase(spec, code, now);
        const tokenA = randomCapabilityToken();
        const tokenB = randomCapabilityToken();
        await repo.insert({ code, canonical, tokenA, tokenB, unauthorisedAttempts: 0 });
        await repo.appendAudit(code, null, canonical.audit);
        couples.push({
          code,
          stage: spec.stage,
          label: seedLabel(spec),
          people: {
            layla: { name: canonical.files.layla.name, token: tokenA },
            omar: { name: canonical.files.omar.name, token: tokenB },
          },
        });
      }
      sendJson(res, 200, { couples });
      return;
    }
    sendJson(res, 400, { error: "Unsupported action" });
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : "Server error" });
  }
}
