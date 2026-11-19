import { promises as fs } from "node:fs";
import path from "node:path";
import type { AuditEvent, CaseSnapshot } from "../../src/adapters/types";
import { analyzeCase } from "../../src/domain/case";
import { ensureSchema, getSql, hasDatabaseUrl } from "./db";

/** One stored couple case: the full record plus the two applicants' capability tokens. */
export type CaseRecord = {
  code: string;
  canonical: CaseSnapshot;
  tokenA: string;
  tokenB: string | null;
  unauthorisedAttempts: number;
};

export type StoreKind = "neon" | "file";

/**
 * Where cases are kept. Neon Postgres when DATABASE_URL is set; otherwise a JSON file on the
 * server's disk, so the live app still works on a laptop or a single small server.
 */
export interface CaseRepo {
  readonly kind: StoreKind;
  exists(code: string): Promise<boolean>;
  get(code: string): Promise<CaseRecord | null>;
  insert(record: CaseRecord): Promise<void>;
  save(code: string, canonical: CaseSnapshot, opts?: { tokenB?: string }): Promise<void>;
  bumpUnauthorised(code: string): Promise<void>;
  list(limit?: number): Promise<CaseSnapshot[]>;
  totalUnauthorised(): Promise<number>;
  appendAudit(code: string, slot: string | null, events: AuditEvent[]): Promise<void>;
  deleteAll(): Promise<void>;
}

/* ---------------- Neon Postgres ---------------- */

type Row = { code: string; state_json: CaseSnapshot; token_a: string; token_b: string | null; unauthorised_attempts: number };

class NeonRepo implements CaseRepo {
  readonly kind = "neon" as const;

  private async sql() {
    await ensureSchema();
    return getSql();
  }

  async exists(code: string) {
    const sql = await this.sql();
    const rows = await sql`SELECT code FROM satr_cases WHERE code = ${code}`;
    return rows.length > 0;
  }

  async get(code: string): Promise<CaseRecord | null> {
    const sql = await this.sql();
    const rows = (await sql`
      SELECT code, state_json, token_a, token_b, unauthorised_attempts FROM satr_cases WHERE code = ${code}
    `) as Row[];
    const r = rows[0];
    if (!r) return null;
    return { code: r.code, canonical: r.state_json, tokenA: r.token_a, tokenB: r.token_b, unauthorisedAttempts: r.unauthorised_attempts };
  }

  async insert(rec: CaseRecord) {
    const sql = await this.sql();
    const tier = analyzeCase(rec.canonical.files).tier;
    await sql`
      INSERT INTO satr_cases (code, state_json, token_a, token_b, tier, counseling_done)
      VALUES (${rec.code}, ${JSON.stringify(rec.canonical)}::jsonb, ${rec.tokenA}, ${rec.tokenB}, ${tier}, ${false})
    `;
  }

  async save(code: string, canonical: CaseSnapshot, opts?: { tokenB?: string }) {
    const sql = await this.sql();
    const tier = analyzeCase(canonical.files).tier;
    const json = JSON.stringify(canonical);
    if (opts?.tokenB) {
      await sql`
        UPDATE satr_cases SET state_json = ${json}::jsonb, token_b = ${opts.tokenB}, tier = ${tier},
          counseling_done = ${canonical.counseling}, updated_at = NOW() WHERE code = ${code}
      `;
    } else {
      await sql`
        UPDATE satr_cases SET state_json = ${json}::jsonb, tier = ${tier},
          counseling_done = ${canonical.counseling}, updated_at = NOW() WHERE code = ${code}
      `;
    }
  }

  async bumpUnauthorised(code: string) {
    const sql = await this.sql();
    await sql`UPDATE satr_cases SET unauthorised_attempts = unauthorised_attempts + 1 WHERE code = ${code}`;
  }

