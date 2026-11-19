import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { intersectionGenes, reportable, type CaseFiles, type PersonId } from "./content";
import { CASE_PRESETS, type CasePresetId } from "./domain/case";
import { ease, Scramble } from "./fx";
import { Phone } from "./Phone";
import { runPsi, short, type PsiTrace } from "./psi";
import { CarePathPanel } from "./Portal";
import { ReportModal } from "./ReportModal";
import { fill, t, type Strings } from "./strings";
import { guideStep, isCompiled, isReleased, useSatr, type Action, type AuditEvent } from "./store";
import { Icon } from "./visuals";

export function Stage() {
  const { state, dispatch, switchMode } = useSatr();
  const c = t(state.lang);
  const [editingId, setEditingId] = useState<PersonId | null>(null);

  const labelFor = (id: PersonId) =>
    fill(c.phoneOwner, { name: state.files[id].name[state.lang] });

  return (
    <main className="stage">
      <div className="stage-orbs" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <section className="stage-casebar" aria-label={c.caseBarTitle}>
        <div className="stage-casebar-left">
          <span className="eyebrow eyebrow-gold">{c.caseBarTitle}</span>
          <label className="stage-preset-select">
            <span className="sr-only">{c.presetLabel}</span>
            <select
              value={state.presetId}
              onChange={(e) => {
                const val = e.target.value;
                if (val !== "custom") {
                  dispatch({ type: "setPreset", presetId: val as CasePresetId });
                }
              }}
            >
              {CASE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label[state.lang]}
                </option>
              ))}
              {state.presetId === "custom" && <option value="custom">{c.presetCustom}</option>}
            </select>
          </label>
        </div>

        <div className="stage-casebar-actions">
          {(["layla", "omar"] as const).map((id) => (
            <button
              key={id}
              type="button"
              className="btn btn-outline-light btn-sm"
              onClick={() => setEditingId(id)}
            >
              <Icon name="upload" size={14} />
              {fill(c.editReportA, { name: state.files[id].name[state.lang] })}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-gold btn-sm"
            onClick={() => switchMode("live", "workspace")}
          >
            <Icon name="link" size={14} />
            {c.modeLive}
          </button>
        </div>
      </section>

      <div className="stage-switch" role="tablist">
        {(["layla", "omar"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={state.focus === id}
            className={state.focus === id ? "is-on" : ""}
            onClick={() => dispatch({ type: "focus", id })}
          >
            {labelFor(id)}
          </button>
        ))}
      </div>

      <div className="stage-phones">
        {(["layla", "omar"] as const).map((id, i) => (
          <motion.figure
            key={id}
            className={state.focus === id ? "phone-slot is-focus" : "phone-slot"}
            initial={{ opacity: 0, y: 60, rotateX: 12 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease }}
          >
            <figcaption>{labelFor(id)}</figcaption>
            <Phone id={id} onEditReport={() => setEditingId(id)} />
          </motion.figure>
        ))}
      </div>

      <aside className="rail">
        <GuideCard />
        <div className="rail-scroll">
          <Ledger />
          <MatchEngine />
          {(state.booking || state.counseling || state.referred) && <CarePathPanel me={state.focus} />}
          <ActivityLog />
        </div>
      </aside>

      {editingId && (
        <ReportModal
          open
          personId={editingId}
          currentFile={state.files[editingId]}
          lang={state.lang}
          onClose={() => setEditingId(null)}
          onApply={(updated) => dispatch({ type: "setReport", id: editingId, file: updated })}
        />
      )}
    </main>
  );
}

function useRunner() {
  const { dispatch } = useSatr();
  const [busy, setBusy] = useState(false);
  const run = async (actions: Action[]) => {
    setBusy(true);
    for (const action of actions) {
      dispatch(action);
      if (action.type === "screen" || action.type === "view") await new Promise((r) => setTimeout(r, 450));
      if (action.type === "submit") await new Promise((r) => setTimeout(r, 160));
    }
    setBusy(false);
  };
  return { busy, run };
}

const OUTCOME_KEYS: (keyof Strings)[] = ["o1t", "o2t", "o3t", "o4t", "o5t", "o6t"];
const GUIDE_KEYS = ["g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9"] as const;

export function GuideCard({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useSatr();
  const c = t(state.lang);
  const step = guideStep(state);
  const { busy, run } = useRunner();
  const finished = step.key === "g9" && state.view === "agent";

  if (compact) {
    return (
      <section className="guide guide-compact">
        <div className="guide-head">
          <p className="eyebrow eyebrow-gold">{c.guideTitle}</p>
          <p className="guide-count">{fill(c.guideStep, { n: finished ? GUIDE_KEYS.length : step.index + 1 })}</p>
        </div>
        <div className="guide-bar" aria-hidden="true">
          {GUIDE_KEYS.map((key, i) => (
            <span key={key} className={finished || i < step.index ? "is-done" : i === step.index ? "is-now" : ""} />
          ))}
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h3
            key={step.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease }}
          >
            {c[`${step.key}t`]}
          </motion.h3>
        </AnimatePresence>
        {finished ? (
          <div className="guide-done">
            <button type="button" className="btn btn-outline-light btn-sm" onClick={() => dispatch({ type: "reset" })}>
              <Icon name="refresh" size={15} />
              {c.startAgain}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-gold btn-shine" disabled={busy} aria-busy={busy} onClick={() => run(step.run)}>
            <Icon name="play" size={15} />
            {c.guideDo}
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="guide">
      <div className="guide-head">
        <p className="eyebrow eyebrow-gold">{c.guideTitle}</p>
        <p className="guide-count">{fill(c.guideStep, { n: finished ? GUIDE_KEYS.length : step.index + 1 })}</p>
      </div>
      <div className="guide-table-wrap">
        <table className="guide-table">
          <caption className="sr-only">{c.guideTitle}</caption>
          <thead>
            <tr>
              <th scope="col">{c.guideColN}</th>
              <th scope="col">{c.guideColStep}</th>
              <th scope="col">{c.guideColStatus}</th>
            </tr>
          </thead>
          <tbody>
            {GUIDE_KEYS.map((key, i) => {
              const done = finished || i < step.index;
              const now = !finished && i === step.index;
              return (
                <tr key={key} className={done ? "is-done" : now ? "is-now" : ""} aria-current={now ? "step" : undefined}>
                  <th scope="row">{i + 1}</th>
                  <td>{c[`${key}t`]}</td>
                  <td>
                    <span className={done ? "guide-status is-done" : now ? "guide-status is-now" : "guide-status"}>
                      {done ? c.jDone : now ? c.jNow : c.jNext}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!finished && (
        <p className="guide-body">
          {c[`${step.key}b`]}
          <span className="guide-tags">
            {step.outcomes.map((n) => (
              <span key={n} className="otag">
                {fill(c.outcomeTag, { n })} · {c[OUTCOME_KEYS[n - 1]]}
              </span>
            ))}
          </span>
        </p>
      )}
      {finished ? (
        <div className="guide-done">
          <p>
            <Icon name="check" size={16} />
            {c.guideDone}
          </p>
          <button type="button" className="btn btn-outline-light btn-sm" onClick={() => dispatch({ type: "reset" })}>
            <Icon name="refresh" size={15} />
            {c.startAgain}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-gold btn-block btn-shine" disabled={busy} aria-busy={busy} onClick={() => run(step.run)}>
          <Icon name="play" size={15} />
          {c.guideDo}
        </button>
      )}
    </section>
  );
}

export function GuideDock() {
  return (
    <div className="dock">
      <GuideCard compact />
    </div>
  );
}

type Access = "yes" | "shared" | "sealed" | "no";

export function Ledger({ light = false }: { light?: boolean }) {
  const { state } = useSatr();
  const c = t(state.lang);
  const compiled = isCompiled(state);
  const released = isReleased(state);
  const shared = new Set(intersectionGenes(state.files));

  const seen = (viewer: PersonId, owner: PersonId, gene: string): Access => {
    if (viewer === owner) return state.people[owner].opened ? "yes" : "sealed";
    return compiled && shared.has(gene) ? "shared" : "no";
  };

  const rows: { label: string; cells: Access[] }[] = (["layla", "omar"] as const).flatMap((owner) =>
    state.files[owner].findings.map((f) => ({
      label: `${state.files[owner].name[state.lang]} · ${f.gene}`,
      cells: [seen("layla", owner, f.gene), seen("omar", owner, f.gene), "yes" as Access, "no" as Access, "no" as Access],
    })),
  );
  rows.push({
    label: c.rowCert,
    cells: released ? ["yes", "yes", "yes", "yes", "no"] : ["sealed", "sealed", "sealed", "sealed", "no"],
  });

  const icon = { yes: "eye", shared: "users", sealed: "lock", no: "eyeOff" } as const;

  return (
    <section className={light ? "panel-light" : "panel"}>
      <h3 className={light ? "panel-title-dark" : "panel-title"}>
        <span className="live-dot" aria-hidden="true" />
        {c.ledgerTitle}
      </h3>
      <div className="ledger-scroll">
        <table className={light ? "ledger ledger-light" : "ledger"}>
          <thead>
            <tr>
              <th />
              <th>{state.files.layla.name[state.lang]}</th>
              <th>{state.files.omar.name[state.lang]}</th>
              <th>{c.colCounselShort}</th>
              <th>{c.colCourtShort}</th>
              <th>{c.colFamilyShort}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.cells.map((cell, i) => (
                  <td key={i}>
                    <motion.span
                      key={cell}
                      className={`acc acc-${cell}`}
                      title={cell}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 420, damping: 18 }}
                    >
                      <Icon name={icon[cell]} size={14} />
                    </motion.span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="legend">
        {(
          [
            ["yes", c.legYes],
            ["shared", c.legShared],
            ["sealed", c.legSealed],
            ["no", c.legNo],
          ] as const
        ).map(([kind, label]) => (
          <span key={kind}>
            <span className={`acc acc-${kind}`}>
              <Icon name={icon[kind]} size={12} />
            </span>
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

export function MatchEngine({ light = false }: { light?: boolean }) {
  const { state } = useSatr();
  const c = t(state.lang);
  const compiled = isCompiled(state);
  const [trace, setTrace] = useState<PsiTrace | null>(null);
  const [phase, setPhase] = useState(0);
  const [seed, setSeed] = useState(0);

  const aGenesKey = reportable("layla", state.files).join(",");
  const bGenesKey = reportable("omar", state.files).join(",");

  useEffect(() => {
    if (!compiled) {
      setTrace(null);
      setPhase(0);
      return;
    }
    let live = true;
    const timers: number[] = [];
    runPsi(reportable("layla", state.files), reportable("omar", state.files)).then((result) => {
      if (!live) return;
      setTrace(result);
      setPhase(1);
      timers.push(window.setTimeout(() => setPhase(2), 700), window.setTimeout(() => setPhase(3), 1400));
    });
    return () => {
      live = false;
      timers.forEach(clearTimeout);
    };
  }, [compiled, seed, aGenesKey, bGenesKey, state.files]);

  const agreed = (["layla", "omar"] as const).filter((id) => state.people[id].consented);

  return (
    <section className={light ? "panel-light" : "panel"}>
      <h3 className={light ? "panel-title-dark" : "panel-title"}>
        <Icon name="shieldCheck" size={16} />
        {c.engineTitle}
      </h3>
      {!trace ? (
        <p className={light ? "muted small" : "panel-note"}>
          {agreed.length === 1
            ? fill(c.engineHalf, { name: state.files[agreed[0]].name[state.lang] })
            : c.engineIdle}
        </p>
      ) : (
        <>
          <ol className="engine-steps">
            {[c.engineS1, c.engineS2, c.engineS3].map((label, i) => (
              <li key={label} className={phase > i ? "is-on" : ""}>
                <span>{i + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <div className="engine-cols">
            {(["a", "b"] as const).map((side) => {
              const ownerId: PersonId = side === "a" ? "layla" : "omar";
              return (
                <div key={side} className="engine-col">
                  <p className="engine-who">{fill(c.phoneOwner, { name: state.files[ownerId].name[state.lang] })}</p>
                  {trace[side].length === 0 ? (
                    <div className="hash">
                      <code>0 reportable</code>
                    </div>
                  ) : (
                    trace[side].map((row) => (
                      <div key={row.gene} className={phase >= 3 && row.match ? "hash is-match" : "hash"}>
                        <code>
                          <Scramble text={phase >= 2 ? short(row.twice) : short(row.once)} duration={600} />
                        </code>
                        {phase >= 3 && row.match && <Icon name="check" size={13} />}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
          {phase >= 3 && (
            <p className="engine-result">
              {trace.intersection.length > 0
                ? fill(c.engineResult, { genes: trace.intersection.join(", ") })
                : c.togetherClearSub}
            </p>
          )}
          <div className="engine-foot">
            <span>{c.engineNote}</span>
            <button type="button" className="link" onClick={() => setSeed((n) => n + 1)}>
              <Icon name="refresh" size={13} />
              {c.engineRerun}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export function auditText(event: AuditEvent, c: Strings, lang: "en" | "ar", files?: CaseFiles): string {
  const name = event.id && files ? files[event.id].name[lang] : event.id ?? "";
  switch (event.code) {
    case "open":
      return fill(c.logOpen, { name });
    case "consent":
      return fill(c.logConsent, { name });
    case "withdraw":
      return fill(c.logWithdraw, { name });
    case "compiled":
      return c.logCompiled;
    case "passed":
      return fill(c.logPassed, { name });
    case "fail":
      return fill(c.logFail, { name });
    case "counsel":
      return c.logCounsel;
    case "invite":
      return fill(c.logInvite, { name });
    case "refer":
      return c.logRefer;
    case "escalate":
      return fill(c.logEscalate, { name });
    case "book":
      return fill(c.logBook, { name });
    case "interest":
      return fill(c.logInterest, { name, option: event.detail ? c[event.detail as keyof Strings] : "" });
    case "upload":
      return fill(c.logUpload, { name });
    case "join":
      return fill(c.logJoin, { name });
    case "view":
      return event.detail === "court" ? c.logViewCourt : event.detail === "system" ? c.logViewSystem : c.logViewCounselor;
    case "share":
      return fill(event.detail === "off" ? c.logShareOff : c.logShareOn, { name });
    case "confirm":
      return event.detail === "done" ? c.logConfirmDone : c.logConfirmOrdered;
    case "repro":
      return c.logRepro;
    case "note":
      return c.logNote;
    case "delete":
      return fill(c.logDelete, { name });
    case "register":
      return c.logRegister;
  }
}

export function ActivityLog({ light = false }: { light?: boolean }) {
  const { state } = useSatr();
  const c = t(state.lang);
  const events = [...state.audit].reverse();
  return (
    <section className={light ? "panel-light" : "panel"}>
      <h3 className={light ? "panel-title-dark" : "panel-title"}>
        <Icon name="clock" size={16} />
        {c.logTitle}
      </h3>
      {events.length === 0 ? (
        <p className={light ? "muted small" : "panel-note"}>{c.logEmpty}</p>
      ) : (
        <ol className="log">
          {events.map((event) => (
            <motion.li
              key={`${event.at}-${event.code}`}
              className={`log-${event.code}`}
              initial={{ opacity: 0, x: -16, backgroundColor: "rgba(233,201,131,0.18)" }}
              animate={{ opacity: 1, x: 0, backgroundColor: "rgba(233,201,131,0)" }}
              transition={{ duration: 0.8, ease }}
            >
              <time>
                {new Date(event.at).toLocaleTimeString(state.lang === "ar" ? "ar-AE" : "en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </time>
              <span>{auditText(event, c, state.lang, state.files)}</span>
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  );
}
