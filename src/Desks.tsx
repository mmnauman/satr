import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CountUp, ease, rise, stagger } from "./fx";
import { PEOPLE, TIER_TWO, courtRows, intersectionGenes, type PersonId } from "./content";
import { ALL_GENE_TOKENS, leakedTokens } from "./logic";
import { fill, t } from "./strings";
import { isExplained, isReleased, useSatr } from "./store";
import { Icon, Seal } from "./visuals";

function RoleNote({ title, body }: { title: string; body: string }) {
  return (
    <motion.aside className="role-note" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
      <h2>{title}</h2>
      <p>{body}</p>
    </motion.aside>
  );
}

function PageHead({ kicker, title, lead }: { kicker: string; title: string; lead: string }) {
  return (
    <motion.header className="page-head" variants={stagger} initial="hidden" animate="show">
      <motion.p className="eyebrow" variants={rise}>
        {kicker}
      </motion.p>
      <motion.h1 variants={rise}>{title}</motion.h1>
      <motion.p className="lead" variants={rise}>
        {lead}
      </motion.p>
    </motion.header>
  );
}

export function CounselorDesk() {
  const { state, dispatch } = useSatr();
  const c = t(state.lang);
  const [open, setOpen] = useState<"one" | "two">("one");
  const explained = isExplained(state);
  const status1 = state.counseling ? c.stDone : explained ? c.stReady : c.stWaiting;
  const status2 = state.referred ? c.stReferred : c.stCommittee;

  return (
    <main className="desk wrap">
      <PageHead kicker={c.deskKicker} title={c.deskTitle} lead={c.deskLead} />
      <p className="staff-note">
        <Icon name="steth" size={16} />
        {c.deskStaff}
      </p>
      <RoleNote title={c.deskRoleT} body={c.deskRoleB} />
      <div className="desk-grid">
        <motion.aside className="queue" variants={stagger} initial="hidden" animate="show">
          <motion.div className="queue-clear" variants={rise}>
            <p className="queue-big">{c.clearCount}</p>
            <p>
              <strong>{c.clearT}</strong>
            </p>
            <p className="muted small">{c.clearB}</p>
          </motion.div>
          <motion.button variants={rise} type="button" className={open === "one" ? "case is-on" : "case"} onClick={() => setOpen("one")}>
            <span className="case-top">
              <strong>
                {PEOPLE.layla.name[state.lang]} & {PEOPLE.omar.name[state.lang]}
              </strong>
              <span className={state.counseling ? "badge badge-good" : explained ? "badge badge-gold" : "badge"}>{status1}</span>
            </span>
            <span className="muted small">{c.tier1}</span>
          </motion.button>
          <motion.button variants={rise} type="button" className={open === "two" ? "case is-on" : "case"} onClick={() => setOpen("two")}>
            <span className="case-top">
              <strong>{TIER_TWO.names[state.lang]}</strong>
              <span className="badge badge-warn">{status2}</span>
            </span>
            <span className="muted small">{c.tier2}</span>
          </motion.button>
        </motion.aside>

        {open === "one" ? (
          <motion.article key={open} className="case-detail" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            <header className="case-head">
              <div>
                <h2>
                  {PEOPLE.layla.name[state.lang]} & {PEOPLE.omar.name[state.lang]}
                </h2>
                <p className="muted small">
                  {PEOPLE.layla.number} · {PEOPLE.omar.number} · {c.tier1}
                </p>
              </div>
              <span className={state.counseling ? "badge badge-good" : explained ? "badge badge-gold" : "badge"}>{status1}</span>
            </header>

            <div className="detail-grid">
              <section>
                <h3 className="sub">{c.sharedGenes}</h3>
                <motion.ul className="gene-list" variants={stagger} initial="hidden" animate="show">
                  {intersectionGenes().map((gene) => (
                    <motion.li key={gene} className="gene-chip gene-chip-gold" variants={rise}>
                      <strong>{gene}</strong>
                      <span>{PEOPLE.layla.findings.find((f) => f.gene === gene)?.condition[state.lang]}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              </section>
              <section>
                <h3 className="sub">{c.privateGenes}</h3>
                <motion.ul className="gene-list" variants={stagger} initial="hidden" animate="show">
                  {(["layla", "omar"] as const).flatMap((id) =>
                    PEOPLE[id].findings
                      .filter((f) => !intersectionGenes().includes(f.gene))
                      .map((f) => (
                        <motion.li key={`${id}-${f.gene}`} className="gene-chip" variants={rise}>
                          <strong>{f.gene}</strong>
                          <span>
                            {PEOPLE[id].name[state.lang]} · {f.condition[state.lang]}
                          </span>
                        </motion.li>
                      )),
                  )}
                </motion.ul>
              </section>
            </div>

            <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28, ease }}>
              <h3 className="sub">{c.theirWords}</h3>
              <div className="words">
                {(["layla", "omar"] as const).map((id) => (
                  <Words key={id} id={id} />
                ))}
              </div>
            </motion.section>

            <div className="detail-grid">
              <section>
                <h3 className="sub">{c.questions}</h3>
                <Questions />
              </section>
              <section>
                <h3 className="sub">{c.interests}</h3>
                <Interests />
                <h3 className="sub">{c.bookingLabel}</h3>
                <p className="muted">{state.booking ? c[state.booking] : c.noBooking}</p>
              </section>
            </div>

            <footer className="case-foot">
              {state.counseling ? (
                <motion.p className="feedback feedback-good" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <Icon name="shieldCheck" size={16} />
                  {c.recordDone}
                </motion.p>
              ) : (
                <>
                  <button type="button" className="btn btn-primary" disabled={!explained} onClick={() => dispatch({ type: "counsel" })}>
                    <Icon name="check" size={16} />
                    {c.recordSession}
                  </button>
                  {!explained && <p className="muted small">{c.recordNeeds}</p>}
                </>
              )}
            </footer>
          </motion.article>
        ) : (
          <motion.article key={open} className="case-detail" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
            <header className="case-head">
              <div>
                <h2>{TIER_TWO.names[state.lang]}</h2>
                <p className="muted small">
                  {TIER_TWO.id} · {c.tier2}
                </p>
              </div>
              <span className="badge badge-warn">{status2}</span>
            </header>
            <p className="lead-sm">{TIER_TWO.summary[state.lang]}</p>
            <section>
              <h3 className="sub">{c.sharedGenes}</h3>
              <ul className="gene-list">
                {TIER_TWO.shared.map((gene) => (
                  <li key={gene} className="gene-chip gene-chip-gold">
                    <strong>{gene}</strong>
                  </li>
                ))}
              </ul>
            </section>
            <p className="note-warn">
              <Icon name="info" size={16} />
              {TIER_TWO.uncertain[state.lang]}
            </p>
            <section>
              <h3 className="sub">{c.theirWords}</h3>
              <ol className="quotes">
                {TIER_TWO.quotes[state.lang].map((quote) => (
                  <li key={quote}>“{quote}”</li>
                ))}
              </ol>
            </section>
            <footer className="case-foot">
              {state.referred ? (
                <p className="feedback feedback-good">
                  <Icon name="check" size={16} />
                  {c.referred}
                </p>
              ) : (
                <>
                  <p className="muted">
                    <strong>{c.cantClose}</strong>
                  </p>
                  <button type="button" className="btn btn-primary" onClick={() => dispatch({ type: "refer" })}>
                    <Icon name="send" size={16} className="flip-rtl" />
                    {c.refer}
                  </button>
                </>
              )}
            </footer>
          </motion.article>
        )}
      </div>
    </main>
  );
}

function Words({ id }: { id: PersonId }) {
  const { state } = useSatr();
  const c = t(state.lang);
  const answers = state.people[id].answers.filter(Boolean);
  return (
    <div className="words-card">
      <p className="words-who">
        <span className="avatar">{PEOPLE[id].initial[state.lang]}</span>
        {PEOPLE[id].name[state.lang]}
      </p>
      {answers.length === 0 ? (
        <p className="muted small">{c.nothingYet}</p>
      ) : (
        <ol className="quotes quotes-sm">
          {answers.map((answer) => (
            <li key={answer}>“{answer}”</li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Questions() {
  const { state } = useSatr();
  const c = t(state.lang);
  const asked = state.audit.filter((event) => event.code === "escalate" && event.detail);
  if (!asked.length) return <p className="muted small">{c.noQuestions}</p>;
  return (
    <ul className="asked">
      {asked.map((event, i) => (
        <li key={i}>
          <strong>{event.id ? PEOPLE[event.id].name[state.lang] : ""}</strong>
          <span>“{event.detail}”</span>
        </li>
      ))}
    </ul>
  );
}

function Interests() {
  const { state } = useSatr();
  const c = t(state.lang);
  const rows = (["layla", "omar"] as const).filter((id) => state.people[id].interests.length);
  if (!rows.length) return <p className="muted small">{c.noInterests}</p>;
  return (
    <ul className="asked">
      {rows.map((id) => (
        <li key={id}>
          <strong>{PEOPLE[id].name[state.lang]}</strong>
          <span>{state.people[id].interests.map((i) => c[i]).join(" · ")}</span>
        </li>
      ))}
    </ul>
  );
}

export function CourtDesk() {
  const { state } = useSatr();
  const c = t(state.lang);
  const released = isReleased(state);
  const rows = courtRows({ explained: isExplained(state), released }, state.lang);
  const text = [c.courtTitle, c.certFooter, ...rows.map((row) => `${row.label} ${row.value}`)].join(" ");
  const condition = (["layla", "omar"] as const).flatMap((id) => PEOPLE[id].findings.map((f) => f.condition[state.lang]));
  const found = leakedTokens(text, [...ALL_GENE_TOKENS, ...condition]);
  const words = text.split(/\s+/).filter(Boolean).length;

  return (
    <main className="desk wrap">
      <PageHead kicker={c.courtKicker} title={c.courtTitle} lead={c.courtLead} />
      <RoleNote title={c.courtRoleT} body={c.courtRoleB} />
      <div className="court-grid">
        <motion.article className={released ? "cert is-issued" : "cert"} initial={{ opacity: 0, y: 40, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.8, ease }}>
          <span className="cert-scan" aria-hidden="true" />
          <span className="cert-watermark" aria-hidden="true">
            {c.certSample}
          </span>
          <header className="cert-head">
            <Seal size={84} />
            <div>
              <p className="eyebrow">{c.brand}</p>
              <h2>{c.courtTitle}</h2>
            </div>
            <AnimatePresence mode="wait">
              <motion.span
                key={String(released)}
                className={released ? "stamp stamp-good" : "stamp"}
                initial={released ? { scale: 2.6, opacity: 0, rotate: -18 } : { opacity: 0 }}
                animate={{ scale: 1, opacity: 1, rotate: -4 }}
                transition={released ? { type: "spring", stiffness: 260, damping: 13, delay: 0.7 } : { duration: 0.3 }}
              >
                {released ? c.certIssued : c.certPending}
              </motion.span>
            </AnimatePresence>
          </header>
          <motion.dl className="cert-rows" variants={stagger} initial="hidden" animate="show">
            {rows.map((row) => (
              <motion.div key={row.label} variants={rise}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </motion.div>
            ))}
          </motion.dl>
          <p className="cert-foot">{c.certFooter}</p>
        </motion.article>
        <motion.aside className="scan" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.25, ease }}>
          <h3 className="panel-title-dark">
            <Icon name="scan" size={18} />
            {c.scanT}
          </h3>
          <div className="scan-big">
            <span className={found.length ? "scan-num scan-bad" : "scan-num"}>{found.length}</span>
            <span>{fill(c.scanFound, { n: "" }).trim()}</span>
          </div>
          <p className="muted small scan-words">
            <span className="scan-bar" aria-hidden="true" />
            {fill(c.scanWords, { n: words })}
          </p>
          <p className="muted small">{c.scanNote}</p>
          <p className="note-good">
            <Icon name="shieldCheck" size={16} />
            {c.schemaNote}
          </p>
        </motion.aside>
      </div>
    </main>
  );
}

export function SystemDesk() {
  const { state } = useSatr();
  const c = t(state.lang);
  const count = (code: string) => state.audit.filter((event) => event.code === code).length;
  const funnel = [
    { label: c.f1, value: 100 },
    { label: c.f2, value: 96 },
    { label: c.f3, value: 91 },
    { label: c.f4, value: 23 },
    { label: c.f5, value: 9 },
  ];

  return (
    <main className="desk wrap">
      <PageHead kicker={c.sysKicker} title={c.sysTitle} lead={c.sysLead} />
      <p className="eyebrow muted-eyebrow">{c.sysIllustrative}</p>
      <RoleNote title={c.sysRoleT} body={c.sysRoleB} />
      <motion.div className="kpis" variants={stagger} initial="hidden" animate="show">
        <Kpi value={74} suffix="%" label={c.kpi1} />
        <Kpi value={91} suffix="%" label={c.kpi2} />
        <Kpi value={4} label={c.kpi3} />
        <Kpi value={0} label={c.kpi4} good />
      </motion.div>

      <section className="live-strip">
        <h3>
          <span className="live-dot" aria-hidden="true" />
          {c.liveT}
        </h3>
        <div>
          <p>
            <strong>{count("fail")}</strong> {c.live1}
          </p>
          <p>
            <strong>{count("escalate")}</strong> {c.live2}
          </p>
          <p>
            <strong>{count("open")}</strong> {c.live3}
          </p>
        </div>
      </section>

      <div className="sys-grid">
        <section className="panel-light">
          <h3>{c.byRegion}</h3>
          <Bar label={c.abu} value={78} />
          <Bar label={c.ain} value={72} />
          <Bar label={c.dhafra} value={63} warn />
          <p className="muted small">{c.equityNote}</p>
        </section>
        <section className="panel-light">
          <h3>{c.byLang}</h3>
          <Bar label={c.arVoice} value={76} />
          <Bar label={c.arSimple} value={73} />
          <Bar label={c.arText} value={69} />
          <Bar label={c.enText} value={77} />
        </section>
      </div>

      <section className="panel-light">
        <h3>{c.funnelT}</h3>
        <div className="funnel">
          {funnel.map((step, i) => (
            <div key={step.label} className="funnel-step">
              <motion.div
                className="funnel-bar"
                initial={{ height: "0%" }}
                whileInView={{ height: `${Math.max(step.value, 6)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: i * 0.12, ease }}
              >
                <span>{step.value}%</span>
              </motion.div>
              <p>{step.label}</p>
              {i < funnel.length - 1 && <Icon name="arrowRight" size={14} className="funnel-arrow flip-rtl" />}
            </div>
          ))}
        </div>
      </section>

      <div className="sys-grid">
        <section className="note-card">
          <h3>
            <Icon name="eyeOff" size={18} />
            {c.notMeasuredT}
          </h3>
          <p>{c.notMeasuredB}</p>
        </section>
        <section className="panel-light">
          <h3>{c.publishedT}</h3>
          <ul className="pub">
            <li>
              <strong>570</strong> {c.stat1}
            </li>
            <li>
              <strong>2,428</strong> {c.stat2}
            </li>
            <li>
              <strong>92%+</strong> {c.stat3}
            </li>
            <li>
              <strong>~10</strong> {c.stat4}
            </li>
          </ul>
          <p className="source">{c.statsSource}</p>
        </section>
      </div>

      <section className="panel-light">
        <h3>{c.rulesT}</h3>
        <ol className="rules">
          {[c.r1, c.r2, c.r3, c.r4, c.r5, c.r6].map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function Kpi({ value, suffix = "", label, good }: { value: number; suffix?: string; label: string; good?: boolean }) {
  return (
    <motion.div className={good ? "kpi kpi-good" : "kpi"} variants={rise} whileHover={{ y: -4 }}>
      <p className="kpi-value">
        <CountUp to={value} suffix={suffix} />
      </p>
      <p className="kpi-label">{label}</p>
    </motion.div>
  );
}

function Bar({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="bar">
      <div className="bar-top">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="bar-track" role="img" aria-label={`${label} ${value}%`}>
        <motion.div
          className={warn ? "bar-fill bar-warn" : "bar-fill"}
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease }}
        />
      </div>
    </div>
  );
}
