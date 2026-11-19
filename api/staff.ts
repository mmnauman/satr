import type { IncomingMessage, ServerResponse } from "node:http";
import type { StaffRole } from "../src/adapters/types.js";
import { issueStaffToken, keyMatches, STAFF_ACCOUNTS, staffRoleOf } from "./_lib/auth.js";
import { readJsonBody, sendJson } from "./_lib/db.js";

/**
 * POST /api/staff  { role, key }  -> { token, role, name, exp }
 * GET  /api/staff  (Bearer token) -> { role, name } when the token is still valid
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "GET") {
    const role = staffRoleOf(req);
    if (!role) {
      sendJson(res, 401, { error: "Not signed in" });
      return;
    }
    sendJson(res, 200, { role, name: STAFF_ACCOUNTS[role] });
    return;
  }

  if (req.method === "POST") {
    const body = await readJsonBody<{ role?: StaffRole; key?: string }>(req);
    if (!body.role || !(body.role in STAFF_ACCOUNTS)) {
      sendJson(res, 400, { error: "Unknown staff role" });
      return;
    }
    if (!keyMatches(body.key)) {
      sendJson(res, 403, { error: "That access key is not right." });
      return;
    }
    const { token, exp } = issueStaffToken(body.role);
    sendJson(res, 200, { token, exp, role: body.role, name: STAFF_ACCOUNTS[body.role] });
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}
