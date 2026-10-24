import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ease, Scramble } from "./fx";
import { runPsi, short, type PsiTrace } from "./psi";
import { fill, t, type Strings } from "./strings";
import { useSatr } from "./store";
import { Icon } from "./visuals";

const LAYLA_GENES = ["USH2A", "GJB2"];
const OMAR_GENES = ["USH2A", "MEFV"];

type Phase = "idle" | "scramble" | "cross" | "done";

export function MatchPlayground() {
  const { state } = useSatr();
  const c = t(state.lang);
  const [agreed, setAgreed] = useState({ layla: false, omar: false });
  const [phase, setPhase] = useState<Phase>("idle");
  const [trace, setTrace] = useState<PsiTrace | null>(null);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let live = true;
    runPsi(LAYLA_GENES, OMAR_GENES).then((result) => live && setTrace(result));
    return () => {
      live = false;
    };
  }, [round]);

  const both = agreed.layla && agreed.omar && trace !== null;
  useEffect(() => {
    if (!both) return;
    const timers = [
      window.setTimeout(() => setPhase("scramble"), 0),
      window.setTimeout(() => setPhase("cross"), 1300),
      window.setTimeout(() => setPhase("done"), 2900),
    ];
    return () => timers.forEach(clearTimeout);
  }, [both]);

  const reset = () => {
    setAgreed({ layla: false, omar: false });
    setPhase("idle");
    setTrace(null);
    setRound((n) => n + 1);
  };

  const names = { layla: state.lang === "ar" ? "ليلى" : "Layla", omar: state.lang === "ar" ? "عمر" : "Omar" };
  const status = phase === "idle" ? c.matchWaiting : phase === "done" ? c.matchDone : c.matchRunning;

  const side = (who: "layla" | "omar") => {
    const rows = who === "layla" ? trace?.a : trace?.b;
    const genes = who === "layla" ? LAYLA_GENES : OMAR_GENES;
    return (
      <div className={agreed[who] ? "pg-side is-agreed" : "pg-side"}>
        <div className="pg-who">
          <span className="avatar avatar-lg">{names[who].slice(0, 1)}</span>
          <strong>{names[who]}</strong>
        </div>
        <ul className="pg-chips">
          {genes.map((gene, i) => {
            const row = rows?.[i];
            const matched = phase === "done" && row?.match;
            const hidden = phase !== "idle" && !matched;
            return (
              <motion.li key={gene} layout className={matched ? "pg-chip is-match" : hidden ? "pg-chip is-locked" : "pg-chip"}>
                <Icon name={matched ? "check" : hidden ? "lock" : "dna"} size={15} />
                <code>{hidden && row ? <Scramble text={short(row.once)} duration={700} /> : gene}</code>
              </motion.li>
            );
          })}
        </ul>
        <button
          type="button"
          className={agreed[who] ? "btn btn-agreed btn-block" : "btn btn-gold btn-block"}
          disabled={agreed[who]}
          onClick={() => setAgreed((prev) => ({ ...prev, [who]: true }))}
        >
          <Icon name={agreed[who] ? "check" : "shieldCheck"} size={16} />
          {fill(agreed[who] ? c.agreedAs : c.agreeAs, { name: names[who] })}
        </button>
      </div>
    );
  };

  const lane = trace
    ? [...trace.a.map((row) => ({ ...row, from: "a" as const })), ...trace.b.map((row) => ({ ...row, from: "b" as const }))]
    : [];

  return (
    <div className="pg">
      {side("layla")}
      <div className="pg-lane">
        <p className="pg-lane-label">
          <Icon name="shieldCheck" size={14} />
          {c.matchLane}
        </p>
        <div className="pg-lane-body">
          <AnimatePresence>
            {phase === "idle" && (
              <motion.div key="idle" className="pg-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="pg-pulse" />
                <Icon name="lock" size={26} />
              </motion.div>
            )}
          </AnimatePresence>
          {(phase === "cross" || phase === "done") &&
            lane
              .filter((row) => !(phase === "done" && row.match))
              .map((row, i) => (
                <motion.div
                  key={`${row.from}-${row.gene}`}
                  className="pg-hash"
                  initial={{ opacity: 0, x: row.from === "a" ? -90 : 90 }}
                  animate={{ opacity: phase === "done" ? 0.45 : 1, x: 0 }}
                  transition={{ duration: 0.6, delay: phase === "cross" ? i * 0.12 : 0, ease }}
                >
                  <code>{short(row.twice)}</code>
                </motion.div>
              ))}
          <AnimatePresence>
            {phase === "done" && (
              <motion.div
                key="match"
                className="pg-result"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
              >
                <Icon name="users" size={18} />
                <code>
                  <Scramble text="USH2A" duration={600} />
                </code>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={status}
            className="pg-status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            {status}
          </motion.p>
        </AnimatePresence>
        {phase === "done" && (
          <button type="button" className="link link-dark" onClick={reset}>
            <Icon name="refresh" size={14} />
            {c.matchReset}
          </button>
        )}
      </div>
      {side("omar")}
    </div>
  );
}

type Kid = "affected" | "carrier" | "neither";
type Birth = { kid: Kid; fromL: boolean; fromO: boolean; id: number };

function roll(id: number): Birth {
  const fromL = Math.random() < 0.5;
  const fromO = Math.random() < 0.5;
  return { fromL, fromO, id, kid: fromL && fromO ? "affected" : fromL || fromO ? "carrier" : "neither" };
}

export function Simulator() {
  const { state } = useSatr();
  const c = t(state.lang);
  const [births, setBirths] = useState<Birth[]>([]);
  const last = births[births.length - 1];
  const counts = useMemo(() => {
    const out = { affected: 0, carrier: 0, neither: 0 };
    births.forEach((b) => out[b.kid]++);
    return out;
  }, [births]);
  const pct = (n: number) => (births.length ? Math.round((n / births.length) * 100) : 0);
  const label: Record<Kid, string> = { affected: c.riskAffected, carrier: c.riskCarrier, neither: c.riskNeither };
  const expected: Record<Kid, number> = { affected: 25, carrier: 50, neither: 25 };

  const add = (n: number) =>
    setBirths((prev) => {
      const next = [...prev];
      for (let i = 0; i < n; i++) next.push(roll(prev.length + i));
      return next.slice(-400);
    });

  const parent = (name: string, picked: boolean | undefined) => (
    <div className="sim-parent">
      <span className="avatar avatar-lg">{name.slice(0, 1)}</span>
      <strong>{name}</strong>
      <div className="sim-beads">
        <motion.span className="bead bead-usual" animate={last && picked === false ? { scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.5 }} key={`u-${last?.id}`} />
        <motion.span className="bead bead-changed" animate={last && picked === true ? { scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.5 }} key={`c-${last?.id}`} />
      </div>
    </div>
  );

  const names = { layla: state.lang === "ar" ? "ليلى" : "Layla", omar: state.lang === "ar" ? "عمر" : "Omar" };

  return (
    <div className="sim">
      <div className="sim-stage">
        <div className="sim-parents">
          {parent(names.layla, last?.fromL)}
          <span className="sim-plus">+</span>
          {parent(names.omar, last?.fromO)}
        </div>
        <p className="sim-legend">
          <span>
            <span className="bead bead-usual" /> {c.simUsual}
          </span>
          <span>
            <span className="bead bead-changed" /> {c.simChanged}
          </span>
        </p>
        <div className="sim-last">
          <AnimatePresence mode="wait">
            {last ? (
              <motion.div
                key={last.id}
                className={`sim-baby kid-${last.kid}`}
                initial={{ opacity: 0, y: -24, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <span className="sim-baby-icon">
                  <Icon name="heart" size={26} />
                </span>
                <div>
                  <strong>{label[last.kid]}</strong>
                  <span className="sim-beads sim-beads-sm">
                    <span className={last.fromL ? "bead bead-changed" : "bead bead-usual"} />
                    <span className={last.fromO ? "bead bead-changed" : "bead bead-usual"} />
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.p key="empty" className="sim-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {c.simEmpty}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <div className="sim-actions">
          <button type="button" className="btn btn-gold" onClick={() => add(1)}>
            <Icon name="sparkle" size={16} />
            {c.simOne}
          </button>
          <button type="button" className="btn btn-outline-light" onClick={() => add(100)}>
            {c.simMany}
          </button>
          {births.length > 0 && (
            <button type="button" className="link" onClick={() => setBirths([])}>
              <Icon name="refresh" size={14} />
              {c.simReset}
            </button>
          )}
        </div>
      </div>
      <div className="sim-results">
        <div className="sim-dots" aria-hidden="true">
          {births.slice(-100).map((b) => (
            <motion.span key={b.id} className={`dot kid-${b.kid}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }} />
          ))}
        </div>
        {(["affected", "carrier", "neither"] as Kid[]).map((kid) => (
          <div key={kid} className="tally">
            <div className="tally-top">
              <span>
                <span className={`dot kid-${kid}`} /> {label[kid]}
              </span>
              <strong>{pct(counts[kid])}%</strong>
            </div>
            <div className="tally-track">
              <motion.div className={`tally-fill kid-${kid}`} animate={{ width: `${pct(counts[kid])}%` }} transition={{ duration: 0.6, ease }} />
              <span className="tally-expected" style={{ insetInlineStart: `${expected[kid]}%` }} />
            </div>
          </div>
        ))}
        <p className="sim-insight">
          {births.length
            ? fill(c.simInsight, { n: births.length, a: pct(counts.affected), c: pct(counts.carrier), x: pct(counts.neither) })
            : c.simParents}
        </p>
      </div>
    </div>
  );
}

type Role = "layla" | "omar" | "counsel" | "court" | "cousin";
type Row = { label: keyof Strings; value: string | keyof Strings; see: Role[] };

const ROWS: Row[] = [
  { label: "docL1", value: "docCarrier", see: ["layla", "counsel"] },
  { label: "docL2", value: "docCarrier", see: ["layla", "counsel"] },
  { label: "docO1", value: "docCarrier", see: ["omar", "counsel"] },
  { label: "docO2", value: "docCarrier", see: ["omar", "counsel"] },
  { label: "docShared", value: "docSharedV", see: ["layla", "omar", "counsel"] },
  { label: "docWords", value: "docWordsV", see: ["layla", "omar", "counsel"] },
  { label: "docCounsel", value: "docCounselV", see: ["layla", "omar", "counsel", "court"] },
];

export function RoleLens() {
  const { state } = useSatr();
  const c = t(state.lang);
  const [role, setRole] = useState<Role>("layla");
  const roles: { id: Role; label: string; note: keyof Strings; icon: "lock" | "steth" | "court" | "users" }[] = [
    { id: "layla", label: c.colLayla, note: "noteLayla", icon: "lock" },
    { id: "omar", label: c.colOmar, note: "noteOmar", icon: "lock" },
    { id: "counsel", label: c.colCounselShort, note: "noteCounsel", icon: "steth" },
    { id: "court", label: c.colCourtShort, note: "noteCourt", icon: "court" },
    { id: "cousin", label: c.roleCousin, note: "noteCousin", icon: "users" },
  ];
  const current = roles.find((r) => r.id === role) ?? roles[0];
  const visible = ROWS.filter((row) => row.see.includes(role)).length;

  return (
    <div className="lens">
      <div className="lens-tabs" role="tablist">
        {roles.map((r) => (
          <button key={r.id} type="button" role="tab" aria-selected={role === r.id} className={role === r.id ? "is-on" : ""} onClick={() => setRole(r.id)}>
            {role === r.id && <motion.span layoutId="lens-pill" className="lens-pill" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
            <span className="lens-tab-inner">
              <Icon name={r.icon} size={15} />
              {r.label}
            </span>
          </button>
        ))}
      </div>
      <div className="lens-body">
        <div className="doc">
          <div className="doc-head">
            <p>{c.docTitle}</p>
            <span className="doc-count">
              {visible}/{ROWS.length}
            </span>
          </div>
          <ul>
            {ROWS.map((row) => {
              const on = row.see.includes(role);
              const value = c[row.value as keyof Strings] ?? row.value;
              return (
                <li key={row.label} className={on ? "doc-row" : "doc-row is-hidden"}>
                  <span className="doc-label">{c[row.label]}</span>
                  <span className="doc-value">
                    <motion.span className="doc-text" animate={{ opacity: on ? 1 : 0, filter: on ? "blur(0px)" : "blur(6px)" }} transition={{ duration: 0.4 }}>
                      {value}
                    </motion.span>
                    <motion.span
                      className="doc-bar"
                      initial={false}
                      animate={{ scaleX: on ? 0 : 1 }}
                      transition={{ duration: 0.5, ease, delay: on ? 0 : ROWS.indexOf(row) * 0.04 }}
                    >
                      <Icon name="lock" size={12} />
                      {c.hidden}
                    </motion.span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={role}
            className="lens-note"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.35, ease }}
          >
            <span className="lens-note-icon">
              <Icon name={current.icon} size={22} />
            </span>
            <h3>{current.label}</h3>
            <p>{c[current.note]}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function ChatDemo() {
  const { state } = useSatr();
  const c = t(state.lang);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const times = [300, 1500, 2900, 3700, 4900];
    const timers = times.map((ms, i) => window.setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  const bubble = { initial: { opacity: 0, y: 14, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.45, ease } };

  return (
    <div className="chat-demo" ref={ref}>
      <div className="chat-head">
        <span className="chat-dot" />
        {c.askT}
      </div>
      <div className="chat-body">
        {step >= 1 && (
          <motion.div className="bubble bubble-me" {...bubble}>
            {c.aiQ}
          </motion.div>
        )}
        {step === 1 && <Typing label={c.typing} />}
        {step >= 2 && (
          <motion.div className="bubble bubble-satr" {...bubble}>
            <p>{c.aiA}</p>
            <p className="bubble-trace">
              <Icon name="shieldCheck" size={14} />
              {c.aiTrace}
            </p>
          </motion.div>
        )}
        {step >= 3 && (
          <motion.div className="bubble bubble-me" {...bubble}>
            {c.aiQ2}
          </motion.div>
        )}
        {step === 3 || step === 4 ? <Typing label={c.typing} /> : null}
        {step >= 5 && (
          <motion.div className="bubble bubble-satr" {...bubble}>
            <p>{c.aiA2}</p>
            <p className="bubble-trace">
              <Icon name="shieldCheck" size={14} />
              {c.aiTrace2}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Typing({ label }: { label: string }) {
  return (
    <motion.div className="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-label={label}>
      <span />
      <span />
      <span />
    </motion.div>
  );
}
