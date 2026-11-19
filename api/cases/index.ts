import type { IncomingMessage, ServerResponse } from "node:http";
import { sanitizeScreeningNumber } from "../../src/adapters/reportParser.js";
import { createBlankPersonRuntime, createDefaultSnapshot } from "../../src/adapters/simulationAdapter.js";
import type { CaseSnapshot } from "../../src/adapters/types.js";
import { createPersonFile, type PersonFile } from "../../src/domain/case.js";
import { staffRoleOf } from "../_lib/auth.js";
import { randomCapabilityToken, randomPairingCode, readJsonBody, sendJson } from "../_lib/db.js";
import { computeSystemMetrics, counselorMayOpen, projectSnapshotForRole, summarizeCounselorCase, summarizeCourtCase } from "../_lib/projection.js";
import { getRepo } from "../_lib/repo.js";

/**
 * GET  /api/cases?role=counselor  (counsellor token) -> booked cases only, as summaries
 * GET  /api/cases?role=system     (analyst token)    -> anonymous aggregate figures only
 * POST /api/cases                                     -> a new case for the first applicant
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const repo = getRepo();
    const url = new URL(req.url ?? "/api/cases", "http://localhost");

    if (req.method === "GET") {
      const role = url.searchParams.get("role") ?? "system";
      const staff = staffRoleOf(req);
      if (role === "counselor") {
        if (staff !== "counselor") {
          sendJson(res, 401, { error: "Sign in as a genetic counsellor to see the queue." });
          return;
        }
        const cases = (await repo.list()).filter(counselorMayOpen);
        sendJson(res, 200, { cases: cases.map((c) => summarizeCounselorCase(projectSnapshotForRole(c, { role: "counselor" }))) });
        return;
      }
      if (role === "court") {
        if (staff !== "court") {
          sendJson(res, 401, { error: "Sign in as a court clerk to see the register." });
          return;
        }
        const cases = (await repo.list()).filter((c) => c.files.layla.joined && c.files.omar.joined);
        sendJson(res, 200, { cases: cases.map(summarizeCourtCase) });
        return;
      }
      if (staff !== "system") {
        sendJson(res, 401, { error: "Sign in as a health-system analyst to see these figures." });
        return;
      }
      sendJson(res, 200, computeSystemMetrics(await repo.list(), repo.kind === "neon" ? "neon" : "server", await repo.totalUnauthorised()));
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<{ nameEn?: string; nameAr?: string; number?: string; file?: PersonFile }>(req);

      let code = randomPairingCode();
      for (let tries = 0; tries < 5 && (await repo.exists(code)); tries++) code = randomPairingCode();

      const tokenA = randomCapabilityToken();
      const defaultNum = `AD-${Math.floor(10000 + Math.random() * 89999)}`;
      const safeNum = sanitizeScreeningNumber(body.file?.number ?? body.number, defaultNum);

      const fileA: PersonFile = body.file
        ? { ...body.file, id: "layla", partner: "omar", number: safeNum, joined: true }
        : createPersonFile({
            id: "layla",
            nameEn: body.nameEn || "Applicant A",
            nameAr: body.nameAr || body.nameEn || "المتقدم أ",
            number: safeNum,
            joined: true,
            reportSource: "Live screening report",
            findings: [],
          });

      const waitingPartner = createPersonFile({
        id: "omar",
        nameEn: "Partner",
        nameAr: "الشريك",
        number: "Pending",
        joined: false,
        reportSource: "Waiting to join",
        findings: [],
      });

      const canonical: CaseSnapshot = {
        ...createDefaultSnapshot(),
        pairingCode: code,
        presetId: "custom",
        files: { layla: fileA, omar: waitingPartner },
        people: { layla: createBlankPersonRuntime(), omar: createBlankPersonRuntime() },
        audit: [{ code: "join", id: "layla", at: Date.now() }],
        updatedAt: Date.now(),
      };

      await repo.insert({ code, canonical, tokenA, tokenB: null, unauthorisedAttempts: 0 });
      await repo.appendAudit(code, "a", canonical.audit);

      sendJson(res, 201, {
        session: { pairingCode: code, slot: "layla", token: tokenA },
        snapshot: projectSnapshotForRole(canonical, { role: "participant", slot: "layla" }),
      });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : "Server error" });
  }
}
