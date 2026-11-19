import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { StaffRole } from "../../src/adapters/types.js";
import { extractBearerToken } from "./db.js";

/**
 * Staff sign-in. A genetic counsellor, court clerk or health-system analyst exchanges the
 * deployment's access key for a signed token that names one role and expires after 12 hours.
 * Every staff read and write on /api/cases checks that token on the server.
 */

const DEFAULT_KEY = "satr-demo";
const TTL_MS = 12 * 60 * 60 * 1000;

export const STAFF_ACCOUNTS: Record<StaffRole, { en: string; ar: string }> = {
  counselor: { en: "Dr Aisha, genetic counsellor", ar: "د. عائشة، مستشارة وراثية" },
  court: { en: "Marriage court clerk", ar: "موظف محكمة الزواج" },
  system: { en: "Health-system analyst", ar: "محلل النظام الصحي" },
};

function secret(): string {
  return process.env.SATR_SESSION_SECRET?.trim() || "satr-local-session-secret-change-me";
}

export function staffKey(): string {
  return process.env.SATR_STAFF_KEY?.trim() || DEFAULT_KEY;
}

/** True when the deployment still uses the published demo key, so the sign-in page may show it. */
export function usingDemoKey(): boolean {
  return !process.env.SATR_STAFF_KEY?.trim();
}

function b64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export type StaffClaims = { role: StaffRole; exp: number };

export function issueStaffToken(role: StaffRole): { token: string; exp: number } {
  const exp = Date.now() + TTL_MS;
  const body = b64url(JSON.stringify({ role, exp } satisfies StaffClaims));
  return { token: `staff.${body}.${sign(body)}`, exp };
}

export function verifyStaffToken(token: string | undefined): StaffClaims | null {
  if (!token || !token.startsWith("staff.")) return null;
  const [, body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as StaffClaims;
    if (!claims.role || !(claims.role in STAFF_ACCOUNTS) || claims.exp < Date.now()) return null;
    return claims;
  } catch {
    return null;
  }
}

export function keyMatches(given: string | undefined): boolean {
  if (!given) return false;
  const a = Buffer.from(given.trim());
  const b = Buffer.from(staffKey());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The staff role on this request, if it carries a valid staff token. */
export function staffRoleOf(req: IncomingMessage): StaffRole | null {
  return verifyStaffToken(extractBearerToken(req))?.role ?? null;
}
