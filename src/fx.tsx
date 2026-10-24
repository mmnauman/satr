import { animate, motion, useInView, useMotionValue, useReducedMotion, useSpring, type Variants } from "motion/react";
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Clip } from "./media";

export const ease = [0.22, 1, 0.36, 1] as const;

export function Reveal({
  children,
  delay = 0,
  y = 36,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "p" | "h2" | "figure";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </Tag>
  );
}

const wordVariants: Variants = {
  hidden: { y: "110%", opacity: 0 },
  show: (i: number) => ({ y: "0%", opacity: 1, transition: { duration: 0.9, delay: 0.15 + i * 0.06, ease } }),
};

/** Headline that rises in word by word. Arabic keeps whole words, so it works in both directions. */
export function SplitWords({ text, className, inView = false }: { text: string; className?: string; inView?: boolean }) {
  const words = text.split(" ");
  const trigger = inView
    ? { initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.5 } }
    : { initial: "hidden", animate: "show" };
  return (
    <motion.span className={className} {...trigger} aria-label={text}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className="word-mask" aria-hidden="true">
            <motion.span className="word" custom={i} variants={wordVariants}>
              {word}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </motion.span>
  );
}

export function CountUp({ to, prefix = "", suffix = "", decimals = 0 }: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  useEffect(() => {
    const node = ref.current;
    if (!inView || !node) return;
    const format = (v: number) => `${prefix}${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    if (reduce) {
      node.textContent = format(to);
      return;
    }
    const controls = animate(0, to, { duration: 2, ease, onUpdate: (v) => (node.textContent = format(v)) });
    return () => controls.stop();
  }, [inView, to, prefix, suffix, decimals, reduce]);
  return (
    <span ref={ref}>
      {prefix}0{suffix}
    </span>
  );
}

/** Background video that only plays while it's on screen, so the page stays light. */
export function VideoBg({ clip, className, style }: { clip: Clip; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLVideoElement>(null);
  const inView = useInView(ref, { amount: 0.05 });
  const reduce = useReducedMotion();
  useEffect(() => {
    const video = ref.current;
    if (!video || reduce) return;
    if (inView) video.play().catch(() => undefined);
    else video.pause();
  }, [inView, reduce]);
  return (
    <video
      ref={ref}
      className={className ? `video-bg ${className}` : "video-bg"}
      style={style}
      src={clip.src}
      poster={clip.poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
    />
  );
}

export function Magnetic({ children, strength = 0.35 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  return (
    <motion.span
      ref={ref}
      className="magnetic"
      style={{ x, y }}
      onPointerMove={(event) => {
        const box = ref.current?.getBoundingClientRect();
        if (!box || event.pointerType !== "mouse") return;
        x.set((event.clientX - box.left - box.width / 2) * strength);
        y.set((event.clientY - box.top - box.height / 2) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

/** Card with a soft light that follows the pointer. */
export function Spotlight({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={className ? `spotlight ${className}` : "spotlight"}
      onPointerMove={(event) => {
        const box = ref.current?.getBoundingClientRect();
        if (!box) return;
        ref.current?.style.setProperty("--mx", `${event.clientX - box.left}px`);
        ref.current?.style.setProperty("--my", `${event.clientY - box.top}px`);
      }}
    >
      {children}
    </div>
  );
}

const GLYPHS = "0123456789abcdef";

/** Text that resolves out of random hex, used wherever data is being encrypted or decrypted. */
export function Scramble({ text, play = true, duration = 900 }: { text: string; play?: boolean; duration?: number }) {
  const [shown, setShown] = useState(text);
  useEffect(() => {
    if (!play) {
      setShown(text);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const settled = Math.floor(progress * text.length);
      setShown(
        text
          .split("")
          .map((ch, i) => (i < settled || ch === "…" || ch === " " ? ch : GLYPHS[Math.floor(Math.random() * 16)]))
          .join(""),
      );
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, play, duration]);
  return <>{shown}</>;
}

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export const rise: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};
