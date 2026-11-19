import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { neonApiCaseAdapter } from "./adapters/neonApiAdapter";
import type { SeededCouple, StaffRole } from "./adapters/types";
import { ease, rise, stagger } from "./fx";
import { signInLink } from "./routing";
import { roleLabel } from "./Staff";
import { fill, t, type Strings } from "./strings";
import { useSatr } from "./store";
import { Icon, Mark, type IconName } from "./visuals";

/**
 * "How Satr works": the real application, loaded with fictional couples. From one window you can
 * become any person or staff member and use Satr exactly as they would. Every privacy rule still
 * applies, because every screen is the live app talking to the same server.
 */

const COUPLES_KEY = "satr:access:couples:v1";
const MINE_KEY = "satr:demo:mine:v1";
const DEMO_FLAG = "satr:demo:on";
const DEMO_KEY = "satr-demo";

type Person = { code: string; slot: "layla" | "omar"; token: string; name: { en: string; ar: string } };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private window: the demo simply forgets between visits */
  }
  window.dispatchEvent(new Event("satr-demo-updated"));
}

export function demoIsOn(): boolean {
  try {
    return window.sessionStorage.getItem(DEMO_FLAG) === "1";
  } catch {
    return false;
  }
}

function setDemoOn(on: boolean) {
  try {
    if (on) window.sessionStorage.setItem(DEMO_FLAG, "1");
    else window.sessionStorage.removeItem(DEMO_FLAG);
  } catch {
    /* ignore */
  }
}

const STAGE_KEY: Record<SeededCouple["stage"], keyof Strings> = {
  fresh: "stageFresh",
  agreed: "stageAgreed",
  booked: "stageBooked",
  counselled: "stageCounselled",
  referred: "stageReferred",
};

const STAFF: { role: StaffRole; icon: IconName; body: keyof Strings }[] = [
  { role: "counselor", icon: "steth", body: "staffRoleCounselorB" },
  { role: "court", icon: "court", body: "staffRoleCourtB" },
  { role: "system", icon: "chart", body: "staffRoleSystemB" },
];

/** Shared actions for the hub and the switcher bar. */
function useDemoActions() {
  const { resumeLiveCase, signInStaff, leaveLiveCase, signOutStaff, dispatch, demoKeyHint } = useSatr();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      window.scrollTo({ top: 0 });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    msg,
    setMsg,
    bePerson: (p: Pick<Person, "code" | "token">) =>
      run(async () => {
        const ok = await resumeLiveCase(p.code, p.token);
        if (!ok) throw new Error("That sample person is no longer on the server. Press “Start a fresh demo”.");
      }),
    beStaff: (role: StaffRole, key = demoKeyHint ? DEMO_KEY : "") => run(() => signInStaff(role, key)),
    beNew: () =>
      run(async () => {
        leaveLiveCase();
        signOutStaff();
        dispatch({ type: "view", view: "workspace" });
      }),
  };
}

