import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { PersonId } from "./domain/case";
import { ease, rise, stagger } from "./fx";
import { plan, renderTurn, unexpectedTokens, type AgentTurn, type TurnView } from "./loop";
import type { Intent } from "./logic";
import { t, type Strings } from "./strings";
import { isCompiled, useSatr } from "./store";
import { Icon, Mark } from "./visuals";

const FLOW = [1, 2, 3, 4, 5, 6] as const;

const ROLES = [
  ["roleCouple", "roleCoupleJob", "roleCoupleSatr"],
  ["roleCounsel", "roleCounselJob", "roleCounselSatr"],
  ["roleCourt", "roleCourtJob", "roleCourtSatr"],
  ["roleFamily", "roleFamilyJob", "roleFamilySatr"],
  ["roleSystem", "roleSystemJob", "roleSystemSatr"],
] as const;

const DEMO: { intent: Intent; chip: "chipCarrier" | "chipSees" | "chipMarry" }[] = [
  { intent: "carrier", chip: "chipCarrier" },
  { intent: "sees", chip: "chipSees" },
  { intent: "refuse-marry", chip: "chipMarry" },
];

export function AgentDesk() {
  const { state } = useSatr();
  const c = t(state.lang);
  const reduceMotion = useReducedMotion();
  const compiled = isCompiled(state);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setActive(FLOW.length);
      return;
    }
    setActive(0);
    const timers = FLOW.map((_, i) => window.setTimeout(() => setActive(i + 1), 450 + i * 520));
    return () => timers.forEach(clearTimeout);
  }, [reduceMotion, state.lang]);

  const demoTurns = DEMO.map(({ intent, chip }) => {
    const turn: AgentTurn = {
      q: c[chip],
      intent,
      opened: true,
      compiled,
      steps: plan(intent),
    };
    return { turn, view: renderTurn("layla", turn, state.lang, state.files), chip };
  });

  const asked = (["layla", "omar"] as const).flatMap((id) =>
    state.people[id].thread.map((turn) => ({
      id,
      turn,
      view: renderTurn(id, turn, state.lang, state.files),
    })),
  );

  return (
    <main className="desk wrap">
      <motion.header className="page-head" variants={stagger} initial="hidden" animate="show">
        <motion.p className="eyebrow" variants={rise}>
          {c.agentKicker}
        </motion.p>
        <motion.h1 variants={rise}>{c.agentTitle}</motion.h1>
        <motion.p className="lead" variants={rise}>
          {c.agentLead}
        </motion.p>
      </motion.header>

      <section className="panel-light agent-chat-panel">
        <h2>{c.exampleTitle}</h2>
        <p className="muted">{c.exampleNote}</p>
        <AgentChat demo={demoTurns} />
      </section>

      <section className="panel-light">
        <h2>{c.flowTitle}</h2>
        <p className="muted">{c.flowLead}</p>
        <div className="sheet-scroll">
          <table className="sheet">
            <caption className="sr-only">{c.flowTitle}</caption>
            <thead>
              <tr>
                <th scope="col">{c.guideColN}</th>
                <th scope="col">{c.guideColStep}</th>
                <th scope="col">{c.flowDoes}</th>
                <th scope="col">{c.flowStops}</th>
              </tr>
            </thead>
            <tbody>
              {FLOW.map((n) => (
                <motion.tr
                  key={n}
                  className={active >= n ? "is-lit" : ""}
                  initial={reduceMotion ? false : { opacity: 0.35 }}
                  animate={{ opacity: active >= n ? 1 : 0.35 }}
                  transition={{ duration: 0.4, ease }}
                >
                  <th scope="row">{n}</th>
                  <td>{c[`flow${n}t` as keyof Strings]}</td>
                  <td>{c[`flow${n}d` as keyof Strings]}</td>
                  <td>{c[`flow${n}s` as keyof Strings]}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel-light">
        <h2>{c.roleTitle}</h2>
        <p className="muted">{c.roleLead}</p>
        <div className="sheet-scroll">
          <table className="sheet">
            <caption className="sr-only">{c.roleTitle}</caption>
            <thead>
              <tr>
                <th scope="col">{c.roleWho}</th>
                <th scope="col">{c.roleJob}</th>
                <th scope="col">{c.roleHow}</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map(([who, job, how], i) => (
                <motion.tr
                  key={who}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.15 + i * 0.08, ease }}
                >
                  <th scope="row">{c[who]}</th>
                  <td>{c[job]}</td>
                  <td>{c[how]}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {asked.length > 0 && (
        <section className="panel-light">
          <h2>{c.sessionTitle}</h2>
          <div className="turn-list">
            {asked.map(({ id, turn, view }, i) => (
              <TurnBlock
                key={`${id}-${i}`}
                name={state.files[id].name[state.lang]}
                question={turn.q}
                steps={view.steps}
                speech={view.speech}
                handed={view.handed}
                handedLabel={c.passedOn}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function AgentChat({
  demo,
}: {
  demo: { turn: AgentTurn; view: TurnView; chip: keyof Strings }[];
}) {
  const { state, dispatch, liveSession } = useSatr();
  const c = t(state.lang);
  const reduceMotion = useReducedMotion();
  const [perspective, setPerspective] = useState<PersonId>("layla");
  const effectivePerspective: PersonId = liveSession?.slot ?? perspective;
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState(0);
  const [seed, setSeed] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const total = demo.length * 2;

  const activePerson = state.people[effectivePerspective];
  const activeFile = state.files[effectivePerspective];
  const partnerFile = state.files[effectivePerspective === "layla" ? "omar" : "layla"];
  const compiled = isCompiled(state);
  const manualTurns = activePerson.thread;

  useEffect(() => {
    if (reduceMotion) {
      setPhase(total);
      return;
    }
    setPhase(0);
    const timers: number[] = [];
    let delay = 350;
    for (let i = 0; i < total; i++) {
      const ask = i % 2 === 0;
      delay += ask ? 650 : 1250;
      const at = delay;
      timers.push(window.setTimeout(() => setPhase(i + 1), at));
    }
    return () => timers.forEach(clearTimeout);
  }, [reduceMotion, seed, total, state.lang]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [manualTurns.length, phase]);

  const bubble = {
    initial: reduceMotion ? false : { opacity: 0, y: 14, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.4, ease },
  };

  const typingFor = demo.findIndex((_, i) => phase === i * 2 + 1);

  const sendQuestion = (rawText?: string) => {
    const q = (rawText ?? input).trim();
    if (!q) return;
    dispatch({ type: "ask", id: effectivePerspective, text: q });
    if (!rawText) setInput("");
  };

  const firstOwnGene = activeFile.findings[0]?.gene;
  const quickSuggestions: string[] =
    state.lang === "ar"
      ? [
          c.chipCarrier,
          c.chipSees,
          c.chipRisk,
          firstOwnGene ? `اشرح لي جين ${firstOwnGene}` : "ما معنى اللوحة السليمة؟",
          `ماذا يحمل ${partnerFile.name.ar} أيضاً؟`,
          "ماذا ترى محكمة الزواج؟",
          c.chipMarry,
        ]
      : [
          c.chipCarrier,
          c.chipSees,
          c.chipRisk,
          firstOwnGene ? `Tell me about ${firstOwnGene}` : "What does a clear panel mean?",
          `What else does ${partnerFile.name.en} carry?`,
          "What does the marriage court see?",
          c.chipMarry,
        ];

  const latestManual = manualTurns[manualTurns.length - 1];
  const latestManualView = latestManual
    ? renderTurn(effectivePerspective, latestManual, state.lang, state.files)
    : null;
  const latestLeaks = latestManual
    ? unexpectedTokens(effectivePerspective, latestManual, state.lang, state.files)
    : [];

  return (
    <div className="agent-chat-layout">
      <div className="chat-demo agent-chat">
        <div className="chat-head agent-chat-toolbar">
          <div className="agent-chat-who">
            <Mark size={22} />
            <span className="chat-dot" aria-hidden="true" />
            <span>
              {activeFile.name[state.lang]} · {c.askT}
            </span>
          </div>

          {!liveSession && (
            <div className="agent-perspective-switch" role="tablist" aria-label="Perspective">
              {(["layla", "omar"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={effectivePerspective === id}
                  className={effectivePerspective === id ? "pill-toggle is-on" : "pill-toggle"}
                  onClick={() => setPerspective(id)}
                >
                  {state.files[id].name[state.lang]}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="agent-consent-strip">
          <span className={activePerson.opened ? "status-pill is-good" : "status-pill"}>
            <Icon name={activePerson.opened ? "unlock" : "lock"} size={13} />
            {activePerson.opened
              ? state.lang === "ar"
                ? "نتيجتك مفتوحة"
                : "Own result opened"
              : state.lang === "ar"
                ? "نتيجتك مختومة"
                : "Own result sealed"}
          </span>
          <span className={compiled ? "status-pill is-good" : "status-pill"}>
            <Icon name={compiled ? "users" : "lock"} size={13} />
            {compiled
              ? state.lang === "ar"
                ? "موافقة الطرفين مكتملة"
                : "Both agreed to share"
              : state.lang === "ar"
                ? "لا توجد مشاركة بعد"
                : "Not shared yet"}
          </span>
          {!activePerson.opened && (
            <button
              type="button"
              className="link small"
              onClick={() => dispatch({ type: "open", id: effectivePerspective })}
            >
              {c.ctaOpen}
            </button>
          )}
        </div>

        <div className="chat-body agent-chat-body" ref={bodyRef} aria-live="polite">
          {manualTurns.length === 0 &&
            demo.map(({ turn, view }, i) => {
              const askAt = i * 2 + 1;
              const answerAt = i * 2 + 2;
              return (
                <div key={`${seed}-${turn.intent}`} className="turn">
                  {phase >= askAt && (
                    <motion.div className="bubble bubble-me" {...bubble}>
                      {turn.q}
                    </motion.div>
                  )}
                  {typingFor === i && <Typing label={c.typing} />}
                  {phase >= answerAt && (
                    <motion.div
                      className={view.handed ? "bubble bubble-satr bubble-handed" : "bubble bubble-satr"}
                      {...bubble}
                    >
                      <p>{view.speech}</p>
                      {view.handed && (
                        <p className="handed">
                          <Icon name="steth" size={14} />
                          {c.passedOn}
                        </p>
                      )}
                      <p className="bubble-trace">
                        <Icon name="shieldCheck" size={14} />
                        {view.steps.map((step) => step.label).join(" · ")}
                      </p>
                    </motion.div>
                  )}
                </div>
              );
            })}

          {manualTurns.map((turn, idx) => {
            const view = renderTurn(effectivePerspective, turn, state.lang, state.files);
            return (
              <div key={`manual-${idx}-${turn.q}`} className="turn">
                <motion.div className="bubble bubble-me" {...bubble}>
                  {turn.q}
                </motion.div>
                <motion.div
                  className={view.handed ? "bubble bubble-satr bubble-handed" : "bubble bubble-satr"}
                  {...bubble}
                >
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
                      {view.steps.map((step) => step.label).join(" · ")}
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
                </motion.div>
              </div>
            );
          })}
        </div>

        <div className="agent-chat-chips">
          {quickSuggestions.map((promptText) => (
            <button
              key={promptText}
              type="button"
              className="chip"
              onClick={() => sendQuestion(promptText)}
            >
              {promptText}
            </button>
          ))}
        </div>

        <form
          className="composer agent-composer"
          onSubmit={(e) => {
            e.preventDefault();
            sendQuestion();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={c.askPlaceholder}
            aria-label={c.askT}
          />
          <button type="submit" className="send" aria-label={c.askSend}>
            <Icon name="send" size={18} className="flip-rtl" />
          </button>
        </form>
      </div>

      <div className="agent-chat-aside">
        {latestManual && latestManualView ? (
          <div className="agent-live-inspector">
            <p className="eyebrow">
              {state.lang === "ar" ? "فحص الصلاحيات المباشر" : "Live permission trace"}
            </p>
            <p className="turn-q">“{latestManual.q}”</p>
            <ol className="agent-chat-beats">
              {latestManualView.steps.map((step) => (
                <li key={step.tool} className="is-done">
                  <strong>{step.label}</strong>
                  <span>{step.observation}</span>
                </li>
              ))}
            </ol>
            <p className={latestLeaks.length === 0 ? "feedback feedback-good" : "feedback feedback-warn"}>
              <Icon name="shieldCheck" size={15} />
              {latestLeaks.length === 0
                ? state.lang === "ar"
                  ? "صفر أسماء جينات غير مصرح بها في الرد"
                  : "0 unpermitted gene tokens in reply"
                : latestLeaks.join(", ")}
            </p>
          </div>
        ) : (
          <ol className="agent-chat-beats">
            {demo.map(({ turn, view }, i) => {
              const done = phase >= i * 2 + 2;
              const now = phase >= i * 2 + 1 && phase < i * 2 + 2;
              return (
                <li key={turn.intent} className={done ? "is-done" : now ? "is-now" : ""}>
                  <strong>{turn.q}</strong>
                  <span>{view.steps.map((step) => step.label).join(" · ")}</span>
                </li>
              );
            })}
          </ol>
        )}

        <button
          type="button"
          className="btn btn-quiet btn-sm"
          onClick={() => {
            setSeed((n) => n + 1);
          }}
        >
          <Icon name="refresh" size={15} />
          {c.chatReplay}
        </button>
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

function TurnBlock({
  name,
  question,
  steps,
  speech,
  handed,
  handedLabel,
}: {
  name: string;
  question: string;
  steps: TurnView["steps"];
  speech: string;
  handed: boolean;
  handedLabel: string;
}) {
  return (
    <article className="turn-block">
      <p className="turn-who">{name}</p>
      <p className="turn-q">“{question}”</p>
      <ol className="turn-steps">
        {steps.map((step) => (
          <li key={step.tool}>
            <strong>{step.label}</strong>
            <span>{step.observation}</span>
          </li>
        ))}
      </ol>
      <p className="turn-speech">{speech}</p>
      {handed && <p className="note-good">{handedLabel}</p>}
    </article>
  );
}
