import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform, type MotionValue } from "motion/react";
import { useRef, useState, type FormEvent } from "react";
import { CountUp, Reveal, rise, SplitWords, Spotlight, stagger, VideoBg } from "./fx";
import { CREDITS, PHOTO, VIDEO } from "./media";
import { LiveAsk, RouteSection } from "./Journey";
import { MatchPlayground, RoleLens, Simulator } from "./Playground";
import { t, type Strings } from "./strings";
import { useSatr } from "./store";
import { Icon, Mark, Seal, type IconName } from "./visuals";

export function Landing() {
  const { state, switchMode } = useSatr();
  const c = t(state.lang);
  const start = () => switchMode("live", "access");
  const openLive = () => switchMode("live", "workspace");
  const [handoff, setHandoff] = useState<{ q: string; n: number } | null>(null);
  const askFromPoster = (q: string) => {
    setHandoff((prev) => ({ q, n: (prev?.n ?? 0) + 1 }));
    document.getElementById("ask")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="landing">
      <Hero c={c} start={start} openLive={openLive} onAsk={askFromPoster} />
      <Ticker c={c} />
      <Stats c={c} />
      <LiveAsk incoming={handoff} openLive={openLive} />
      <Culture c={c} />
      <Harms c={c} />
      <RouteSection />

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
            <div className="hero-ctas" style={{ justifyContent: "center" }}>
              <button type="button" className="btn btn-gold btn-xl btn-hero" onClick={openLive}>
                <Icon name="upload" size={18} />
                {c.posterStart}
              </button>
              <button type="button" className="btn btn-glass btn-xl" onClick={start}>
                <Icon name="play" size={18} />
                {c.posterDemo}
              </button>
            </div>
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

function Hero({ c, start, openLive, onAsk }: { c: Strings; start: () => void; openLive: () => void; onAsk: (q: string) => void }) {
  const [q, setQ] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (q.trim()) onAsk(q.trim());
  };
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

      <motion.div className="hero-inner poster" style={{ opacity: fade }}>
        <div className="poster-copy">
          <motion.p className="eyebrow eyebrow-light hero-eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="live-dot" />
            {c.heroEyebrow}
          </motion.p>
          <h1 className="poster-title" aria-label={`${c.posterA} ${c.posterJoin} ${c.posterB}`}>
            <PosterLine className="pt-a" delay={0.15}>{c.posterA}</PosterLine>
            <PosterLine className="pt-join" delay={0.4}>{c.posterJoin}</PosterLine>
            <PosterLine className="pt-b" delay={0.6}>{c.posterB}</PosterLine>
          </h1>
          <motion.p className="poster-lead" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.9 }}>
            {c.posterLead}
          </motion.p>
          <motion.form className="poster-ask" onSubmit={submit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 1.05 }}>
            <Icon name="chat" size={20} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={c.posterAskPh} aria-label={c.posterAskLabel} />
            <button type="submit" className="btn btn-gold" disabled={!q.trim()}>
              {c.posterAskGo}
              <Icon name="arrowRight" size={16} className="flip-rtl" />
            </button>
          </motion.form>
          <motion.p className="poster-hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
            <Icon name="shieldCheck" size={14} />
            {c.posterAskHint}
          </motion.p>
          <motion.div className="hero-ctas poster-ctas" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 1.2 }}>
            <button type="button" className="btn btn-gold btn-lg btn-hero" onClick={openLive}>
              <Icon name="upload" size={18} />
              {c.posterStart}
            </button>
            <button type="button" className="btn btn-glass btn-lg" onClick={start}>
              <Icon name="play" size={18} />
              {c.posterDemo}
            </button>
          </motion.div>
        </div>

        <div className="hero-notes poster-notes" aria-hidden="true">
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

function PosterLine({ children, className, delay }: { children: string; className: string; delay: number }) {
  return (
    <span className={`poster-line ${className}`} aria-hidden="true">
      <motion.span
        initial={{ y: "105%", opacity: 0 }}
        animate={{ y: "0%", opacity: 1 }}
        transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.span>
    </span>
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
