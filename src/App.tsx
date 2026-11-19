import { AnimatePresence, motion } from "motion/react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { StaffRole } from "./adapters/types";
import { hashToRoute, routeToHash } from "./routing";
import { roleLabel, StaffSignIn } from "./Staff";
import { fill, t } from "./strings";
import { SatrProvider, STAFF_VIEW, useSatr, type View } from "./store";
import { Icon, Mark } from "./visuals";

// Each screen loads only when it is first opened, so the overview page arrives quickly.
const Landing = lazy(() => import("./Landing").then((m) => ({ default: m.Landing })));
const Workspace = lazy(() => import("./Workspace").then((m) => ({ default: m.Workspace })));
const Stage = lazy(() => import("./Stage").then((m) => ({ default: m.Stage })));
const GuideDock = lazy(() => import("./Stage").then((m) => ({ default: m.GuideDock })));
const CounselorDesk = lazy(() => import("./Desks").then((m) => ({ default: m.CounselorDesk })));
const CourtDesk = lazy(() => import("./Desks").then((m) => ({ default: m.CourtDesk })));
const SystemDesk = lazy(() => import("./Desks").then((m) => ({ default: m.SystemDesk })));
const AgentDesk = lazy(() => import("./Agent").then((m) => ({ default: m.AgentDesk })));
const CourtRegister = lazy(() => import("./Court").then((m) => ({ default: m.CourtRegister })));
const CourtToolbar = lazy(() => import("./Court").then((m) => ({ default: m.CourtToolbar })));
const AccessPage = lazy(() => import("./Access").then((m) => ({ default: m.AccessPage })));
const DemoBar = lazy(() => import("./Access").then((m) => ({ default: m.DemoBar })));

function demoFlag(): boolean {
  try {
    return window.sessionStorage.getItem("satr:demo:on") === "1";
  } catch {
    return false;
  }
}

function ViewLoading() {
  return (
    <div className="view-loading" role="status" aria-live="polite">
      <Mark size={34} />
    </div>
  );
}

type NavItem = { view: View; label: string };

