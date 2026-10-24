import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { useRef, useState } from "react";
import { CountUp, Magnetic, Reveal, rise, SplitWords, Spotlight, stagger, VideoBg } from "./fx";
import { CREDITS, PHOTO, VIDEO } from "./media";
import { ChatDemo, MatchPlayground, RoleLens, Simulator } from "./Playground";
import { t, type Strings } from "./strings";
import { useSatr } from "./store";
import { Icon, Mark, Seal, type IconName } from "./visuals";

export function Landing() {
  const { state, dispatch } = useSatr();
  const c = t(state.lang);
  const start = () => dispatch({ type: "view", view: "stage" });

  return (
    <main className="landing">
      <Hero c={c} start={start} />
      <Ticker c={c} />
      <Stats c={c} />
      <Culture c={c} />
      <Harms c={c} />
      <HowScrolly c={c} />

      <section className="section section-night" id="match">
        <div className="glow glow-a" aria-hidden="true" />
        <div className="wrap">
          <Reveal>
            <p className="eyebrow eyebrow-light">{c.matchKicker}</p>
            <h2 className="narrow">{c.matchTitle}</h2>
            <p className="lead narrow">{c.matchLead}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <MatchPlayground />
          </Reveal>
        </div>
      </section>

      <section className="section section-sand" id="chance">
        <div className="wrap">
          <Reveal>
            <p className="eyebrow">{c.simKicker}</p>
            <h2 className="narrow">{c.simTitle}</h2>
            <p className="lead narrow">{c.simLead}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <Simulator />
          </Reveal>
        </div>
      </section>

      <section className="section section-video" id="privacy">
        <VideoBg clip={VIDEO.hands} className="video-dim" />
        <div className="video-shade" aria-hidden="true" />
        <div className="wrap">
          <Reveal>
            <p className="eyebrow eyebrow-light">{c.matrixKicker}</p>
            <h2 className="narrow">{c.rolesTitle}</h2>
            <p className="lead narrow">{c.rolesLead}</p>
          </Reveal>
          <Reveal delay={0.1}>
            <RoleLens />
          </Reveal>
        </div>
      </section>

      <section className="section section-sand">
        <div className="wrap assistant-split">
          <Reveal>
            <p className="eyebrow">{c.aiKicker}</p>
            <h2>{c.aiTitle}</h2>
            <p className="lead">{c.aiBody}</p>
          </Reveal>
          <Reveal delay={0.15}>
            <ChatDemo />
          </Reveal>
        </div>
      </section>

      <Outcomes c={c} />

      <section className="cta">
        <VideoBg clip={VIDEO.arches} />
        <div className="video-shade video-shade-strong" aria-hidden="true" />
        <div className="wrap cta-inner">
          <Reveal>
            <Seal size={96} />
          </Reveal>
          <h2>
            <SplitWords text={c.ctaTitle} inView />
          </h2>
          <Reveal delay={0.2}>
            <p>{c.ctaBody}</p>
          </Reveal>
          <Reveal delay={0.3}>
            <Magnetic>
              <button type="button" className="btn btn-gold btn-xl" onClick={start}>
                <Icon name="play" size={18} />
                {c.tryDemo}
              </button>
            </Magnetic>
          </Reveal>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap footer-inner">
          <div className="footer-brand">
            <Mark size={26} />
            <span>{c.brand}</span>
          </div>
          <p>{c.disclaimer}</p>
          <p className="footer-credit">
            {c.photoCredit} {CREDITS}.
          </p>
        </div>
      </footer>
    </main>
  );
}

function Hero({ c, start }: { c: Strings; start: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const cards: { icon: IconName; title: string; body: string; depth: number; className: string; delay: number }[] = [
    { icon: "lock", title: c.n1t, body: c.n1b, depth: 26, className: "note-1", delay: 1.1 },
    { icon: "check", title: c.n2t, body: c.n2b, depth: -18, className: "note-2", delay: 1.6 },
    { icon: "users", title: c.n3t, body: c.n3b, depth: 34, className: "note-3", delay: 2.1 },
  ];

  return (
    <section
      ref={ref}
      className="hero"
      onPointerMove={(event) => {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        mx.set((event.clientX - box.left) / box.width - 0.5);
        my.set((event.clientY - box.top) / box.height - 0.5);
        ref.current?.style.setProperty("--hx", `${event.clientX - box.left}px`);
        ref.current?.style.setProperty("--hy", `${event.clientY - box.top}px`);
      }}
    >
      <motion.div className="hero-media" style={{ y: videoY }}>
        <VideoBg clip={VIDEO.dunes} />
      </motion.div>
      <div className="hero-shade" aria-hidden="true" />
      <div className="hero-light" aria-hidden="true" />
      <div className="hero-pattern" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />

      <motion.div className="hero-inner" style={{ opacity: fade }}>
        <div className="hero-copy">
          <motion.p className="eyebrow eyebrow-light hero-eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="live-dot" />
            {c.heroEyebrow}
          </motion.p>
          <h1>
            <SplitWords text={c.heroTitle} />
          </h1>
          <motion.p className="hero-lead" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.9 }}>
            {c.heroLead}
          </motion.p>
          <motion.div className="hero-ctas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 1.1 }}>
            <Magnetic>
              <button type="button" className="btn btn-gold btn-lg btn-shine" onClick={start}>
                <Icon name="play" size={18} />
                {c.tryDemo}
              </button>
            </Magnetic>
            <a className="btn btn-glass btn-lg" href="#how">
              {c.seeHow}
            </a>
          </motion.div>
        </div>

        <div className="hero-notes" aria-hidden="true">
          {cards.map((card) => (
            <FloatCard key={card.title} card={card} sx={sx} sy={sy} />
          ))}
        </div>
      </motion.div>

      <motion.a href="#stats" className="scroll-cue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.6 }}>
        <span className="scroll-cue-line" />
        {c.scrollCue}
      </motion.a>
    </section>
  );
}