  async list(limit = 200) {
    const sql = await this.sql();
    const rows = (await sql`SELECT state_json FROM satr_cases ORDER BY updated_at DESC LIMIT ${limit}`) as { state_json: CaseSnapshot }[];
    return rows.map((r) => r.state_json);
  }

  async totalUnauthorised() {
    const sql = await this.sql();
    const rows = (await sql`SELECT COALESCE(SUM(unauthorised_attempts), 0)::int AS n FROM satr_cases`) as { n: number }[];
    return rows[0]?.n ?? 0;
  }

  async deleteAll() {
    const sql = await this.sql();
    await sql`DELETE FROM satr_audit_events`;
    await sql`DELETE FROM satr_cases`;
  }

  async appendAudit(code: string, slot: string | null, events: AuditEvent[]) {
    const sql = await this.sql();
    for (const ev of events) {
      await sql`
        INSERT INTO satr_audit_events (case_code, actor_slot, event_code, detail)
        VALUES (${code}, ${slot}, ${ev.code}, ${ev.detail ?? null})
      `;
    }
  }
}

/* ---------------- JSON file on disk ---------------- */


type FileShape = { cases: Record<string, CaseRecord & { updatedAt: number }>; audit: { code: string; slot: string | null; event: string; at: number }[] };

class FileRepo implements CaseRepo {
  readonly kind = "file" as const;
  private file = path.join(process.env.SATR_DATA_DIR?.trim() || path.join(process.cwd(), ".data"), "satr-cases.json");
  private queue: Promise<unknown> = Promise.resolve();

  private async read(): Promise<FileShape> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as FileShape;
    } catch {
      return { cases: {}, audit: [] };
    }
  }

  /** Writes are serialised so two phones saving at once cannot lose each other's change. */
  private mutate<T>(fn: (data: FileShape) => T): Promise<T> {
    const run = this.queue.then(async () => {
      const data = await this.read();
      const out = fn(data);
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(data));
      await fs.rename(tmp, this.file);
      return out;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async exists(code: string) {
    return Boolean((await this.read()).cases[code]);
  }

  async get(code: string) {
    await this.queue;
    const rec = (await this.read()).cases[code];
    return rec ? { code: rec.code, canonical: rec.canonical, tokenA: rec.tokenA, tokenB: rec.tokenB, unauthorisedAttempts: rec.unauthorisedAttempts } : null;
  }

  async insert(rec: CaseRecord) {
    await this.mutate((d) => {
      d.cases[rec.code] = { ...rec, updatedAt: Date.now() };
    });
  }

  async save(code: string, canonical: CaseSnapshot, opts?: { tokenB?: string }) {
    await this.mutate((d) => {
      const rec = d.cases[code];
      if (!rec) return;
      rec.canonical = canonical;
      if (opts?.tokenB) rec.tokenB = opts.tokenB;
      rec.updatedAt = Date.now();
    });
  }

  async bumpUnauthorised(code: string) {
    await this.mutate((d) => {
      const rec = d.cases[code];
      if (rec) rec.unauthorisedAttempts += 1;
    });
  }

  async list(limit = 200) {
    await this.queue;
    return Object.values((await this.read()).cases)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit)
      .map((r) => r.canonical);
  }

  async totalUnauthorised() {
    await this.queue;
    return Object.values((await this.read()).cases).reduce((n, r) => n + r.unauthorisedAttempts, 0);
  }

  async deleteAll() {
    await this.mutate((d) => {
      d.cases = {};
      d.audit = [];
    });
  }

  async appendAudit(code: string, slot: string | null, events: AuditEvent[]) {
    if (events.length === 0) return;
    await this.mutate((d) => {
      for (const ev of events) d.audit.push({ code, slot, event: ev.code, at: ev.at });
      if (d.audit.length > 5000) d.audit.splice(0, d.audit.length - 5000);
    });
  }
}

let repo: CaseRepo | null = null;

export function getRepo(): CaseRepo {
  if (!repo) repo = hasDatabaseUrl() ? new NeonRepo() : new FileRepo();
  return repo;
}
