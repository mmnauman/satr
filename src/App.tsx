import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { CounselorDesk, CourtDesk, SystemDesk } from "./Desks";
import { Landing } from "./Landing";
import { GuideDock, Stage } from "./Stage";
import { t } from "./strings";
import { SatrProvider, useSatr, type View } from "./store";
import { Icon, Mark } from "./visuals";

const NAV: { view: View; key: "navStage" | "navCounselor" | "navCourt" | "navSystem" }[] = [
  { view: "stage", key: "navStage" },
  { view: "counselor", key: "navCounselor" },
  { view: "court", key: "navCourt" },
  { view: "system", key: "navSystem" },
];

function TopBar() {
  const { state, dispatch } = useSatr();
  const c = t(state.lang);
  const landing = state.view === "landing";
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header className={landing ? `topbar topbar-landing${solid ? " is-solid" : ""}` : "topbar"}>
      <button type="button" className="brand" onClick={() => dispatch({ type: "view", view: "landing" })}>
        <Mark />
        <span className="brand-word">{c.brand}</span>
      </button>
      {!landing && (
        <nav className="topnav" aria-label="Views">
          {NAV.map((item) => (
            <button
              key={item.view}
              type="button"
              className={state.view === item.view ? "is-on" : ""}
              aria-current={state.view === item.view ? "page" : undefined}
              onClick={() => dispatch({ type: "view", view: item.view })}
            >
              {c[item.key]}
            </button>
          ))}
        </nav>
      )}
      <div className="topbar-tools">
        <button
          type="button"
          className="ghost"
          onClick={() => dispatch({ type: "lang", lang: state.lang === "en" ? "ar" : "en" })}
        >
          <Icon name="globe" size={16} />
          {c.langSwitch}
        </button>
        {landing ? (
          <button type="button" className="btn btn-gold btn-sm" onClick={() => dispatch({ type: "view", view: "stage" })}>
            {c.tryDemo}
          </button>
        ) : (
          <button type="button" className="ghost" onClick={() => dispatch({ type: "reset" })}>
            <Icon name="refresh" size={16} />
            {c.startAgain}
          </button>
        )}
      </div>
    </header>
  );
}

function Shell() {
  const { state } = useSatr();

  useEffect(() => {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
    document.title = state.lang === "ar" ? "ستر · افهما نتائجكما الجينية بخصوصية" : "Satr · Understand your genetic results, privately";
  }, [state.lang]);

  return (
    <div className={`app view-${state.view}`}>
      <TopBar />
      <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, behavior: "instant" })}>
        <motion.div
          key={state.view}
          className="view"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {state.view === "landing" && <Landing />}
          {state.view === "stage" && <Stage />}
          {state.view === "counselor" && <CounselorDesk />}
          {state.view === "court" && <CourtDesk />}
          {state.view === "system" && <SystemDesk />}
        </motion.div>
      </AnimatePresence>
      {(state.view === "counselor" || state.view === "court" || state.view === "system") && <GuideDock />}
    </div>
  );
}

export default function App() {
  return (
    <SatrProvider>
      <Shell />
    </SatrProvider>
  );
}
