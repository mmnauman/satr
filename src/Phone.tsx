import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PEOPLE, TOGETHER, intersectionGenes, inviteText, partnerOf, prompts, type PersonId } from "./content";
import { ease } from "./fx";
import { ALL_GENE_TOKENS, leakedTokens } from "./logic";
import { renderTurn } from "./loop";
import { fill, reasonText, t, type Strings } from "./strings";
import { isCompiled, isExplained, isReleased, useSatr, type Interest, type Screen, type Slot, type State } from "./store";
import { FamilyTree, Icon, Mark, RiskPicture, type IconName } from "./visuals";

const TABS: { screen: Screen; icon: IconName; key: keyof Strings }[] = [
  { screen: "home", icon: "home", key: "tabHome" },
  { screen: "result", icon: "dna", key: "tabResult" },
  { screen: "share", icon: "together", key: "tabTogether" },
  { screen: "explain", icon: "pen", key: "tabExplain" },
  { screen: "ask", icon: "chat", key: "tabAsk" },
];

function usePerson(id: PersonId) {
  const { state, dispatch } = useSatr();
  const c = t(state.lang);
  const file = PEOPLE[id];
  const partner = partnerOf(id);
  return {
    state,
    dispatch,
    c,
    file,
    person: state.people[id],
    name: file.name[state.lang],
    partnerName: partner.name[state.lang],
    compiled: isCompiled(state),
  };
}

