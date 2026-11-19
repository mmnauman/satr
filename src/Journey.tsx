import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { DeterministicCatalogAskAdapter } from "./adapters/askEngine";
import { PEOPLE, type PersonId } from "./content";
import { analyzeCase } from "./domain/case";
import { ease, Reveal } from "./fx";
import { renderTurn, unexpectedTokens, type AgentTurn } from "./loop";
import { ASK_SAMPLES, ROUTE_STOPS, t } from "./strings";
import { useSatr } from "./store";
import { Icon, Mark } from "./visuals";

/* ------------------------------------------------------------------ */
/* Route shield: the numbered road sign used at every stop.            */
/* ------------------------------------------------------------------ */

export function RouteShield({ n, size = 54, lit = false }: { n: string; size?: number; lit?: boolean }) {
  return (
    <span className={lit ? "rshield is-lit" : "rshield"} style={{ width: size, height: size * 1.06 }} aria-hidden="true">
      <svg viewBox="0 0 100 106">
        <path
          d="M50 4 C62 12 80 12 92 6 C98 24 98 40 92 52 C86 74 70 92 50 102 C30 92 14 74 8 52 C2 40 2 24 8 6 C20 12 38 12 50 4 Z"
          className="rshield-body"
        />
        <path
          d="M50 12 C61 19 76 19 86 14 C90 28 90 40 86 50 C80 69 67 84 50 93 C33 84 20 69 14 50 C10 40 10 28 14 14 C24 19 39 19 50 12 Z"
          className="rshield-inner"
        />
        <path d="M14 34 H86" className="rshield-bar" />
      </svg>
      <span className="rshield-top">SATR</span>
      <span className="rshield-n">{n}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* The route: a road drawn as you scroll, from screening to care.      */
/* ------------------------------------------------------------------ */

const VB_W = 4680;
const VB_H = 760;
const ROAD =
  "M -78 470 C 260 470 390 300 676 300 S 1066 520 1378 520 S 1768 250 2080 250 S 2470 510 2782 510 S 3172 270 3484 270 S 3874 470 4160 470 S 4524 380 4784 380";
const STOP_AT = [0.055, 0.165, 0.275, 0.39, 0.5, 0.61, 0.72, 0.83];
const END_AT = 0.935;

type Pt = { x: number; y: number };

function usePathPoints(ref: React.RefObject<SVGPathElement | null>, fracs: number[]): Pt[] {
  const [pts, setPts] = useState<Pt[]>(() => fracs.map((f) => ({ x: f * VB_W, y: VB_H / 2 })));
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof el.getTotalLength !== "function") return;
    const len = el.getTotalLength();
    setPts(fracs.map((f) => {
      const p = el.getPointAtLength(f * len);
      return { x: p.x, y: p.y };
    }));
    // fracs are module constants, so the points only need computing once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
  return pts;
}

export function RouteSection() {
  const { state } = useSatr();
  const c = t(state.lang);
  const stops = ROUTE_STOPS[state.lang];
  const rtl = state.lang === "ar";
  const reduce = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const roadRef = useRef<SVGPathElement>(null);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const [dims, setDims] = useState({ cw: 0, vw: 0 });
  const [active, setActive] = useState(-1);
  const [car, setCar] = useState<Pt>({ x: 0, y: 470 });

  const points = usePathPoints(roadRef, [...STOP_AT, END_AT]);

  useEffect(() => {
    const measure = () => {
      const cw = canvasRef.current?.offsetWidth ?? 0;
      const vw = stickyRef.current?.clientWidth ?? 0;
      setDims({ cw, vw });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (canvasRef.current) ro.observe(canvasRef.current);
    if (stickyRef.current) ro.observe(stickyRef.current);
    return () => ro.disconnect();
  }, []);

  const along = useTransform(scrollYProgress, [0.04, 0.95], [0.015, END_AT + 0.01], { clamp: true });
  const x = useMotionValue(0);

  // Keep the traveller a little before the middle of the screen, and never scroll past either end of the road.
  const follow = (carX: number) => {
    const span = Math.max(0, dims.cw - dims.vw);
    const px = (carX / VB_W) * dims.cw - dims.vw * 0.42;
    const pos = Math.min(span, Math.max(0, px));
    x.set(rtl ? pos : -pos);
  };

  useEffect(() => {
    follow(car.x);
    // re-anchor when the canvas is measured or the direction flips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims, rtl]);

  useMotionValueEvent(along, "change", (v) => {
    const el = roadRef.current;
    if (el && typeof el.getTotalLength === "function") {
      const p = el.getPointAtLength(v * el.getTotalLength());
      setCar({ x: p.x, y: p.y });
      follow(p.x);
    }
    let idx = -1;
    STOP_AT.forEach((f, i) => {
      if (v >= f - 0.012) idx = i;
    });
    if (v >= END_AT - 0.012) idx = STOP_AT.length;
    setActive(idx);
  });

  const forkFrom = points[3];
  const fork = `M ${forkFrom.x} ${forkFrom.y} C ${forkFrom.x + 150} ${forkFrom.y}, ${forkFrom.x + 130} ${forkFrom.y + 190}, ${forkFrom.x + 330} ${forkFrom.y + 260} S ${forkFrom.x + 700} ${forkFrom.y + 360}, ${forkFrom.x + 1240} ${forkFrom.y + 400}`;
  const forkSign: Pt = { x: forkFrom.x + 960, y: Math.min(forkFrom.y + 370, VB_H - 48) };
  const pct = (pt: Pt) => ({ left: `${(pt.x / VB_W) * 100}%`, top: `${(pt.y / VB_H) * 100}%` });
  const place = (pt: Pt) => (rtl ? { right: pct(pt).left, top: pct(pt).top } : pct(pt));
  const shown = Math.min(active + 1, stops.length);
  const label = active >= stops.length ? c.routeEndT : active >= 0 ? stops[active].t : c.routeKicker;

  return (
    <>
      <section ref={sectionRef} className="route" id="route" aria-label={c.routeKicker}>
        <div ref={stickyRef} className="route-sticky">
          <div className="route-sky" aria-hidden="true">
            <div className="route-sun" />
            <div className="route-dunes" />
            <div className="grain" />
          </div>

          <div className="route-head wrap">
            <p className="eyebrow eyebrow-light">{c.routeKicker}</p>
            <h2>{c.routeTitle}</h2>
            <p className="route-lead">{c.routeLead}</p>
            <div className="route-hud" aria-live="polite">
              <span className="route-hud-n">
                {String(Math.max(shown, 0)).padStart(2, "0")}
                <small>/{String(stops.length).padStart(2, "0")}</small>
              </span>
              <span className="route-hud-t">{label}</span>
            </div>
          </div>

          <motion.div ref={canvasRef} className="route-canvas" style={{ x: reduce ? 0 : x }}>
            <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="route-svg" aria-hidden="true" style={rtl ? { transform: "scaleX(-1)" } : undefined}>
              <path d={fork} className="road-edge road-fork" />
              <path d={fork} className="road-base road-fork" />
              <path d={fork} className="road-dash" />
              <path ref={roadRef} d={ROAD} className="road-edge" />
              <path d={ROAD} className="road-base" />
              <path d={ROAD} className="road-dash" />
              <motion.path d={ROAD} className="road-glow" style={{ pathLength: along }} />
            </svg>

            <div className="route-fork-sign" style={place(forkSign)}>
              <Icon name={rtl ? "arrowLeft" : "arrowRight"} size={16} />
              {c.routeFork}
            </div>

            {stops.map((stop, i) => {
              const pt = points[i];
              const above = pt.y > 400;
              const state = i === active ? "is-on" : i < active ? "is-past" : "";
              return (
                <div key={stop.t} className={`route-stop ${state}`} style={place(pt)}>
                  <RouteShield n={String(i + 1)} lit={i <= active} />
                  <article className={above ? "postcard is-above" : "postcard is-below"}>
                    <h3>{stop.t}</h3>
                    <p>{stop.b}</p>
                    <span className="postcard-who">
                      <Icon name="eye" size={13} />
                      {c.routeWho}: {stop.w}
                    </span>
                  </article>
                </div>
              );
            })}

            <div className={`route-stop route-end ${active >= stops.length ? "is-on" : ""}`} style={place(points[stops.length])}>
              <span className="route-flag" aria-hidden="true">
                <Mark size={30} />
              </span>
              <article className="postcard is-above postcard-end">
                <span className="postcard-kick">{c.routeFinish}</span>
                <h3>{c.routeEndT}</h3>
                <p>{c.routeEndB}</p>
                <span className="postcard-who">
                  <Icon name="court" size={13} />
                  {c.routeEndW}
                </span>
              </article>
            </div>

            <div className="route-car" style={place(car)} aria-hidden="true">
              <span className="route-car-glow" />
              <Mark size={26} />
            </div>
          </motion.div>

        </div>
      </section>

      {/* Small screens: the same route, read top to bottom */}
      <section className="route-mobile" aria-label={c.routeKicker}>
        <div className="wrap">
          <Reveal>
            <p className="eyebrow eyebrow-light">{c.routeKicker}</p>
            <h2>{c.routeTitle}</h2>
            <p className="lead">{c.routeLead}</p>
          </Reveal>
          <ol className="route-list">
            {stops.map((stop, i) => (
              <Reveal as="li" key={stop.t} delay={0.04}>
                <RouteShield n={String(i + 1)} size={44} lit />
                <div>
                  <h3>{stop.t}</h3>
                  <p>{stop.b}</p>
                  <span className="postcard-who">
                    <Icon name="eye" size={13} />
                    {c.routeWho}: {stop.w}
                  </span>
                  {i === 3 && <p className="route-list-fork">{c.routeFork}</p>}
                </div>
              </Reveal>
            ))}
            <Reveal as="li">
              <span className="route-flag" aria-hidden="true">
                <Mark size={26} />
              </span>
              <div>
                <h3>{c.routeEndT}</h3>
                <p>{c.routeEndB}</p>
                <span className="postcard-who">
                  <Icon name="court" size={13} />
                  {c.routeEndW}
                </span>
              </div>
            </Reveal>
          </ol>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Open question box: any question, answered from the couple's results */
/* ------------------------------------------------------------------ */

const askEngine = new DeterministicCatalogAskAdapter();

type AskedTurn = { key: number; as: PersonId; turn: AgentTurn; pending: boolean };

export function LiveAsk({ incoming, openLive }: { incoming: { q: string; n: number } | null; openLive: () => void }) {
  const { state } = useSatr();
  const c = t(state.lang);
  const lang = state.lang;
  const [as, setAs] = useState<PersonId>("layla");
  const [agreed, setAgreed] = useState(true);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<AskedTurn[]>([]);
  const [thinking, setThinking] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const ask = (raw: string) => {
    const q = raw.trim();
    if (!q || thinking) return;
    const turn = askEngine.answerSync({ personId: as, question: q, opened: true, compiled: agreed, files: PEOPLE, lang });
    seq.current += 1;
    const key = seq.current;
    setThinking(true);
    setTurns((prev) => [...prev.slice(-5), { key, as, turn, pending: true }]);
    window.setTimeout(() => {
      setTurns((prev) => prev.map((x) => (x.key === key ? { ...x, pending: false } : x)));
      setThinking(false);
    }, 750);
  };

  useEffect(() => {
    if (incoming) ask(incoming.q);
    // only react to a new question handed over from the poster
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.n]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(input);
    setInput("");
  };

  const me = PEOPLE[as];
  const partner = PEOPLE[as === "layla" ? "omar" : "layla"];
  const shared = analyzeCase(PEOPLE).sharedGenes;

  return (
    <section className="liveask" id="ask">
      <div className="wrap liveask-grid">
        <div className="liveask-copy">
          <Reveal>
            <p className="eyebrow">{c.liveAskKicker}</p>
            <h2>{c.liveAskTitle}</h2>
            <p className="lead">{c.liveAskLead}</p>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="liveask-controls">
              <div className="seg" role="group" aria-label={c.liveAskAs}>
                <span className="seg-label">{c.liveAskAs}</span>
                {(["layla", "omar"] as const).map((id) => (
                  <button key={id} type="button" className={as === id ? "is-on" : ""} aria-pressed={as === id} onClick={() => setAs(id)}>
                    <span className="avatar">{PEOPLE[id].initial[lang]}</span>
                    {PEOPLE[id].name[lang]}
                  </button>
                ))}
              </div>
              <div className="seg" role="group" aria-label={c.liveAskStage}>
                <span className="seg-label">{c.liveAskStage}</span>
                <button type="button" className={!agreed ? "is-on" : ""} aria-pressed={!agreed} onClick={() => setAgreed(false)}>
                  <Icon name="lock" size={14} />
                  {c.liveAskBefore}
                </button>
                <button type="button" className={agreed ? "is-on" : ""} aria-pressed={agreed} onClick={() => setAgreed(true)}>
                  <Icon name="together" size={14} />
                  {c.liveAskAfter}
                </button>
              </div>
            </div>

            <div className="liveask-sees">
              <div>
                <span className="liveask-sees-k">{me.name[lang]}</span>
                <span className="liveask-genes">
                  {me.findings.map((f) => (
                    <code key={f.gene}>{f.gene}</code>
                  ))}
                </span>
              </div>
              <div>
                <span className="liveask-sees-k">{partner.name[lang]}</span>
                <span className="liveask-genes">
                  {agreed ? (
                    shared.map((g) => (
                      <code key={g} className="is-shared">
                        {g}
                      </code>
                    ))
                  ) : (
                    <code className="is-hidden">
                      <Icon name="lock" size={12} />
                    </code>
                  )}
                  <code className="is-hidden" title="private">
                    <Icon name="eyeOff" size={12} />
                  </code>
                </span>
              </div>
            </div>

            <button type="button" className="btn btn-primary liveask-own" onClick={openLive}>
              <Icon name="upload" size={16} />
              {c.liveAskOwn}
            </button>
          </Reveal>
        </div>

        <Reveal delay={0.15} className="liveask-chat-wrap">
          <div className="liveask-chat">
            <div className="liveask-chat-head">
              <Mark size={18} />
              <strong>{c.askT}</strong>
              <span className="liveask-chat-as">
                {c.liveAskAs}: {me.name[lang]}
              </span>
            </div>
            <div className="liveask-body" ref={bodyRef}>
              {turns.length === 0 && <p className="liveask-empty">{c.liveAskEmpty}</p>}
              <AnimatePresence initial={false}>
                {turns.map(({ key, as: who, turn, pending }) => {
                  const view = renderTurn(who, turn, lang, PEOPLE);
                  const leaks = unexpectedTokens(who, turn, lang, PEOPLE);
                  return (
                    <motion.div key={key} className="liveask-turn" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
                      <div className="bubble bubble-me">
                        <span className="bubble-who">{PEOPLE[who].name[lang]}</span>
                        {turn.q}
                      </div>
                      {pending ? (
                        <div className="typing" aria-label={c.typing}>
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : (
                        <motion.div className="bubble bubble-satr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
                          <p>{view.speech}</p>
                          <details className="liveask-trace">
                            <summary>
                              <Icon name="sparkle" size={13} />
                              {c.liveAskHow}
                            </summary>
                            <ol>
                              {view.steps.map((s) => (
                                <li key={s.tool}>
                                  <strong>{s.label}</strong>
                                  <span>{s.observation}</span>
                                </li>
                              ))}
                            </ol>
                          </details>
                          <div className="liveask-badges">
                            <span className={leaks.length ? "badge badge-bad" : "badge badge-ok"}>
                              <Icon name={leaks.length ? "x" : "shieldCheck"} size={13} />
                              {leaks.length ? `${c.liveAskLeak}: ${leaks.join(", ")}` : c.liveAskSafe}
                            </span>
                            {view.handed && (
                              <span className="badge badge-gold">
                                <Icon name="steth" size={13} />
                                {c.liveAskHanded}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            <div className="liveask-chips">
              {ASK_SAMPLES[lang].map((q) => (
                <button key={q} type="button" className="chip" onClick={() => ask(q)} disabled={thinking}>
                  {q}
                </button>
              ))}
            </div>
            <form className="liveask-form" onSubmit={submit}>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={c.askPlaceholder} aria-label={c.posterAskLabel} />
              <button type="submit" className="send" aria-label={c.askSend} disabled={!input.trim() || thinking}>
                <Icon name="send" size={18} />
              </button>
            </form>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