export function AccessPage() {
  const { state, demoKeyHint } = useSatr();
  const c = t(state.lang);
  const [key, setKey] = useState(demoKeyHint ? DEMO_KEY : "");
  const [couples, setCouples] = useState<SeededCouple[]>(() => readJson<SeededCouple[]>(COUPLES_KEY, []));
  const actions = useDemoActions();
  const seeded = useRef(false);

  useEffect(() => {
    setDemoOn(true);
  }, []);

  useEffect(() => {
    if (demoKeyHint) setKey(DEMO_KEY);
  }, [demoKeyHint]);

  const freshDemo = async (reset: boolean) => {
    actions.setMsg(null);
    try {
      if (reset) await neonApiCaseAdapter.resetAll(key);
      const added = await neonApiCaseAdapter.seedDemo(key);
      setCouples(added);
      writeJson(COUPLES_KEY, added);
      if (reset) writeJson(MINE_KEY, []);
    } catch (err) {
      actions.setMsg(err instanceof Error ? err.message : "Could not load the demo");
    }
  };

  // First visit with the published demo key: load the sample couples straight away.
  useEffect(() => {
    if (seeded.current || couples.length > 0 || !demoKeyHint) return;
    seeded.current = true;
    void freshDemo(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoKeyHint, couples.length]);

  const reset = () => {
    if (!window.confirm(c.accessResetConfirm)) return;
    void freshDemo(true);
  };

  return (
    <main className="desk wrap access-page demo-hub">
      <motion.header className="page-head" variants={stagger} initial="hidden" animate="show">
        <motion.p className="eyebrow" variants={rise}>
          {c.hubKicker}
        </motion.p>
        <motion.h1 variants={rise}>{c.hubTitle}</motion.h1>
        <motion.p className="lead" variants={rise}>
          {c.hubLead}
        </motion.p>
      </motion.header>

      <ol className="ws-steps" aria-label={c.wsStepsLabel}>
        {[c.hubStep1, c.hubStep2, c.hubStep3, c.hubStep4].map((label, i) => (
          <li key={label}>
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>

      {actions.msg && <p className="feedback feedback-warn">{actions.msg}</p>}

      <section className="hub-section">
        <h2>{c.hubCouplesT}</h2>
        <p className="muted small">{c.hubCouplesB}</p>
        {couples.length === 0 ? (
          <p className="muted">{c.accessCouplesNone}</p>
        ) : (
          <div className="hub-couples">
            {couples.map((couple, i) => (
              <motion.article key={couple.code} className="hub-couple" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.05, ease }}>
                <span className="hub-stage">{c[STAGE_KEY[couple.stage]] as string}</span>
                <h3>{couple.label[state.lang].split("·")[0].trim()}</h3>
                <p className="muted small">{couple.label[state.lang].split("·").slice(1).join("·").trim()}</p>
                <div className="hub-people">
                  {(["layla", "omar"] as const).map((slot) => (
                    <div key={slot} className="hub-person">
                      <button type="button" className="btn btn-primary btn-sm" disabled={actions.busy} onClick={() => void actions.bePerson({ code: couple.code, token: couple.people[slot].token })}>
                        <span className="avatar">{couple.people[slot].name[state.lang][0]}</span>
                        {fill(c.hubBe, { name: couple.people[slot].name[state.lang] })}
                      </button>
                      <a className="hub-newtab" href={signInLink(couple.code, couple.people[slot].token)} target="_blank" rel="noopener" title={c.hubNewTab} aria-label={`${c.hubNewTab}: ${couple.people[slot].name[state.lang]}`}>
                        <Icon name="link" size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </section>

      <section className="hub-section">
        <h2>{c.hubStaffT}</h2>
        <p className="muted small">{c.hubStaffB}</p>
        <div className="staff-roles">
          {STAFF.map((s) => (
            <button key={s.role} type="button" className="staff-role" disabled={actions.busy || !key.trim()} onClick={() => void actions.beStaff(s.role, key)}>
              <span className="card-icon">
                <Icon name={s.icon} size={20} />
              </span>
              <strong>{fill(c.hubBeStaff, { role: roleLabel(s.role, c) })}</strong>
              <span className="muted small">{c[s.body] as string}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="hub-section hub-more">
        <button type="button" className="hub-tile" onClick={() => void actions.beNew()}>
          <Icon name="upload" size={22} />
          <strong>{c.hubOwnT}</strong>
          <span className="muted small">{c.hubOwnB}</span>
        </button>
        <a className="hub-tile" href="#/phones">
          <Icon name="users" size={22} />
          <strong>{c.hubPhonesT}</strong>
          <span className="muted small">{c.hubPhonesB}</span>
        </a>
      </section>

      <section className="panel-light access-controls">
        {!demoKeyHint && (
          <label className="field">
            <span>{c.staffKey}</span>
            <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} />
          </label>
        )}
        <div className="cp-actions">
          <button type="button" className="btn btn-quiet" disabled={!key.trim()} onClick={() => void freshDemo(false)}>
            <Icon name="users" size={16} />
            {c.accessSeed}
          </button>
          <button type="button" className="btn btn-danger" disabled={!key.trim()} onClick={reset}>
            <Icon name="refresh" size={16} />
            {c.hubFresh}
          </button>
        </div>
        <p className="muted small">{c.hubFreshB}</p>
      </section>
    </main>
  );
}

/**
 * The switcher shown at the top of every screen while the demo is on: who you are now, and
 * one menu to become anyone else.
 */
export function DemoBar() {
  const { state, liveSession, staffSession, dispatch } = useSatr();
  const c = t(state.lang);
  const actions = useDemoActions();
  const [mine, setMine] = useState<Person[]>(() => readJson<Person[]>(MINE_KEY, []));
  const [couples, setCouples] = useState<SeededCouple[]>(() => readJson<SeededCouple[]>(COUPLES_KEY, []));

  useEffect(() => {
    const reload = () => {
      setCouples(readJson<SeededCouple[]>(COUPLES_KEY, []));
      setMine(readJson<Person[]>(MINE_KEY, []));
    };
    window.addEventListener("satr-demo-updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("satr-demo-updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  // Remember people created in this demo (for example by uploading a report), so you can switch back.
  useEffect(() => {
    if (!liveSession || !state.files[liveSession.slot]?.joined) return;
    const seededHere = couples.some((cp) => cp.code === liveSession.pairingCode);
    if (seededHere) return;
    const name = state.files[liveSession.slot].name;
    const prev = readJson<Person[]>(MINE_KEY, []);
    const rest = prev.filter((p) => !(p.code === liveSession.pairingCode && p.slot === liveSession.slot));
    const next = [{ code: liveSession.pairingCode, slot: liveSession.slot, token: liveSession.token, name }, ...rest].slice(0, 12);
    if (JSON.stringify(next) !== JSON.stringify(prev)) writeJson(MINE_KEY, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveSession?.token, liveSession && state.files[liveSession.slot]?.name.en]);

  const who = staffSession
    ? roleLabel(staffSession.role, c)
    : liveSession
      ? state.files[liveSession.slot]?.name[state.lang] ?? "…"
      : c.hubNobody;

  const current = staffSession ? `s:${staffSession.role}` : liveSession ? `p:${liveSession.pairingCode}:${liveSession.token}` : "";

  const onPick = (value: string) => {
    if (value === "hub") return dispatch({ type: "view", view: "access" });
    if (value === "new") return void actions.beNew();
    const [kind, a, b] = value.split(":");
    if (kind === "s") return void actions.beStaff(a as StaffRole);
    if (kind === "p") return void actions.bePerson({ code: a, token: b });
  };

  return (
    <div className="demo-bar" role="region" aria-label={c.hubKicker}>
      <span className="demo-bar-tag">
        <Mark size={16} />
        {c.hubBarTag}
      </span>
      <span className="demo-bar-who">
        {c.hubYouAre} <strong>{who}</strong>
      </span>
      <label className="demo-bar-switch">
        <span className="sr-only">{c.hubSwitch}</span>
        <select value={current} disabled={actions.busy} onChange={(e) => onPick(e.target.value)}>
          <option value="" disabled>
            {c.hubSwitch}
          </option>
          {couples.map((cp) => (
            <optgroup key={cp.code} label={cp.label[state.lang].split("·")[0].trim()}>
              {(["layla", "omar"] as const).map((slot) => (
                <option key={slot} value={`p:${cp.code}:${cp.people[slot].token}`}>
                  {cp.people[slot].name[state.lang]}
                </option>
              ))}
            </optgroup>
          ))}
          {mine.length > 0 && (
            <optgroup label={c.hubMine}>
              {mine.map((p) => (
                <option key={`${p.code}-${p.slot}`} value={`p:${p.code}:${p.token}`}>
                  {p.name[state.lang]} · {p.code}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={c.hubStaffT}>
            {STAFF.map((s) => (
              <option key={s.role} value={`s:${s.role}`}>
                {roleLabel(s.role, c)}
              </option>
            ))}
          </optgroup>
          <optgroup label="—">
            <option value="new">{c.hubOwnT}</option>
            <option value="hub">{c.hubBack}</option>
          </optgroup>
        </select>
      </label>
      <button type="button" className="demo-bar-hub" onClick={() => dispatch({ type: "view", view: "access" })}>
        <Icon name="users" size={14} />
        {c.hubBack}
      </button>
    </div>
  );
}