export function Phone({ id }: { id: PersonId }) {
  const { state, dispatch, c, person, name } = usePerson(id);
  const scroller = useRef<HTMLDivElement>(null);
  const active = person.screen === "family" ? "home" : person.screen;

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [person.screen]);

  return (
    <div className={state.focus === id ? "phone is-focus" : "phone"} onPointerDown={() => state.focus !== id && dispatch({ type: "focus", id })}>
      <div className="phone-notch" aria-hidden="true" />
      <div className="phone-status" aria-hidden="true">
        <span>9:41</span>
        <span className="phone-status-icons">
          <Icon name="shieldCheck" size={13} />
        </span>
      </div>
      <header className="phone-head">
        <div className="phone-brand">
          <Mark size={22} />
          <span>{c.brand}</span>
        </div>
        <div className="phone-head-tools">
          <button
            type="button"
            className={person.simple ? "pill-toggle is-on" : "pill-toggle"}
            onClick={() => dispatch({ type: "simple", id })}
            aria-pressed={person.simple}
          >
            <Icon name="eye" size={14} />
            {c.simpleOn}
          </button>
          <span className="avatar" aria-label={name}>
            {PEOPLE[id].initial[state.lang]}
          </span>
        </div>
      </header>
      <Toast id={id} />
      <div className="phone-body" ref={scroller}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={person.screen}
            className="screen-wrap"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {person.screen === "home" && <Home id={id} />}
            {person.screen === "result" && <ResultScreen id={id} />}
            {person.screen === "share" && <ShareScreen id={id} />}
            {person.screen === "explain" && <ExplainScreen id={id} />}
            {person.screen === "ask" && <AskScreen id={id} />}
            {person.screen === "family" && <FamilyScreen id={id} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <nav className="phone-tabs" aria-label={name}>
        {TABS.map((tab) => (
          <button
            key={tab.screen}
            type="button"
            className={active === tab.screen ? "is-on" : ""}
            aria-current={active === tab.screen ? "page" : undefined}
            onClick={() => dispatch({ type: "screen", id, screen: tab.screen })}
          >
            <Icon name={tab.icon} size={20} />
            <span>{c[tab.key]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/** A push notification that drops in when something happens on the other side of the case. */
function Toast({ id }: { id: PersonId }) {
  const { state, c, partnerName } = usePerson(id);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  const seen = useRef(state.audit.length);
  const latest = state.audit[state.audit.length - 1];

  useEffect(() => {
    if (state.audit.length <= seen.current) {
      seen.current = state.audit.length;
      return;
    }
    seen.current = state.audit.length;
    if (!latest) return;
    let text = "";
    if (latest.code === "consent" && latest.id !== id) text = fill(c.toastAgreed, { name: partnerName });
    if (latest.code === "compiled") text = c.toastMatched;
    if (latest.code === "counsel") text = c.toastCounsel;
    if (!text) return;
    const show = window.setTimeout(() => setToast({ text, key: latest.at }), 0);
    return () => window.clearTimeout(show);
  }, [state.audit.length, latest, id, c, partnerName]);

  useEffect(() => {
    if (!toast) return;
    const hide = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(hide);
  }, [toast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.key}
          className="toast"
          initial={{ y: -80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -60, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
        >
          <span className="toast-icon">
            <Mark size={16} />
          </span>
          <div>
            <p className="toast-app">{c.brand}</p>
            <p>{toast.text}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type JourneyState = "done" | "now" | "next" | "waiting";

function journey(state: State, id: PersonId): JourneyState[] {
  const me = state.people[id];
  const compiled = isCompiled(state);
  const explained = isExplained(state);
  return [
    me.opened ? "done" : "now",
    compiled ? "done" : me.consented ? "waiting" : me.opened ? "now" : "next",
    me.passed ? "done" : compiled ? "now" : "next",
    state.counseling ? "done" : explained ? "now" : me.passed ? "waiting" : "next",
    isReleased(state) ? "done" : "next",
  ];
}

function Home({ id }: { id: PersonId }) {
  const { state, dispatch, c, person, name, partnerName, compiled } = usePerson(id);
  const steps = journey(state, id);
  const labels = [c.j1, c.j2, c.j3, c.j4, c.j5];

  let message = c.homeSealed;
  let cta = c.ctaOpen;
  let go: () => void = () => dispatch({ type: "open", id });
  if (state.counseling) {
    message = c.homeReleased;
    cta = c.ctaReleased;
    go = () => dispatch({ type: "screen", id, screen: "share" });
  } else if (person.passed) {
    message = state.booking ? c.homeBooked : c.homePassed;
    cta = state.booking ? c.ctaBooked : c.ctaBook;
    go = () => dispatch({ type: "screen", id, screen: "explain" });
  } else if (compiled) {
    message = c.homeCompiled;
    cta = c.ctaExplain;
    go = () => dispatch({ type: "screen", id, screen: "explain" });
  } else if (person.consented) {
    message = c.homeWaiting;
    cta = c.ctaWaiting;
    go = () => dispatch({ type: "screen", id, screen: "share" });
  } else if (person.opened) {
    message = c.homeOpened;
    cta = c.ctaShare;
    go = () => dispatch({ type: "screen", id, screen: "share" });
  }

  return (
    <div className="screen">
      <section className="hello">
        <h2>{fill(c.greeting, { name })}</h2>
        <p>{fill(message, { partner: partnerName })}</p>
        <button type="button" className="btn btn-primary btn-block" onClick={go}>
          {cta}
          <Icon name="arrowRight" size={16} className="flip-rtl" />
        </button>
      </section>

      <section className="card">
        <h3 className="card-title">{c.journeyTitle}</h3>
        <ol className="journey">
          {labels.map((label, i) => (
            <li key={label} className={`j-${steps[i]}`}>
              <span className="j-dot">{steps[i] === "done" ? <Icon name="check" size={13} /> : i + 1}</span>
              <span className="j-label">{label}</span>
              <span className="j-state">
                {steps[i] === "done"
                  ? c.jDone
                  : steps[i] === "now"
                    ? c.jNow
                    : steps[i] === "waiting"
                      ? fill(c.jWaiting, { name: partnerName })
                      : c.jNext}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="card card-quiet">
        <div className="card-row">
          <span className="card-icon">
            <Icon name="lock" size={18} />
          </span>
          <div>
            <h3 className="card-title">{c.privacyT}</h3>
            <p className="muted">{fill(c.privacyB, { partner: partnerName })}</p>
          </div>
        </div>
      </section>

      <button type="button" className="card card-link" onClick={() => dispatch({ type: "screen", id, screen: "family" })}>
        <div className="card-row">
          <span className="card-icon card-icon-gold">
            <Icon name="users" size={18} />
          </span>
          <div>
            <h3 className="card-title">{c.familyT}</h3>
            <p className="muted">{c.familyB}</p>
          </div>
          <Icon name="arrowRight" size={16} className="flip-rtl card-chevron" />
        </div>
      </button>
    </div>
  );
}

function ResultScreen({ id }: { id: PersonId }) {
  const { state, dispatch, c, file, person, partnerName, compiled } = usePerson(id);
  const [learn, setLearn] = useState(false);
  const shared = new Set(intersectionGenes());
  const reduceMotion = useReducedMotion();

  if (!person.opened) {
    return (
      <div className="screen screen-center">
        <div className="sealed">
          <div className="sealed-envelope" aria-hidden="true">
            <Icon name="lock" size={30} />
          </div>
          <h2>{c.sealedT}</h2>
          <p>{fill(c.sealedB, { partner: partnerName })}</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => dispatch({ type: "open", id })}>
            {c.ctaOpen}
          </button>
          <p className="fine">{c.sealedNote}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <header className="screen-head">
        <h2>{c.resultT}</h2>
        <p>{fill(c.resultB, { n: file.findings.length })}</p>
      </header>
      {file.findings.map((finding, i) => {
        const isShared = shared.has(finding.gene);
        const tag = !isShared ? c.tagPrivate : compiled ? c.tagShared : c.tagMaybe;
        const text = person.simple ? finding.simple[state.lang] : finding.body[state.lang];
        return (
          <motion.article
            key={finding.gene}
            className={isShared && compiled ? "finding finding-shared" : "finding"}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.08 + i * 0.12, ease }}
          >
            <div className="finding-top">
              <div>
                <p className="gene">{finding.gene}</p>
                <p className="condition">{finding.condition[state.lang]}</p>
              </div>
              <Listen text={`${finding.condition[state.lang]}. ${text}`} />
            </div>
            <div className="finding-tags">
              <span className={isShared && compiled ? "tag tag-gold" : isShared ? "tag" : "tag tag-lock"}>
                <Icon name={isShared && compiled ? "users" : "lock"} size={12} />
                {tag}
              </span>
              <span className="tag tag-calm">
                <Icon name="heart" size={12} />
                {c.riskCarrier}
              </span>
            </div>
            {person.simple ? (
              <div className="simple-card">
                <span className="simple-figure" aria-hidden="true">
                  <Icon name="heart" size={26} />
                </span>
                <p className="simple-text">{text}</p>
              </div>
            ) : (
              <p className="finding-body">{text}</p>
            )}
          </motion.article>
        );
      })}
      <section className="card">
        <button type="button" className="disclosure" aria-expanded={learn} onClick={() => setLearn(!learn)}>
          <Icon name="info" size={18} />
          <span>{c.learnT}</span>
          <Icon name="arrowRight" size={16} className={learn ? "rot-90" : "flip-rtl"} />
        </button>
        {learn && (
          <div className="learn">
            {(
              [
                [c.learn1t, c.learn1b],
                [c.learn2t, c.learn2b],
                [c.learn3t, c.learn3b],
              ] as const
            ).map(([title, body]) => (
              <div key={title}>
                <h4>{title}</h4>
                <p>{body}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function useFreshMatch(compiledAt: number | undefined) {
  const [, tick] = useState(0);
  const fresh = compiledAt !== undefined && Date.now() - compiledAt < 1800;
  useEffect(() => {
    if (!fresh || compiledAt === undefined) return;
    const timer = window.setTimeout(() => tick((n) => n + 1), 1850 - (Date.now() - compiledAt));
    return () => window.clearTimeout(timer);
  }, [fresh, compiledAt]);
  return fresh;
}

function ShareScreen({ id }: { id: PersonId }) {
  const { state, dispatch, c, person, name, partnerName, compiled } = usePerson(id);
  const partner = state.people[partnerOf(id).id];
  const compiledAt = state.audit.find((event) => event.code === "compiled")?.at;
  const matching = useFreshMatch(compiledAt);
  const reduceMotion = useReducedMotion();

  if (!person.opened) {
    return (
      <div className="screen screen-center">
        <div className="sealed">
          <div className="sealed-envelope" aria-hidden="true">
            <Icon name="together" size={30} />
          </div>
          <p>{fill(c.shareLocked, { partner: partnerName })}</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => dispatch({ type: "open", id })}>
            {c.ctaOpen}
          </button>
        </div>
      </div>
    );
  }

  if (!compiled || matching) {
    return (
      <div className="screen">
        <header className="screen-head">
          <h2>{fill(c.shareT, { partner: partnerName })}</h2>
          <p>{c.shareB}</p>
        </header>
        <div className="handshake">
          <div className={person.consented ? "hs-person is-yes" : "hs-person"}>
            <span className="avatar avatar-lg">{PEOPLE[id].initial[state.lang]}</span>
            <strong>{c.you}</strong>
            <span>{person.consented ? c.agreed : c.notYet}</span>
          </div>
          <div className={matching ? "hs-link is-matching" : person.consented && partner.consented ? "hs-link is-done" : "hs-link"}>
            <Icon name={matching ? "refresh" : "lock"} size={18} className={matching ? "spin" : ""} />
          </div>
          <div className={partner.consented ? "hs-person is-yes" : "hs-person"}>
            <span className="avatar avatar-lg">{partnerOf(id).initial[state.lang]}</span>
            <strong>{partnerName}</strong>
            <span>{partner.consented ? c.agreed : c.notYet}</span>
          </div>
        </div>
        {matching ? (
          <p className="matching-note">{c.matching}</p>
        ) : (
          <>
            <ul className="checks">
              {[c.share1, fill(c.share2, { partner: partnerName }), fill(c.share3, { partner: partnerName })].map((line) => (
                <li key={line}>
                  <Icon name="check" size={16} />
                  {line}
                </li>
              ))}
            </ul>
            {person.consented ? (
              <div className="waiting-box">
                <p>
                  <Icon name="clock" size={16} />
                  {fill(c.jWaiting, { name: partnerName })}
                </p>
                <button type="button" className="btn btn-quiet btn-block" onClick={() => dispatch({ type: "withdraw", id })}>
                  {c.shareUndo}
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-primary btn-block" onClick={() => dispatch({ type: "consent", id })}>
                {c.shareYes}
              </button>
            )}
          </>
        )}
        <span className="sr-only">{name}</span>
      </div>
    );
  }

  const genes = intersectionGenes();
  return (
    <div className="screen">
      <header className="screen-head">
        <h2>{c.togetherT}</h2>
        <p>{c.togetherSub}</p>
      </header>
      {genes.map((gene, i) => (
        <motion.article
          key={gene}
          className="finding finding-shared"
          initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, delay: reduceMotion ? 0 : 0.1 + i * 0.14, ease }}
        >
          <div className="finding-top">
            <div>
              <p className="gene">{gene}</p>
              <p className="condition">{PEOPLE[id].findings.find((f) => f.gene === gene)?.condition[state.lang]}</p>
            </div>
            <Listen text={TOGETHER[gene][state.lang]} />
          </div>
          {!person.simple && <p className="finding-body">{TOGETHER[gene][state.lang]}</p>}
        </motion.article>
      ))}
      <motion.section
        className="card"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.35, ease }}
      >
        <h3 className="card-title">{c.riskT}</h3>
        <RiskPicture affected={c.riskAffected} carrier={c.riskCarrier} neither={c.riskNeither} />
        <p className="muted small">{c.riskNote}</p>
      </motion.section>
      <section className="card card-quiet">
        <h3 className="card-title">{c.familyWhyT}</h3>
        <div className="mini-tree">
          <FamilyTree grand={c.treeGrand} layla={c.treeLayla} omar={c.treeOmar} carrier={c.treeCarrier} />
        </div>
        <p className="muted small">{c.familyWhyB}</p>
      </section>
      <motion.p
        className="private-note"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: reduceMotion ? 0 : 0.5, ease }}
      >
        <Icon name="lock" size={15} />
        {fill(c.stayedPrivate, { partner: partnerName })}
      </motion.p>
      <section className="card">
        <h3 className="card-title">{c.optionsT}</h3>
        <p className="muted small">{c.optionsB}</p>
        <div className="options">
          {(["opt1", "opt2", "opt3", "opt4"] as Interest[]).map((opt) => {
            const on = person.interests.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                className={on ? "option is-on" : "option"}
                aria-pressed={on}
                onClick={() => dispatch({ type: "interest", id, interest: opt })}
              >
                <span className="option-box">{on && <Icon name="check" size={13} />}</span>
                {c[opt]}
              </button>
            );
          })}
        </div>
        {person.interests.length > 0 && <p className="saved">{c.optSaved}</p>}
      </section>
    </div>
  );
}

function ExplainScreen({ id }: { id: PersonId }) {
  const { state, dispatch, c, person, partnerName, compiled } = usePerson(id);

  if (!compiled) {
    return (
      <div className="screen screen-center">
        <div className="sealed">
          <div className="sealed-envelope" aria-hidden="true">
            <Icon name="pen" size={28} />
          </div>
          <p>{c.explainLocked}</p>
          <button type="button" className="btn btn-primary btn-block" onClick={() => dispatch({ type: "screen", id, screen: "share" })}>
            {c.ctaShare}
          </button>
        </div>
      </div>
    );
  }

  if (person.passed) {
    return (
      <div className="screen">
        <section className="done-banner">
          <span className="done-icon">
            <Icon name="check" size={22} />
          </span>
          <div>
            <h2>{c.explainedT}</h2>
            <p>{c.explainedB}</p>
          </div>
        </section>
        <ol className="quotes">
          {person.answers.filter(Boolean).map((answer) => (
            <li key={answer}>“{answer}”</li>
          ))}
        </ol>
        <Booking id={id} partnerName={partnerName} />
      </div>
    );
  }

  const question = prompts(id, state.lang)[person.step];
  const good = person.attempt === null;
  return (
    <form
      className="screen"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: "submit", id });
      }}
    >
      <div className="progress-dots" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < person.step ? "is-done" : i === person.step ? "is-now" : ""} />
        ))}
      </div>
      <p className="eyebrow">{fill(c.explainKicker, { n: person.step + 1 })}</p>
      <label className="prompt" htmlFor={`draft-${id}`}>
        {question}
      </label>
      <textarea
        id={`draft-${id}`}
        value={person.draft}
        placeholder={c.explainPlaceholder}
        onChange={(event) => dispatch({ type: "draft", id, text: event.target.value })}
        rows={4}
      />
      <div className="chip-row">
        <button type="button" className="chip" onClick={() => dispatch({ type: "sample", id, kind: "pass" })}>
          <Icon name="sparkle" size={14} />
          {c.example}
        </button>
        {person.step === 0 && (
          <button type="button" className="chip chip-warn" onClick={() => dispatch({ type: "sample", id, kind: "fail" })}>
            {c.harmful}
          </button>
        )}
      </div>
      <button type="submit" className="btn btn-primary btn-block">
        {c.checkAnswer}
      </button>
      {!good && person.attempt && (
        <p className="feedback feedback-warn" role="status">
          <Icon name="info" size={16} />
          {reasonText(state.lang, person.attempt)}
        </p>
      )}
    </form>
  );
}

function Booking({ id, partnerName }: { id: PersonId; partnerName: string }) {
  const { state, dispatch, c } = usePerson(id);
  if (state.counseling) {
    return (
      <section className="card card-good">
        <h3 className="card-title">
          <Icon name="shieldCheck" size={18} />
          {c.counselledT}
        </h3>
        <p className="muted">{c.counselledB}</p>
      </section>
    );
  }
  if (state.booking) {
    return (
      <section className="card card-good">
        <h3 className="card-title">
          <Icon name="calendar" size={18} />
          {c.bookedT}
        </h3>
        <p>{c[state.booking]}</p>
      </section>
    );
  }
  if (!isExplained(state)) {
    return (
      <section className="card card-quiet">
        <p className="muted">
          <Icon name="clock" size={15} /> {fill(c.jWaiting, { name: partnerName })}
        </p>
      </section>
    );
  }
  return (
    <section className="card">
      <h3 className="card-title">{c.bookT}</h3>
      <p className="muted small">{c.bookB}</p>
      <div className="slots">
        {(["slot1", "slot2", "slot3"] as Slot[]).map((slot) => (
          <button key={slot} type="button" className="slot" onClick={() => dispatch({ type: "book", id, slot })}>
            <Icon name="calendar" size={16} />
            {c[slot]}
          </button>
        ))}
      </div>
    </section>
  );
}

const CHIPS = ["chipCarrier", "chipSees", "chipRisk", "chipMarry", "chipOptions", "chipCousin"] as const;

function AskScreen({ id }: { id: PersonId }) {
  const { state, dispatch, c, person } = usePerson(id);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const body = end.current?.closest(".phone-body");
    body?.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
  }, [person.thread.length]);

  return (
    <div className="screen screen-chat">
      <header className="screen-head">
        <h2>{c.askT}</h2>
        <p>{c.askB}</p>
      </header>
      <div className="thread">
        {person.thread.map((turn, index) => {
          const view = renderTurn(id, turn, state.lang);
          return (
            <div key={`${turn.q}-${index}`} className="turn">
              <div className="bubble bubble-me">{turn.q}</div>
              <div className={view.handed ? "bubble bubble-satr bubble-handed" : "bubble bubble-satr"}>
                <p>{view.speech}</p>
                {view.handed && (
                  <p className="handed">
                    <Icon name="steth" size={14} />
                    {c.passedOn}
                  </p>
                )}
                <details className="trace">
                  <summary>
                    <Icon name="shieldCheck" size={13} />
                    {c.checked}
                  </summary>
                  <ul>
                    {view.steps.map((step) => (
                      <li key={step.tool}>
                        <strong>{step.label}</strong>
                        <span>{step.observation}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            </div>
          );
        })}
        <div ref={end} />
      </div>
      <div className="chip-scroll">
        {CHIPS.map((key) => (
          <button key={key} type="button" className="chip" onClick={() => dispatch({ type: "ask", id, text: c[key] })}>
            {c[key]}
          </button>
        ))}
      </div>
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "ask", id });
        }}
      >
        <input
          value={person.askDraft}
          onChange={(event) => dispatch({ type: "askdraft", id, text: event.target.value })}
          placeholder={c.askPlaceholder}
          aria-label={c.askT}
        />
        <button type="submit" className="send" aria-label={c.askSend}>
          <Icon name="send" size={18} className="flip-rtl" />
        </button>
      </form>
    </div>
  );
}