function FloatCard({
  card,
  sx,
  sy,
}: {
  card: { icon: IconName; title: string; body: string; depth: number; className: string; delay: number };
  sx: MotionValue<number>;
  sy: MotionValue<number>;
}) {
  const x = useTransform(sx, (v) => v * card.depth);
  const y = useTransform(sy, (v) => v * card.depth);
  return (
    <motion.div className={`float-card ${card.className}`} style={{ x, y }}>
      <motion.div
        className="float-inner"
        initial={{ opacity: 0, y: 30, scale: 0.92 }}
        animate={{ opacity: 1, y: [0, -8, 0], scale: 1 }}
        transition={{
          opacity: { duration: 0.8, delay: card.delay },
          scale: { duration: 0.8, delay: card.delay },
          y: { duration: 5 + card.depth / 20, repeat: Infinity, ease: "easeInOut", delay: card.delay },
        }}
      >
        <span className="float-icon">
          <Icon name={card.icon} size={18} />
        </span>
        <div>
          <p className="float-app">
            <Mark size={12} /> Satr · now
          </p>
          <strong>{card.title}</strong>
          <span>{card.body}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Ticker({ c }: { c: Strings }) {
  const items = [c.how1t, c.how2t, c.how3t, c.how4t, c.o4t, c.o6t];
  const row = [...items, ...items];
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {row.map((item, i) => (
          <span key={i}>
            <Mark size={14} />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stats({ c }: { c: Strings }) {
  return (
    <section className="stats" id="stats">
      <motion.div className="wrap stats-grid" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}>
        <motion.div className="stat" variants={rise}>
          <p className="stat-value">
            <CountUp to={570} />
          </p>
          <p className="stat-label">{c.stat1}</p>
        </motion.div>
        <motion.div className="stat" variants={rise}>
          <p className="stat-value">
            <CountUp to={2428} />
          </p>
          <p className="stat-label">{c.stat2}</p>
        </motion.div>
        <motion.div className="stat" variants={rise}>
          <p className="stat-value">
            <CountUp to={92} suffix="%+" />
          </p>
          <p className="stat-label">{c.stat3}</p>
        </motion.div>
        <motion.div className="stat" variants={rise}>
          <p className="stat-value">
            <CountUp to={10} prefix="~" />
          </p>
          <p className="stat-label">{c.stat4}</p>
        </motion.div>
      </motion.div>
      <p className="wrap source">{c.statsSource}</p>
    </section>
  );
}

function Culture({ c }: { c: Strings }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(3, Math.floor(v * 4.2))));
  const steps = [c.tree1, c.tree2, c.tree3, c.tree4];

  return (
    <section ref={ref} className="pin pin-culture" id="why">
      <div className="pin-sticky">
        <VideoBg clip={VIDEO.mosquePool} className="video-dim" />
        <div className="video-shade video-shade-side" aria-hidden="true" />
        <div className="wrap culture">
          <div className="culture-copy">
            <Reveal>
              <p className="eyebrow eyebrow-light">{c.whyKicker}</p>
              <h2>{c.whyTitle}</h2>
              <p className="lead">{c.whyBody1}</p>
            </Reveal>
            <ol className="culture-steps">
              {steps.map((step, i) => (
                <li key={step} className={i === active ? "is-on" : i < active ? "is-past" : ""}>
                  <span className="culture-num">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="culture-note">{c.whyBody2}</p>
          </div>
          <div className="culture-tree">
            <ScrollTree progress={scrollYProgress} c={c} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ScrollTree({ progress, c }: { progress: MotionValue<number>; c: Strings }) {
  const trunk = useTransform(progress, [0.05, 0.3], [0, 1]);
  const branches = useTransform(progress, [0.25, 0.55], [0, 1]);
  const kids = useTransform(progress, [0.5, 0.75], [0, 1]);
  const glowParents = useTransform(progress, [0.3, 0.45], [0, 1]);
  const glowKids = useTransform(progress, [0.6, 0.75], [0, 1]);
  const shield = useTransform(progress, [0.8, 0.95], [0, 1]);
  const shieldScale = useTransform(progress, [0.8, 0.95], [0.6, 1]);

  const person = (x: number, y: number, glow: MotionValue<number>, label?: string, big?: boolean) => (
    <g>
      <motion.circle cx={x} cy={y} r={big ? 40 : 30} fill="rgba(233,201,131,0.25)" style={{ opacity: glow }} />
      <circle cx={x} cy={y} r={big ? 27 : 22} fill="rgba(10,31,26,0.75)" stroke="rgba(238,230,214,0.6)" strokeWidth="1.5" />
      <circle cx={x} cy={y - 5} r={big ? 8 : 6.5} fill="#eee6d6" />
      <path d={`M${x - (big ? 13 : 11)} ${y + (big ? 15 : 13)} q${big ? 13 : 11} -${big ? 16 : 14} ${big ? 26 : 22} 0`} fill="#eee6d6" />
      <motion.circle cx={x + (big ? 19 : 16)} cy={y - (big ? 19 : 16)} r="7" fill="#e9c983" stroke="#0a1f1a" strokeWidth="2" style={{ opacity: glow, scale: glow }} />
      {label && (
        <text x={x} y={y + (big ? 52 : 44)} textAnchor="middle" className="ptree-label">
          {label}
        </text>
      )}
    </g>
  );

  return (
    <svg viewBox="0 0 400 420" className="ptree" role="img" aria-label={c.treeCaption}>
      <motion.path d="M200 70 V130" className="ptree-line" style={{ pathLength: trunk }} />
      <motion.path d="M200 130 H100 V180 M200 130 H300 V180" className="ptree-line" style={{ pathLength: branches }} />
      <motion.path d="M100 230 V285 M300 230 V285" className="ptree-line" style={{ pathLength: kids }} />
      <motion.path d="M128 330 Q200 380 272 330" className="ptree-line ptree-dash" style={{ pathLength: kids }} />
      {person(200, 46, trunk, c.treeGrand)}
      {person(100, 205, glowParents)}
      {person(300, 205, glowParents)}
      {person(100, 312, glowKids, c.treeLayla, true)}
      {person(300, 312, glowKids, c.treeOmar, true)}
      <motion.g style={{ opacity: shield, scale: shieldScale, transformOrigin: "200px 360px" }}>
        <circle cx="200" cy="362" r="22" fill="#e9c983" />
        <path d="M200 349 l-10 4 v8 c0 6 4.5 10.5 10 12 c5.5 -1.5 10 -6 10 -12 v-8 z M195 362 l3.5 3.5 l6.5 -7" fill="none" stroke="#0a1f1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </motion.g>
    </svg>
  );
}

const HARMS: { image: string; title: keyof Strings; body: keyof Strings; n: string }[] = [
  { image: PHOTO.walkingAway, title: "harm1t", body: "harm1b", n: "01" },
  { image: PHOTO.readingAlone, title: "harm2t", body: "harm2b", n: "02" },
  { image: PHOTO.celebration, title: "harm3t", body: "harm3b", n: "03" },
];

function Harms({ c }: { c: Strings }) {
  return (
    <section className="section section-sand" id="problem">
      <div className="wrap">
        <div className="split-head">
          <Reveal>
            <p className="eyebrow">{c.harmKicker}</p>
            <h2>{c.harmTitle}</h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="lead">{c.harmLead}</p>
          </Reveal>
        </div>
        <motion.div className="harm-grid" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }}>
          {HARMS.map((harm) => (
            <motion.article key={harm.title} className="harm" variants={rise} whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}>
              <div className="harm-img">
                <img src={harm.image} alt="" loading="lazy" />
                <span className="harm-n">{harm.n}</span>
              </div>
              <div className="harm-body">
                <h3>{c[harm.title]}</h3>
                <p>{c[harm.body]}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function HowScrolly({ c }: { c: Strings }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setActive(Math.min(3, Math.floor(v * 4))));
  const bar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const steps: { icon: IconName; title: keyof Strings; body: keyof Strings }[] = [
    { icon: "lock", title: "how1t", body: "how1b" },
    { icon: "shieldCheck", title: "how2t", body: "how2b" },
    { icon: "pen", title: "how3t", body: "how3b" },
    { icon: "steth", title: "how4t", body: "how4b" },
  ];

  return (
    <section ref={ref} className="pin pin-how" id="how">
      <div className="pin-sticky pin-sticky-light">
        <div className="wrap how">
          <div className="how-copy">
            <p className="eyebrow">{c.howKicker}</p>
            <h2>{c.howTitle}</h2>
            <p className="lead">{c.howSub}</p>
            <div className="how-steps">
              <div className="how-rail">
                <motion.span style={{ height: bar }} />
              </div>
              <ol>
                {steps.map((step, i) => (
                  <li key={step.title} className={i === active ? "is-on" : ""}>
                    <span className="how-icon">
                      <Icon name={step.icon} size={18} />
                    </span>
                    <div>
                      <h3>{c[step.title]}</h3>
                      <AnimatePresence initial={false}>
                        {i === active && (
                          <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4 }}>
                            {c[step.body]}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div className="how-device">
            <div className="how-photo">
              <img src={PHOTO.phoneStreet} alt="" loading="lazy" />
            </div>
            <div className="mock">
              <div className="mock-notch" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  className="mock-screen"
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <MockScreen step={active} c={c} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MockScreen({ step, c }: { step: number; c: Strings }) {
  if (step === 0) {
    return (
      <div className="mock-center">
        <motion.div className="mock-seal" animate={{ rotate: [0, -4, 4, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
          <Icon name="lock" size={30} />
        </motion.div>
        <p className="mock-tag">{c.phoneSealed}</p>
        <h4>{c.sealedT}</h4>
        <p>{c.n1b}</p>
        <span className="mock-btn">{c.ctaOpen}</span>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="mock-center">
        <div className="mock-hs">
          <span className="avatar avatar-lg is-yes">L</span>
          <motion.span className="mock-link" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, delay: 0.2 }} />
          <span className="avatar avatar-lg is-yes">O</span>
        </div>
        <p className="mock-tag">{c.phoneAgree}</p>
        <motion.div className="mock-gene" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", delay: 0.8 }}>
          USH2A
        </motion.div>
        <p>{c.togetherSub}</p>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="mock-form">
        <p className="mock-tag">{c.phoneExplain}</p>
        <h4>{c.chipCarrier}</h4>
        <div className="mock-input">
          <TypeOut text="I carry a change, but I’m healthy. It isn’t a diagnosis." />
        </div>
        <motion.p className="mock-ok" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2 }}>
          <Icon name="check" size={14} /> {c.explainedT}
        </motion.p>
      </div>
    );
  }
  return (
    <div className="mock-center">
      <p className="mock-tag">{c.phoneCare}</p>
      <div className="mock-card">
        <Icon name="calendar" size={18} />
        <span>{c.slot2}</span>
      </div>
      <motion.div initial={{ scale: 1.6, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: -4 }} transition={{ delay: 0.5, type: "spring", stiffness: 200, damping: 14 }}>
        <Seal size={90} />
      </motion.div>
      <h4>{c.certIssued}</h4>
      <p>{c.certFooter}</p>
    </div>
  );
}

function TypeOut({ text }: { text: string }) {
  return (
    <span>
      {text.split("").map((ch, i) => (
        <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + i * 0.025 }}>
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

const OUTCOMES: { icon: IconName; title: keyof Strings; body: keyof Strings; image?: string; wide?: boolean; full?: boolean }[] = [
  { icon: "info", title: "o1t", body: "o1b", image: PHOTO.coupleDesert, wide: true },
  { icon: "heart", title: "o2t", body: "o2b" },
  { icon: "steth", title: "o3t", body: "o3b", image: PHOTO.counselling },
  { icon: "shield", title: "o4t", body: "o4b" },
  { icon: "arrowRight", title: "o5t", body: "o5b" },
  { icon: "chart", title: "o6t", body: "o6b", image: PHOTO.generations, full: true },
];

function Outcomes({ c }: { c: Strings }) {
  return (
    <section className="section section-night">
      <div className="glow glow-b" aria-hidden="true" />
      <div className="wrap">
        <Reveal>
          <p className="eyebrow eyebrow-light">{c.outKicker}</p>
          <h2 className="narrow">{c.outTitle}</h2>
        </Reveal>
        <motion.div className="bento" variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
          {OUTCOMES.map((item, i) => (
            <motion.div key={item.title} variants={rise} className={item.full ? "bento-cell is-full" : item.wide ? "bento-cell is-wide" : "bento-cell"}>
              <Spotlight className={item.image ? "bento-card has-img" : "bento-card"}>
                {item.image && <img className="bento-img" src={item.image} alt="" loading="lazy" />}
                <div className="bento-content">
                  <div className="bento-top">
                    <span className="bento-icon">
                      <Icon name={item.icon} size={20} />
                    </span>
                    <span className="bento-num">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3>{c[item.title]}</h3>
                  <p>{c[item.body]}</p>
                </div>
              </Spotlight>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
