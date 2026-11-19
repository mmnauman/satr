import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import type { StaffRole } from "./adapters/types";
import { ease, rise, stagger } from "./fx";
import { fill, t, type Strings } from "./strings";
import { useSatr } from "./store";
import { Icon, type IconName } from "./visuals";

const ROLES: { role: StaffRole; icon: IconName; title: keyof Strings; body: keyof Strings }[] = [
  { role: "counselor", icon: "steth", title: "staffRoleCounselor", body: "staffRoleCounselorB" },
  { role: "court", icon: "court", title: "staffRoleCourt", body: "staffRoleCourtB" },
  { role: "system", icon: "chart", title: "staffRoleSystem", body: "staffRoleSystemB" },
];

export function roleLabel(role: StaffRole, c: Strings): string {
  return role === "counselor" ? c.staffRoleCounselor : role === "court" ? c.staffRoleCourt : c.staffRoleSystem;
}

/** Staff sign-in. Shown on #/staff, and in place of any desk the current browser may not open. */
export function StaffSignIn({ wanted }: { wanted?: StaffRole }) {
  const { state, signInStaff, demoKeyHint } = useSatr();
  const c = t(state.lang);
  const [role, setRole] = useState<StaffRole>(wanted ?? "counselor");
  const [key, setKey] = useState(demoKeyHint ? "satr-demo" : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInStaff(role, key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="desk wrap staff-page">
      <motion.header className="page-head" variants={stagger} initial="hidden" animate="show">
        <motion.p className="eyebrow" variants={rise}>
          {c.staffKicker}
        </motion.p>
        <motion.h1 variants={rise}>{c.staffTitle}</motion.h1>
        <motion.p className="lead" variants={rise}>
          {c.staffLead}
        </motion.p>
      </motion.header>

      {wanted && (
        <p className="feedback feedback-warn">
          <Icon name="lock" size={16} />
          {fill(c.staffNeed, { role: roleLabel(wanted, c) })}
        </p>
      )}

      <motion.form className="panel-light staff-card" onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <div className="staff-roles" role="radiogroup" aria-label={c.staffKicker}>
          {ROLES.map((r) => (
            <button
              key={r.role}
              type="button"
              role="radio"
              aria-checked={role === r.role}
              className={role === r.role ? "staff-role is-on" : "staff-role"}
              onClick={() => setRole(r.role)}
            >
              <span className="card-icon">
                <Icon name={r.icon} size={20} />
              </span>
              <strong>{c[r.title] as string}</strong>
              <span className="muted small">{c[r.body] as string}</span>
            </button>
          ))}
        </div>

        <label className="field">
          <span>{c.staffKey}</span>
          <input type="password" autoComplete="off" required value={key} onChange={(e) => setKey(e.target.value)} />
        </label>
        {demoKeyHint && <p className="muted small">{fill(c.staffKeyHint, { key: "satr-demo" })}</p>}
        {error && (
          <p className="feedback feedback-warn">
            <Icon name="info" size={16} />
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !key.trim()}>
          <Icon name="shieldCheck" size={16} />
          {busy ? c.staffBusy : c.staffSignIn}
        </button>
      </motion.form>
    </main>
  );
}

/** The court clerk looks a couple up by pairing code and gets the gene-free certificate. */
export function CourtLookup() {
  const { state, lookupCourtCase } = useSatr();
  const c = t(state.lang);
  const [code, setCode] = useState("");
  const [miss, setMiss] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMiss(false);
    const ok = await lookupCourtCase(code.trim().toUpperCase());
    setMiss(!ok);
    setBusy(false);
  };

  return (
    <form className="panel-light court-lookup" onSubmit={submit}>
      <h2>{c.courtLookupT}</h2>
      <p className="muted small">{c.courtLookupB}</p>
      <div className="court-lookup-row">
        <input className="code-input" required maxLength={10} placeholder="K7M2P9" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} aria-label={c.wsPairingCode} />
        <button type="submit" className="btn btn-primary" disabled={busy || !code.trim()}>
          <Icon name="court" size={16} />
          {c.courtLookupBtn}
        </button>
      </div>
      {miss && <p className="feedback feedback-warn">{c.courtLookupMiss}</p>}
    </form>
  );
}
