import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { AuditEvent, Interest } from "./adapters/types";
import type { PersonId } from "./domain/case";
import { ease } from "./fx";
import { copyText } from "./copy";
import { signInLink } from "./routing";
import { ActivityLog, Ledger } from "./Stage";
import { t, type Strings } from "./strings";
import { carePath, isCompiled, isExplained, isReleased, useSatr, type State } from "./store";
import { Icon, type IconName } from "./visuals";

/* ------------------------------------------------------------------ */
/* Private sign-in link                                               */
/* ------------------------------------------------------------------ */

export function SignInLinkPanel() {
  const { state, liveSession } = useSatr();
  const c = t(state.lang);
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!liveSession) return null;
  const link = signInLink(liveSession.pairingCode, liveSession.token);
  return (
    <section className="panel-light ws-invite">
      <div>
        <h3 className="panel-title-dark">
          <Icon name="lock" size={17} />
          {c.signinLinkT}
        </h3>
        <p className="muted small">{c.signinLinkB}</p>
      </div>
      <div className="ws-invite-actions">
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          onClick={async () => {
            const ok = await copyText(link);
            setCopied(ok);
            setFailed(!ok);
            if (ok) window.setTimeout(() => setCopied(false), 2400);
          }}
        >
          <Icon name={copied ? "check" : "copy"} size={14} />
          {copied ? c.signinCopied : c.signinCopy}
        </button>
      </div>
      {failed && (
        <input className="ws-invite-link" readOnly value={link} aria-label={c.signinLinkT} onFocus={(e) => e.currentTarget.select()} />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Care path: every step from result to care, with its date            */
/* ------------------------------------------------------------------ */

type PathStep = { key: string; label: string; icon: IconName; at?: number; done: boolean; optional?: boolean; hidden?: boolean };

function firstAt(audit: AuditEvent[], test: (ev: AuditEvent) => boolean): number | undefined {
  return audit.find(test)?.at;
}

function lastAt(audit: AuditEvent[], test: (ev: AuditEvent) => boolean): number | undefined {
  const all = audit.filter(test);
  return all.length ? all[all.length - 1].at : undefined;
}

export function buildPath(state: State, me: PersonId, c: Strings): PathStep[] {
  const a = state.audit;
  const path = carePath(state);
  const both = (code: AuditEvent["code"]) => {
    const l = firstAt(a, (e) => e.code === code && e.id === "layla");
    const o = firstAt(a, (e) => e.code === code && e.id === "omar");
    return l && o ? Math.max(l, o) : undefined;
  };
  return [
    { key: "screened", label: c.pathScreened, icon: "file", at: firstAt(a, (e) => (e.code === "join" || e.code === "upload") && e.id === me), done: state.files[me].joined },
    { key: "opened", label: c.pathOpened, icon: "unlock", at: firstAt(a, (e) => e.code === "open" && e.id === me), done: state.people[me].opened },
    { key: "agreed", label: c.pathAgreed, icon: "together", at: both("consent"), done: isCompiled(state) },
    { key: "shared", label: c.pathShared, icon: "shieldCheck", at: firstAt(a, (e) => e.code === "compiled"), done: isCompiled(state) },
    { key: "explained", label: c.pathExplained, icon: "pen", at: both("passed"), done: isExplained(state) },
    { key: "booked", label: c.pathBooked, icon: "calendar", at: firstAt(a, (e) => e.code === "book"), done: Boolean(state.booking) },
    { key: "counselled", label: c.pathCounselled, icon: "steth", at: firstAt(a, (e) => e.code === "counsel"), done: state.counseling },
    { key: "committee", label: c.pathCommittee, icon: "users", at: firstAt(a, (e) => e.code === "refer"), done: state.referred, hidden: !state.referred },
    {
      key: "confirm",
      label: path.confirmatory === "done" ? c.pathConfirmDone : c.pathConfirmOrdered,
      icon: "scan",
      at: lastAt(a, (e) => e.code === "confirm"),
      done: path.confirmatory !== "none",
      optional: true,
    },
    { key: "repro", label: c.pathRepro, icon: "heart", at: firstAt(a, (e) => e.code === "repro"), done: path.reproductive === "referred", optional: true },
    { key: "cert", label: c.pathCert, icon: "court", at: firstAt(a, (e) => e.code === "counsel"), done: isReleased(state) },
  ].filter((s) => !s.hidden) as PathStep[];
}

export function CarePathPanel({ me }: { me: PersonId }) {
  const { state } = useSatr();
  const c = t(state.lang);
  const steps = buildPath(state, me, c);
  const path = carePath(state);
  const fmt = (at: number) =>
    new Date(at).toLocaleString(state.lang === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <section className="panel-light carepath">
      <h2>{c.pathT}</h2>
      <p className="muted small">{c.pathB}</p>
      <ol className="carepath-list">
        {steps.map((step, i) => (
          <motion.li
            key={step.key}
            className={step.done ? "is-done" : ""}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: i * 0.03, ease }}
          >
            <span className="carepath-dot">
              <Icon name={step.done ? "check" : step.icon} size={15} />
            </span>
            <span className="carepath-label">{step.label}</span>
            <span className="carepath-when">
              {step.done && step.at ? fmt(step.at) : step.optional ? c.pathOptional : c.pathPending}
            </span>
          </motion.li>
        ))}
      </ol>
      <div className="carepath-note">
        <h3>
          <Icon name="steth" size={16} />
          {c.pathNoteT}
        </h3>
        <p className={path.note ? "" : "muted small"}>{path.note || c.pathNoteEmpty}</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Privacy centre                                                      */
/* ------------------------------------------------------------------ */

export function PrivacyCentre({ me }: { me: PersonId }) {
  const { state, dispatch, deleteMyReport } = useSatr();
  const c = t(state.lang);
  const person = state.people[me];
  const compiled = isCompiled(state);
  const [busy, setBusy] = useState(false);

  const download = () => {
    const mine = {
      exportedAt: new Date().toISOString(),
      pairingCode: state.pairingCode,
      me: { file: state.files[me], answers: person.answers, questions: person.thread.map((turn) => turn.q), consented: person.consented, counselorFull: person.counselorFull },
      sharedResult: compiled ? state.files[me === "layla" ? "omar" : "layla"].findings.map((f) => f.gene) : [],
      carePath: carePath(state),
      booking: state.booking,
      activity: state.audit,
    };
    const blob = new Blob([JSON.stringify(mine, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `satr-my-data-${state.pairingCode ?? "case"}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const remove = async () => {
    if (!window.confirm(c.privDeleteConfirm)) return;
    setBusy(true);
    await deleteMyReport();
    setBusy(false);
  };

  return (
    <div className="privacy-centre">
      <section className="panel-light">
        <h2>{c.privT}</h2>
        <p className="muted small">{c.privB}</p>

        <div className="priv-row">
          <div>
            <h3>{c.privPartnerT}</h3>
            <p className="muted small">{compiled ? c.privPartnerLocked : person.consented ? c.privPartnerOn : c.privPartnerOff}</p>
          </div>
          {person.consented && !compiled && (
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => dispatch({ type: "withdraw", id: me })}>
              <Icon name="x" size={14} />
              {c.privWithdraw}
            </button>
          )}
        </div>

        <label className="share-toggle">
          <input type="checkbox" checked={Boolean(person.counselorFull)} onChange={(e) => dispatch({ type: "counselorShare", id: me, on: e.target.checked })} />
          <span>
            <strong>{c.shareFullT}</strong>
            <span className="muted small">{c.shareFullB}</span>
          </span>
        </label>

        <div className="priv-row">
          <div>
            <h3>{c.privDownloadT}</h3>
            <p className="muted small">{c.privDownloadB}</p>
          </div>
          <button type="button" className="btn btn-quiet btn-sm" onClick={download}>
            <Icon name="download" size={14} />
            {c.privDownload}
          </button>
        </div>

        <div className="priv-row priv-danger">
          <div>
            <h3>{c.privDeleteT}</h3>
            <p className="muted small">{c.privDeleteB}</p>
          </div>
          <button type="button" className="btn btn-danger btn-sm" onClick={remove} disabled={busy}>
            <Icon name="x" size={14} />
            {c.privDelete}
          </button>
        </div>
      </section>
      <Ledger light />
      <ActivityLog light />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Counsellor: record what happens after the session                  */
/* ------------------------------------------------------------------ */

const INTEREST_KEYS: Interest[] = ["opt1", "opt2", "opt3", "opt4"];

export function CounselorCarePath() {
  const { state, dispatch } = useSatr();
  const c = t(state.lang);
  const path = carePath(state);
  const [note, setNote] = useState(path.note);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setNote(path.note);
  }, [path.note, state.pairingCode]);

  const after = state.counseling || state.referred;
  const asked = INTEREST_KEYS.filter((k) => state.people.layla.interests.includes(k) || state.people.omar.interests.includes(k));

  return (
    <section className="carepath-controls">
      <h3>{c.cpT}</h3>
      <p className="muted small">{c.cpB}</p>
      <p className="small">
        <strong>{c.cpInterests}</strong> {asked.length ? asked.map((k) => c[k]).join(" · ") : c.cpInterestsNone}
      </p>
      {!after && <p className="muted small">{c.cpNeedsSession}</p>}
      <div className="cp-actions">
        <button type="button" className="btn btn-quiet btn-sm" disabled={!after || path.confirmatory !== "none"} onClick={() => dispatch({ type: "confirm", stage: "ordered" })}>
          <Icon name="scan" size={14} />
          {c.cpConfirmOrder}
        </button>
        <button type="button" className="btn btn-quiet btn-sm" disabled={!after || path.confirmatory !== "ordered"} onClick={() => dispatch({ type: "confirm", stage: "done" })}>
          <Icon name="check" size={14} />
          {c.cpConfirmDone}
        </button>
        <button type="button" className="btn btn-quiet btn-sm" disabled={!after || path.reproductive === "referred"} onClick={() => dispatch({ type: "repro" })}>
          <Icon name="heart" size={14} />
          {c.cpRepro}
        </button>
      </div>
      <label className="field">
        <span>{c.cpNoteLabel}</span>
        <textarea rows={3} value={note} disabled={!after} onChange={(e) => { setNote(e.target.value); setSaved(false); }} />
      </label>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={!after || !note.trim() || note.trim() === path.note}
        onClick={() => {
          dispatch({ type: "counselNote", text: note });
          setSaved(true);
        }}
      >
        <Icon name={saved ? "check" : "send"} size={14} />
        {saved ? c.cpNoteSaved : c.cpNoteSave}
      </button>
    </section>
  );
}

export function fmtDays(lang: "en" | "ar") {
  return (v: number | null | undefined) => (v === null || v === undefined ? "–" : v.toLocaleString(lang === "ar" ? "ar-AE" : "en-GB", { maximumFractionDigits: 1 }));
}

export function groupLabel(key: "ar" | "ar-simple" | "en" | "en-simple", c: Strings): string {
  return key === "ar" ? c.grpAr : key === "ar-simple" ? c.grpArSimple : key === "en" ? c.grpEn : c.grpEnSimple;
}