function FamilyScreen({ id }: { id: PersonId }) {
  const { state, dispatch, c, name } = usePerson(id);
  const text = inviteText(state.lang, state.inviteSigned ? name : undefined);
  const leaks = leakedTokens(text, ALL_GENE_TOKENS);
  const reduceMotion = useReducedMotion();
  return (
    <div className="screen">
      <button type="button" className="back" onClick={() => dispatch({ type: "screen", id, screen: "home" })}>
        <Icon name="arrowLeft" size={16} className="flip-rtl" />
        {c.back}
      </button>
      <header className="screen-head">
        <h2>{c.familyPageT}</h2>
        <p>{c.familyPageB}</p>
      </header>
      {!state.inviteSent && (
        <label className="switch">
          <input type="checkbox" checked={state.inviteSigned} onChange={(event) => dispatch({ type: "signInvite", on: event.target.checked })} />
          <span className="switch-track" aria-hidden="true" />
          {c.signIt}
        </label>
      )}
      <p className="eyebrow">{c.preview}</p>
      <motion.div
        className="sms"
        key={text}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease }}
      >
        <p>{text}</p>
      </motion.div>
      <motion.p
        className={leaks.length ? "feedback feedback-warn" : "feedback feedback-good"}
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.25, ease }}
      >
        <Icon name={leaks.length ? "info" : "shieldCheck"} size={16} />
        {leaks.length ? leaks.join(", ") : c.scanClean}
      </motion.p>
      {state.inviteSent ? (
        <section className="card card-good">
          <h3 className="card-title">
            <Icon name="check" size={18} />
            {c.inviteSentT}
          </h3>
          <p className="muted">{c.inviteSentB}</p>
        </section>
      ) : (
        <button type="button" className="btn btn-primary btn-block" onClick={() => dispatch({ type: "invite", id })}>
          <Icon name="send" size={16} className="flip-rtl" />
          {c.sendInvite}
        </button>
      )}
    </div>
  );
}

function Listen({ text }: { text: string }): ReactNode {
  const { state } = useSatr();
  const c = t(state.lang);
  const [on, setOn] = useState(false);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  if (!("speechSynthesis" in window)) return null;
  return (
    <button
      type="button"
      className={on ? "listen is-on" : "listen"}
      onClick={() => {
        window.speechSynthesis.cancel();
        if (on) {
          setOn(false);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = state.lang === "ar" ? "ar-AE" : "en-GB";
        utterance.onend = () => setOn(false);
        setOn(true);
        window.speechSynthesis.speak(utterance);
      }}
    >
      <Icon name="sound" size={15} />
      {on ? c.stop : c.listen}
    </button>
  );
}
