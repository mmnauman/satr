import type { IncomingMessage, ServerResponse } from "node:http";
import { sanitizeScreeningNumber } from "../../src/adapters/reportParser.js";
import type { CaseSnapshot, ViewerRole } from "../../src/adapters/types.js";
import { createPersonFile, type PersonFile, type PersonId } from "../../src/domain/case.js";
import { staffRoleOf } from "../_lib/auth.js";
import { extractBearerToken, randomCapabilityToken, readJsonBody, sendJson } from "../_lib/db.js";
import {
  counselorMayOpen,
  mergeCounselorUpdate,
  mergeCourtUpdate,
  mergeParticipantUpdate,
  projectSnapshotForRole,
  recordStaffView,
  removeParticipant,
} from "../_lib/projection.js";
import { createBlankPersonRuntime } from "../../src/adapters/simulationAdapter.js";
import { getRepo, type CaseRecord } from "../_lib/repo.js";

function parseCodeFromRequest(req: IncomingMessage & { query?: Record<string, string | string[]> }): string {
  const qCode = req.query?.code;
  if (typeof qCode === "string" && qCode) return qCode.trim().toUpperCase();
  if (Array.isArray(qCode) && qCode[0]) return qCode[0].trim().toUpperCase();
  const url = new URL(req.url ?? "/api/cases/UNKNOWN", "http://localhost");
  const segs = url.pathname.split("/").filter(Boolean);
  return (segs[segs.length - 1] ?? "").trim().toUpperCase();
}

function slotForToken(rec: CaseRecord, bearer: string | undefined): PersonId | null {
  if (!bearer) return null;
  if (bearer === rec.tokenA) return "layla";
  if (rec.tokenB && bearer === rec.tokenB) return "omar";
  return null;
}

/**
 * GET  /api/cases/:code?role=participant  (applicant token) -> that applicant's view only
 * GET  /api/cases/:code?role=counselor    (counsellor token) -> consent-scoped file, once booked
 * GET  /api/cases/:code?role=court        (court token)      -> gene-free certificate data
 * POST /api/cases/:code {action:"join"}                      -> the second applicant joins
 * POST /api/cases/:code {action:"save"}   (applicant or counsellor token)
 */
