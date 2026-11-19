-- Satr (ستر) — Neon Serverless Postgres Schema
-- Stores consent-gated couple screening cases with capability tokens and immutable audit events.

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
);

CREATE INDEX IF NOT EXISTS idx_satr_cases_updated_at ON satr_cases (updated_at DESC);

CREATE TABLE IF NOT EXISTS satr_audit_events (
  id BIGSERIAL PRIMARY KEY,
  case_code TEXT NOT NULL REFERENCES satr_cases(code) ON DELETE CASCADE,
  actor_slot TEXT,
  event_code TEXT NOT NULL,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_satr_audit_case_code ON satr_audit_events (case_code, created_at DESC);
