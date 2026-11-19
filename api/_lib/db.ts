import { neon } from "@neondatabase/serverless";
import type { IncomingMessage, ServerResponse } from "node:http";

let schemaInitialized = false;

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

export function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

export async function ensureSchema() {
  if (schemaInitialized) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS satr_cases (
      code TEXT PRIMARY KEY,
      state_json JSONB NOT NULL,
      token_a TEXT NOT NULL,
      token_b TEXT,
      tier SMALLINT NOT NULL DEFAULT 1,
      counseling_done BOOLEAN NOT NULL DEFAULT FALSE,
      unauthorised_attempts INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS satr_audit_events (
      id BIGSERIAL PRIMARY KEY,
      case_code TEXT NOT NULL REFERENCES satr_cases(code) ON DELETE CASCADE,
      actor_slot TEXT,
      event_code TEXT NOT NULL,
      detail TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  schemaInitialized = true;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomPairingCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function randomCapabilityToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function extractBearerToken(req: IncomingMessage): string | undefined {
  const auth = req.headers.authorization;
  if (!auth) return undefined;
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return match?.[1]?.trim();
}

export async function readJsonBody<T = Record<string, unknown>>(req: IncomingMessage & { body?: unknown }): Promise<T> {
  if (req.body && typeof req.body === "object") {
    return req.body as T;
  }
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body) as T;
  }
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? new TextEncoder().encode(chunk) : chunk);
  }
  if (chunks.length === 0) return {} as T;
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  const raw = new TextDecoder().decode(merged).trim();
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

export function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}
