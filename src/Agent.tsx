import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { PEOPLE } from "./content";
import { ease, rise, stagger } from "./fx";
import { plan, renderTurn, type TurnView } from "./loop";
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
    const turn = {
      q: c[chip],
      intent,
      opened: true,
      compiled,
      steps: plan(intent),
    };
    return { turn, view: renderTurn("layla", turn, state.lang), chip };
  });

  const asked = (["layla", "omar"] as const).flatMap((id) =>
    state.people[id].thread.map((turn) => ({ id, turn, view: renderTurn(id, turn, state.lang) })),
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
                name={PEOPLE[id].name[state.lang]}
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
  demo: { turn: { q: string; intent: Intent }; view: TurnView; chip: keyof Strings }[];
}) {
  const { state } = useSatr();
  const c = t(state.lang);
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState(0);
  const [seed, setSeed] = useState(0);
  const total = demo.length * 2;

  useEffect(() => {
    if (reduceMotion) {
      setPhase(total);
      return;
    }
    setPhase(0);
    const timers: number[] = [];
    let delay = 400;
    for (let i = 0; i < total; i++) {
      const ask = i % 2 === 0;
      delay += ask ? 700 : 1400;
      const at = delay;
      timers.push(window.setTimeout(() => setPhase(i + 1), at));
    }
    return () => timers.forEach(clearTimeout);
  }, [reduceMotion, seed, total, state.lang]);

  const bubble = {
    initial: reduceMotion ? false : { opacity: 0, y: 14, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.45, ease },
  };

  const typingFor = demo.findIndex((_, i) => phase === i * 2 + 1);

  return (
    <div className="agent-chat-layout">
      <div className="chat-demo agent-chat">
        <div className="chat-head">
          <Mark size={22} />
          <div className="agent-chat-who">
            <span className="chat-dot" aria-hidden="true" />
            <span>{c.chatFrom}</span>
          </div>
        </div>
        <div className="chat-body agent-chat-body" aria-live="polite">
          {demo.map(({ turn, view }, i) => {
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
                  <motion.div className={view.handed ? "bubble bubble-satr bubble-handed" : "bubble bubble-satr"} {...bubble}>
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
        </div>
        <div className="agent-chat-chips" aria-hidden="true">
          {DEMO.map(({ chip }, i) => {
            const lit = phase >= i * 2 + 1;
            return (
              <span key={chip} className={lit ? "chip is-lit" : "chip"}>
                {c[chip]}
              </span>
            );
          })}
        </div>
      </div>
      <div className="agent-chat-aside">
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
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setSeed((n) => n + 1)}>
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
