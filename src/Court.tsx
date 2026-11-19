import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { createDefaultSnapshot } from "./adapters/simulationAdapter";
import type { CourtCaseSummary } from "./adapters/types";
import { ease, rise, stagger } from "./fx";
import { fill, t, type Strings } from "./strings";
import { isReleased, useSatr } from "./store";
import { Icon, Seal } from "./visuals";

type Filter = "all" | "ready" | "pending" | "registered";

function stageLabel(s: CourtCaseSummary, c: Strings): string {
  if (s.registeredAt) return c.crRegistered;
  if (s.stage === "ready") return c.crReady;
  if (s.stage === "counselling") return c.crCounselling;
  if (s.stage === "progress") return c.crProgress;
  return c.crWaiting;
}

function stageClass(s: CourtCaseSummary): string {
  if (s.registeredAt) return "badge badge-good";
  if (s.stage === "ready") return "badge badge-gold";
  return "badge";
}

/** The marriage court's register: every couple, process steps only, searchable. */
export function CourtRegister() {
  const { state, courtCases, lookupCourtCase } = useSatr();
  const c = t(state.lang);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [miss, setMiss] = useState(false);
  const fmt = (at?: number) => (at ? new Date(at).toLocaleDateString(state.lang === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

  const counts = useMemo(() => {
    const registered = courtCases.filter((x) => x.registeredAt).length;
    const ready = courtCases.filter((x) => x.stage === "ready" && !x.registeredAt).length;
    return { total: courtCases.length, registered, ready, pending: courtCases.length - registered - ready };
  }, [courtCases]);

  const shown = courtCases.filter((x) => {
    const needle = q.trim().toLowerCase().replace(/\s+/g, "");
    const hay = `${x.names.en}${x.names.ar}${x.numbers}${x.pairingCode}`.toLowerCase().replace(/\s+/g, "");
    if (needle && !hay.includes(needle)) return false;
    if (filter === "ready") return x.stage === "ready" && !x.registeredAt;
    if (filter === "registered") return Boolean(x.registeredAt);
    if (filter === "pending") return x.stage !== "ready";
    return true;
  });

  const open = async (code: string) => {
    setBusy(code);
    setMiss(false);
    const ok = await lookupCourtCase(code);
    setMiss(!ok);
    setBusy(null);
  };

  const exact = q.trim().replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  return (
    <main className="desk wrap court-register">
      <motion.header className="page-head" variants={stagger} initial="hidden" animate="show">
        <motion.p className="eyebrow" variants={rise}>
          {c.crKicker}
        </motion.p>
        <motion.h1 variants={rise}>{c.crTitle}</motion.h1>
        <motion.p className="lead" variants={rise}>
          {c.crLead}
        </motion.p>
      </motion.header>

      <motion.div className="kpis cr-kpis" variants={stagger} initial="hidden" animate="show">
        {(
          [
            [counts.total, c.crStatTotal, false],
            [counts.ready, c.crStatReady, true],
            [counts.registered, c.crStatRegistered, false],
            [counts.pending, c.crStatPending, false],
          ] as const
        ).map(([n, label, good]) => (
          <motion.div key={label} className={good ? "kpi kpi-good" : "kpi"} variants={rise}>
            <p className="kpi-value">{n}</p>
            <p className="kpi-label">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      <section className="panel-light cr-panel">
        <div className="cr-tools">
          <label className="cr-search">
            <Icon name="scan" size={18} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.crSearch} aria-label={c.crSearch} />
          </label>
          <div className="seg" role="group">
            {(
              [
                ["all", c.crAll],
                ["ready", c.crReady],
                ["pending", c.crCounselling],
                ["registered", c.crRegistered],
              ] as const
            ).map(([key, label]) => (
              <button key={key} type="button" className={filter === key ? "is-on" : ""} aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {courtCases.length === 0 ? (
          <p className="muted cr-empty">{c.crEmpty}</p>
        ) : shown.length === 0 ? (
          <div className="cr-empty">
            <p className="muted">{c.crNoMatch}</p>
            {exact.length === 6 && (
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => void open(exact)}>
                <Icon name="court" size={14} />
                {c.courtLookupBtn} · {exact}
              </button>
            )}
          </div>
        ) : (
          <ol className="cr-list">
            {shown.map((x, i) => (
              <motion.li key={x.pairingCode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03, ease }}>
                <button type="button" className="cr-row" onClick={() => void open(x.pairingCode)} disabled={busy === x.pairingCode}>
                  <span className="cr-seal" aria-hidden="true">
                    <Seal size={34} />
                  </span>
                  <span className="cr-who">
                    <strong>{x.names[state.lang]}</strong>
                    <span className="muted small">
                      {x.numbers} · {x.pairingCode}
                    </span>
                  </span>
                  <span className="cr-when muted small">
                    {x.registeredAt ? fill(c.crRegisteredOn, { date: fmt(x.registeredAt) }) : x.issuedAt ? fill(c.crIssuedOn, { date: fmt(x.issuedAt) }) : ""}
                  </span>
                  <span className={stageClass(x)}>{stageLabel(x, c)}</span>
                  <Icon name="arrowRight" size={16} className="flip-rtl cr-go" />
                </button>
              </motion.li>
            ))}
          </ol>
        )}
        {miss && <p className="feedback feedback-warn">{c.courtLookupMiss}</p>}
      </section>
    </main>
  );
}

/** Above an open certificate: back, register, print. */
export function CourtToolbar() {
  const { state, dispatch } = useSatr();
  const c = t(state.lang);
  const released = isReleased(state);
  const registered = state.audit.some((ev) => ev.code === "register");
  return (
    <div className="wrap cr-toolbar">
      <button
        type="button"
        className="btn btn-quiet btn-sm"
        onClick={() => dispatch({ type: "hydrateSnapshot", snapshot: { ...createDefaultSnapshot(), pairingCode: null } })}
      >
        <Icon name="arrowLeft" size={14} className="flip-rtl" />
        {c.crBack}
      </button>
      <div className="cr-toolbar-actions">
        {released ? (
          <button type="button" className={registered ? "btn btn-quiet btn-sm" : "btn btn-primary btn-sm"} disabled={registered} onClick={() => dispatch({ type: "register" })}>
            <Icon name={registered ? "check" : "court"} size={14} />
            {registered ? c.crRegisterDone : c.crRegister}
          </button>
        ) : (
          <span className="muted small">{c.crRegisterNeeds}</span>
        )}
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => window.print()}>
          <Icon name="download" size={14} />
          {c.crPrint}
        </button>
      </div>
    </div>
  );
}