function TopBar() {
  const { state, dispatch, switchMode, adapterKind, liveSession, staffSession, signOutStaff, leaveLiveCase } = useSatr();
  const c = t(state.lang);
  const landing = state.view === "landing";
  const live = state.appMode === "live";
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Each role sees only its own screens. The guided demo keeps every view, labelled as simulated.
  const nav: NavItem[] = !live
    ? [
        { view: "stage", label: c.navStage },
        { view: "counselor", label: c.navCounselor },
        { view: "court", label: c.navCourt },
        { view: "system", label: c.navSystem },
        { view: "agent", label: c.navAgent },
      ]
    : staffSession
      ? [{ view: STAFF_VIEW[staffSession.role], label: roleLabel(staffSession.role, c) }]
      : [
          { view: "workspace", label: c.navWorkspace },
          { view: "agent", label: c.navAgent },
        ];

  const adapterLabel =
    adapterKind === "neon"
      ? c.adapterNeon
      : adapterKind === "server"
        ? c.adapterServer
        : adapterKind === "local"
          ? c.adapterLocal
          : c.adapterSim;

  return (
    <header className={landing ? `topbar topbar-landing${solid ? " is-solid" : ""}` : "topbar"}>
      <button type="button" className="brand" onClick={() => dispatch({ type: "view", view: "landing" })}>
        <Mark />
        <span className="brand-word">{c.brand}</span>
      </button>
      {!landing && (
        <nav className="topnav" aria-label="Views">
          {!live && <span className="guided-badge">{c.guidedBadge}</span>}
          {nav.map((item) => (
            <button
              key={item.view}
              type="button"
              className={state.view === item.view ? "is-on" : ""}
              aria-current={state.view === item.view ? "page" : undefined}
              onClick={() => dispatch({ type: "view", view: item.view })}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}
      <div className="topbar-tools">
        {!landing && (
          <span className="topbar-adapter" title={adapterLabel}>
            <span className="live-dot" aria-hidden="true" />
            <span className="topbar-adapter-text">{adapterLabel}</span>
          </span>
        )}
        <button
          type="button"
          className="ghost"
          onClick={() => dispatch({ type: "lang", lang: state.lang === "en" ? "ar" : "en" })}
        >
          <Icon name="globe" size={16} />
          {c.langSwitch}
        </button>
        {landing ? (
          <>
            <button type="button" className="ghost topbar-live-link" onClick={() => switchMode("live", "access")}>
              <Icon name="play" size={15} />
              {c.posterDemo}
            </button>
            <button type="button" className="btn btn-gold btn-sm" onClick={() => switchMode("live", "workspace")}>
              <Icon name="upload" size={15} />
              {c.openLiveApp}
            </button>
          </>
        ) : !live ? (
          <>
            <button type="button" className="ghost" onClick={() => dispatch({ type: "reset" })}>
              <Icon name="refresh" size={16} />
              {c.startAgain}
            </button>
            <button type="button" className="btn btn-gold btn-sm" onClick={() => switchMode("live", "workspace")}>
              <Icon name="upload" size={15} />
              {c.openLiveApp}
            </button>
          </>
        ) : staffSession ? (
          <>
            <span className="topbar-who">{fill(c.staffSignedIn, { name: staffSession.name[state.lang] })}</span>
            <button type="button" className="ghost" onClick={signOutStaff}>
              <Icon name="x" size={15} />
              {c.staffSignOut}
            </button>
          </>
        ) : (
          <>
            {liveSession && (
              <button type="button" className="ghost" onClick={leaveLiveCase}>
                <Icon name="refresh" size={15} />
                {c.wsLeave}
              </button>
            )}
            <button type="button" className="ghost" onClick={() => dispatch({ type: "view", view: "access" })}>
              <Icon name="users" size={15} />
              {c.accessNav}
            </button>
            <button type="button" className="ghost" onClick={() => dispatch({ type: "view", view: "staff" })}>
              <Icon name="lock" size={15} />
              {c.navStaff}
            </button>
          </>
        )}
      </div>
    </header>
  );
}

const STAFF_ONLY: Partial<Record<View, StaffRole>> = { counselor: "counselor", court: "court", system: "system" };

/** Keeps the address bar and the current screen in step, both ways. */
function useHashRoute() {
  const { state, dispatch, switchMode, resumeLiveCase } = useSatr();
  const ref = useRef(state);
  useEffect(() => {
    ref.current = state;
  });

  useEffect(() => {
    const apply = () => {
      const route = hashToRoute(window.location.hash);
      if (!route) return;
      if (route.signin) {
        // Take the private token out of the address bar and history straight away.
        window.history.replaceState(null, "", "#/me");
        void resumeLiveCase(route.signin.code, route.signin.token);
        return;
      }
      const cur = ref.current;
      if (route.appMode !== cur.appMode) switchMode(route.appMode, route.view);
      else if (route.view !== cur.view) dispatch({ type: "view", view: route.view });
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [dispatch, switchMode, resumeLiveCase]);

  const first = useRef(true);
  useEffect(() => {
    // On first render the route from the address bar has not been applied yet; leave it alone.
    if (first.current) {
      first.current = false;
      return;
    }
    const current = hashToRoute(window.location.hash);
    if (current && current.appMode === state.appMode && current.view === state.view) return;
    const next = routeToHash(state.appMode, state.view);
    if (next !== window.location.hash) window.history.pushState(null, "", next);
  }, [state.appMode, state.view]);
}

function LiveView() {
  const { state, staffSession } = useSatr();
  const needed = STAFF_ONLY[state.view];
  if (state.view === "staff") return <StaffSignIn />;
  if (state.view === "access") return <AccessPage />;
  if (needed && staffSession?.role !== needed) return <StaffSignIn wanted={needed} />;
  if (state.view === "court") {
    if (!state.pairingCode) return <CourtRegister />;
    return (
      <>
        <CourtToolbar />
        <CourtDesk />
      </>
    );
  }
  if (state.view === "counselor") return <CounselorDesk />;
  if (state.view === "system") return <SystemDesk />;
  if (state.view === "agent") return <AgentDesk />;
  return <Workspace />;
}

function Shell() {
  const { state } = useSatr();
  useHashRoute();

  useEffect(() => {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
    document.title =
      state.lang === "ar"
        ? "ستر · افهما نتائجكما الجينية بخصوصية"
        : "Satr · Understand your genetic results, privately";
  }, [state.lang]);

  const showGuideDock =
    state.appMode === "prototype" &&
    (state.view === "counselor" ||
      state.view === "court" ||
      state.view === "system" ||
      state.view === "agent");

  return (
    <div className={`app view-${state.view}`}>
      <TopBar />
      {state.appMode === "live" && state.view !== "landing" && (demoFlag() || state.view === "access") && (
        <Suspense fallback={null}>
          <DemoBar />
        </Suspense>
      )}
      <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, behavior: "instant" })}>
        <motion.div
          key={`${state.appMode}-${state.view}`}
          className="view"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <Suspense fallback={<ViewLoading />}>
          {state.view === "landing" ? (
            <Landing />
          ) : state.appMode === "live" ? (
            <LiveView />
          ) : (
            <>
              {(state.view === "stage" || state.view === "workspace" || state.view === "staff" || state.view === "access") && <Stage />}
              {state.view === "counselor" && <CounselorDesk />}
              {state.view === "court" && <CourtDesk />}
              {state.view === "system" && <SystemDesk />}
              {state.view === "agent" && <AgentDesk />}
            </>
          )}
          </Suspense>
        </motion.div>
      </AnimatePresence>
      {showGuideDock && (
        <Suspense fallback={null}>
          <GuideDock />
        </Suspense>
      )}
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