export default async function handler(
  req: IncomingMessage & { query?: Record<string, string | string[]> },
  res: ServerResponse,
) {
  try {
    const repo = getRepo();
    const code = parseCodeFromRequest(req);
    if (!code) {
      sendJson(res, 400, { error: "Missing pairing code" });
      return;
    }
    const rec = await repo.get(code);
    if (!rec) {
      sendJson(res, 404, { error: "No case has that pairing code." });
      return;
    }
    const canonical = rec.canonical;
    const url = new URL(req.url ?? `/api/cases/${code}`, "http://localhost");
    const bearer = extractBearerToken(req);
    const staff = staffRoleOf(req);

    if (req.method === "GET") {
      const role = (url.searchParams.get("role") ?? "participant") as ViewerRole;

      if (role === "participant") {
        const slot = slotForToken(rec, bearer);
        if (!slot) {
          await repo.bumpUnauthorised(code);
          sendJson(res, 403, { error: "This file belongs to someone else." });
          return;
        }
        sendJson(res, 200, { slot, snapshot: projectSnapshotForRole(canonical, { role: "participant", slot }) });
        return;
      }

      if (role === "counselor" || role === "court") {
        if (staff !== role) {
          await repo.bumpUnauthorised(code);
          sendJson(res, 401, { error: "Staff sign-in required." });
          return;
        }
        if (role === "counselor" && !counselorMayOpen(canonical)) {
          sendJson(res, 403, { error: "This couple has not booked counselling yet." });
          return;
        }
        let current = canonical;
        const viewed = recordStaffView(canonical, role);
        if (viewed) {
          current = viewed;
          await repo.save(code, viewed);
          await repo.appendAudit(code, role, viewed.audit.slice(-1));
        }
        sendJson(res, 200, { snapshot: projectSnapshotForRole(current, { role }) });
        return;
      }

      sendJson(res, 400, { error: "Unsupported role" });
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<{
        action?: "join" | "save" | "delete";
        role?: ViewerRole;
        nameEn?: string;
        nameAr?: string;
        number?: string;
        file?: PersonFile;
        snapshot?: CaseSnapshot;
      }>(req);

      if (body.action === "join") {
        if (canonical.files.omar.joined && rec.tokenB) {
          sendJson(res, 409, { error: "Both people have already joined this case." });
          return;
        }
        const tokenB = randomCapabilityToken();
        const defaultNum = `AD-${Math.floor(10000 + Math.random() * 89999)}`;
        const safeNum = sanitizeScreeningNumber(body.file?.number ?? body.number, defaultNum);
        const fileB: PersonFile = body.file
          ? { ...body.file, id: "omar", partner: "layla", number: safeNum, joined: true }
          : createPersonFile({
              id: "omar",
              nameEn: body.nameEn || "Applicant B",
              nameAr: body.nameAr || body.nameEn || "المتقدم ب",
              number: safeNum,
              joined: true,
              reportSource: "Live screening report",
              findings: [],
            });
        const event = { code: "join" as const, id: "omar" as const, at: Date.now() };
        const updated: CaseSnapshot = {
          ...canonical,
          files: { ...canonical.files, omar: fileB },
          audit: [...canonical.audit, event],
          updatedAt: Date.now(),
        };
        await repo.save(code, updated, { tokenB });
        await repo.appendAudit(code, "b", [event]);
        sendJson(res, 200, {
          session: { pairingCode: code, slot: "omar", token: tokenB },
          snapshot: projectSnapshotForRole(updated, { role: "participant", slot: "omar" }),
        });
        return;
      }

      if (body.action === "delete") {
        const slot = slotForToken(rec, bearer);
        if (!slot) {
          await repo.bumpUnauthorised(code);
          sendJson(res, 403, { error: "This file belongs to someone else." });
          return;
        }
        const removed = removeParticipant(canonical, slot, createBlankPersonRuntime());
        await repo.save(code, removed);
        await repo.appendAudit(code, slot === "layla" ? "a" : "b", removed.audit.slice(-1));
        sendJson(res, 200, { ok: true });
        return;
      }

      if (body.action === "save" && body.snapshot) {
        if (body.role === "counselor") {
          if (staff !== "counselor" || !counselorMayOpen(canonical)) {
            await repo.bumpUnauthorised(code);
            sendJson(res, 401, { error: "Only the couple's genetic counsellor can record a session." });
            return;
          }
          const updated = mergeCounselorUpdate(canonical, body.snapshot);
          await repo.save(code, updated);
          await repo.appendAudit(code, "counselor", updated.audit.slice(canonical.audit.length));
          sendJson(res, 200, { snapshot: projectSnapshotForRole(updated, { role: "counselor" }) });
          return;
        }

        if (body.role === "court") {
          if (staff !== "court") {
            await repo.bumpUnauthorised(code);
            sendJson(res, 401, { error: "Only a court clerk can register a certificate." });
            return;
          }
          const updated = mergeCourtUpdate(canonical, body.snapshot);
          if (updated !== canonical) {
            await repo.save(code, updated);
            await repo.appendAudit(code, "court", updated.audit.slice(canonical.audit.length));
          }
          sendJson(res, 200, { snapshot: projectSnapshotForRole(updated, { role: "court" }) });
          return;
        }

        const slot = slotForToken(rec, bearer);
        if (!slot) {
          await repo.bumpUnauthorised(code);
          sendJson(res, 403, { error: "This file belongs to someone else." });
          return;
        }
        const merged = mergeParticipantUpdate(canonical, slot, body.snapshot);
        await repo.save(code, merged);
        await repo.appendAudit(code, slot === "layla" ? "a" : "b", merged.audit.slice(canonical.audit.length));
        sendJson(res, 200, { snapshot: projectSnapshotForRole(merged, { role: "participant", slot }) });
        return;
      }

      sendJson(res, 400, { error: "Unsupported action" });
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    sendJson(res, 500, { error: err instanceof Error ? err.message : "Server error" });
  }
}
