import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { defaultAskAdapter } from "./adapters/askEngine";
import { neonApiCaseAdapter } from "./adapters/neonApiAdapter";
import { createBlankPersonRuntime, createDefaultSnapshot } from "./adapters/simulationAdapter";
import type {
  AdapterKind,
  AppMode,
  AuditCode,
  AuditEvent,
  CarePath,
  CaseSnapshot,
  CounselorCaseSummary,
  CourtCaseSummary,
  Interest,
  LiveSessionMeta,
  PersonRuntime,
  Screen,
  Slot,
  StaffRole,
  StaffSession,
  SystemAggregateMetrics,
  View,
} from "./adapters/types";
import { harmfulSample, passingSample } from "./content";
import {
  analyzeCase,
  getPresetById,
  type CaseFiles,
  type CasePresetId,
  type PersonFile,
  type PersonId,
} from "./domain/case";
import type { Lang } from "./domain/genes";
import { scoreAnswer } from "./logic";

export type {
  AdapterKind,
  AppMode,
  AuditCode,
  AuditEvent,
  CaseSnapshot,
  CounselorCaseSummary,
  Interest,
  LiveSessionMeta,
  PersonRuntime,
  Screen,
  Slot,
  StaffRole,
  StaffSession,
  SystemAggregateMetrics,
  View,
};

export type State = CaseSnapshot & {
  lang: Lang;
  view: View;
  appMode: AppMode;
  focus: PersonId;
};

export type Action =
  | { type: "lang"; lang: Lang }
  | { type: "view"; view: View }
  | { type: "mode"; appMode: AppMode; view?: View }
  | { type: "focus"; id: PersonId }
  | { type: "screen"; id: PersonId; screen: Screen }
  | { type: "simple"; id: PersonId }
  | { type: "open"; id: PersonId }
  | { type: "consent"; id: PersonId }
  | { type: "withdraw"; id: PersonId }
  | { type: "draft"; id: PersonId; text: string }
  | { type: "sample"; id: PersonId; kind: "pass" | "fail" }
  | { type: "submit"; id: PersonId }
  | { type: "askdraft"; id: PersonId; text: string }
  | { type: "ask"; id: PersonId; text?: string }
  | { type: "enrichTurn"; id: PersonId; q: string; customSpeech: Partial<Record<Lang, string>> }
  | { type: "interest"; id: PersonId; interest: Interest }
  | { type: "book"; id: PersonId; slot: Slot }
  | { type: "counselorShare"; id: PersonId; on: boolean }
  | { type: "counsel" }
  | { type: "signInvite"; on: boolean }
  | { type: "invite"; id: PersonId }
  | { type: "refer" }
  | { type: "confirm"; stage: "ordered" | "done" }
  | { type: "repro" }
  | { type: "counselNote"; text: string }
  | { type: "register" }
  | { type: "setPreset"; presetId: CasePresetId }
  | { type: "setReport"; id: PersonId; file: PersonFile }
  | { type: "hydrateSnapshot"; snapshot: CaseSnapshot; focus?: PersonId; appMode?: AppMode; view?: View }
  | { type: "reset" };

export function freshState(
  lang: Lang = "en",
  view: View = "landing",
  appMode: AppMode = "prototype",
): State {
  return {
    ...createDefaultSnapshot(),
    lang,
    view,
    appMode,
    focus: "layla",
  };
}

export const EMPTY_PATH: CarePath = { confirmatory: "none", reproductive: "none", note: "" };

/** The care path recorded so far (older saved cases have none yet). */
export function carePath(c: Pick<CaseSnapshot, "pathway">): CarePath {
  return c.pathway ?? EMPTY_PATH;
}

export function isCompiled(state: Pick<State, "people">): boolean {
  return state.people.layla.consented && state.people.omar.consented;
}

export function isExplained(state: Pick<State, "people">): boolean {
  return state.people.layla.passed && state.people.omar.passed;
}

export function isReleased(state: Pick<State, "people" | "counseling">): boolean {
  return isExplained(state) && state.counseling;
}

function log(state: State, code: AuditCode, id?: PersonId, detail?: string): AuditEvent[] {
  return [...state.audit, { code, id, detail, at: Date.now() }];
}

function withPerson(
  state: State,
  id: PersonId,
  next: Partial<PersonRuntime>,
  code?: AuditCode,
  detail?: string,
): State {
  return {
    ...state,
    people: { ...state.people, [id]: { ...state.people[id], ...next } },
    audit: code ? log(state, code, id, detail) : state.audit,
    updatedAt: Date.now(),
  };
}

export function extractSnapshot(state: State): CaseSnapshot {
  return {
    pairingCode: state.pairingCode,
    presetId: state.presetId,
    files: state.files,
    people: state.people,
    booking: state.booking,
    counseling: state.counseling,
    courtSeen: state.courtSeen,
    systemSeen: state.systemSeen,
    inviteSent: state.inviteSent,
    inviteSigned: state.inviteSigned,
    referred: state.referred,
    pathway: state.pathway,
    audit: state.audit,
    updatedAt: state.updatedAt ?? Date.now(),
  };
}

function reduce(state: State, action: Action): State {
  switch (action.type) {
    case "lang":
      return { ...state, lang: action.lang };
    case "view":
      return {
        ...state,
        view: action.view,
        courtSeen: state.courtSeen || (action.view === "court" && isReleased(state)),
        systemSeen: state.systemSeen || (action.view === "system" && state.inviteSent),
      };
    case "mode": {
      const nextView =
        action.view ??
        (action.appMode === "live"
          ? "workspace"
          : state.view === "workspace" || state.view === "landing"
            ? "stage"
            : state.view);
      // Each mode keeps its own data: the guided demo never shows a live case, and the live app
      // never starts from the scripted couple.
      if (action.appMode !== state.appMode) {
        return { ...freshState(state.lang, nextView, action.appMode), pairingCode: null };
      }
      return {
        ...state,
        appMode: action.appMode,
        view: nextView,
      };
    }
    case "focus":
      return { ...state, focus: action.id };
    case "screen":
      return withPerson({ ...state, focus: action.id }, action.id, { screen: action.screen });
    case "simple":
      return withPerson(state, action.id, { simple: !state.people[action.id].simple });
    case "open": {
      const current = state.people[action.id];
      const focused = { ...state, focus: action.id };
      if (current.opened) return withPerson(focused, action.id, { screen: "result" });
      return withPerson(focused, action.id, { opened: true, screen: "result" }, "open");
    }
    case "consent": {
      const current = state.people[action.id];
      if (current.consented || !current.opened) return state;
      const people = { ...state.people, [action.id]: { ...current, consented: true } };
      const audit = log(state, "consent", action.id);
      const compiled = people.layla.consented && people.omar.consented;
      return {
        ...state,
        people,
        audit: compiled ? [...audit, { code: "compiled", at: Date.now() + 1 }] : audit,
        updatedAt: Date.now(),
      };
    }
    case "withdraw": {
      if (isCompiled(state) || !state.people[action.id].consented) return state;
      return withPerson(state, action.id, { consented: false }, "withdraw");
    }
    case "draft":
      return withPerson(state, action.id, { draft: action.text, attempt: null });
    case "sample": {
      const person = state.people[action.id];
      const text =
        action.kind === "fail"
          ? harmfulSample(state.lang)
          : passingSample(action.id, person.step, state.lang, state.files);
      return withPerson(state, action.id, { draft: text, attempt: null });
    }
    case "submit": {
      if (!isCompiled(state)) return state;
      const person = state.people[action.id];
      if (person.passed) return state;
      const analysis = analyzeCase(state.files);
      const privateGenes = [
        ...state.files.layla.findings,
        ...state.files.omar.findings,
      ]
        .map((f) => f.gene)
        .filter((g) => !analysis.sharedGenes.includes(g));
      const graded = scoreAnswer(person.step, person.draft, {
        privateGenes,
        sharedCount: analysis.sharedGenes.length,
      });
      const firstTry = [...person.firstTry];
      if (firstTry[person.step] === undefined) firstTry[person.step] = graded.pass;
      if (!graded.pass) {
        return withPerson(state, action.id, { attempt: graded.reason, firstTry, explainLang: state.lang, explainSimple: person.simple }, "fail");
      }
      const answers: [string, string, string] = [...person.answers];
      answers[person.step] = person.draft.trim();
      if (person.step < 2) {
        return withPerson(state, action.id, {
          answers,
          firstTry,
          step: (person.step + 1) as 0 | 1 | 2,
          draft: "",
          attempt: null,
        });
      }
      return withPerson(
        state,
        action.id,
        { answers, firstTry, draft: "", attempt: null, passed: true, explainLang: state.lang, explainSimple: person.simple },
        "passed",
      );
    }
    case "askdraft":
      return withPerson(state, action.id, { askDraft: action.text });
    case "ask": {
      const person = state.people[action.id];
      const q = (action.text ?? person.askDraft).trim();
      if (!q) return state;
      const turn = defaultAskAdapter.answerSync({
        personId: action.id,
        question: q,
        opened: person.opened,
        compiled: isCompiled(state),
        files: state.files,
        lang: state.lang,
      });
      const needsHuman = turn.steps.includes("refuse_decision") || turn.steps.includes("hand_to_physician");
      return withPerson(
        state,
        action.id,
        {
          askDraft: "",
          thread: [...person.thread, turn].slice(-12),
          escalations: person.escalations + (needsHuman ? 1 : 0),
        },
        needsHuman ? "escalate" : undefined,
        needsHuman ? q : undefined,
      );
    }
    case "enrichTurn": {
      const person = state.people[action.id];
      const idx = [...person.thread].reverse().findIndex((t) => t.q === action.q);
      if (idx < 0) return state;
      const targetIndex = person.thread.length - 1 - idx;
      const updatedThread = person.thread.map((t, i) =>
        i === targetIndex ? { ...t, customSpeech: { ...t.customSpeech, ...action.customSpeech } } : t,
      );
      return withPerson(state, action.id, { thread: updatedThread });
    }
    case "interest": {
      const person = state.people[action.id];
      if (person.interests.includes(action.interest)) {
        return withPerson(state, action.id, { interests: person.interests.filter((i) => i !== action.interest) });
      }
      return withPerson(
        state,
        action.id,
        { interests: [...person.interests, action.interest] },
        "interest",
        action.interest,
      );
    }
    case "book":
      if (!isExplained(state) || state.booking) return state;
      return { ...state, booking: action.slot, audit: log(state, "book", action.id, action.slot), updatedAt: Date.now() };
    case "counselorShare":
      if (state.people[action.id].counselorFull === action.on) return state;
      return withPerson(state, action.id, { counselorFull: action.on }, "share", action.on ? "on" : "off");
    case "counsel":
      if (!isExplained(state) || state.counseling) return state;
      return { ...state, counseling: true, audit: log(state, "counsel"), updatedAt: Date.now() };
    case "signInvite":
      return { ...state, inviteSigned: action.on, updatedAt: Date.now() };
    case "invite":
      if (state.inviteSent) return state;
      return { ...state, inviteSent: true, audit: log(state, "invite", action.id), updatedAt: Date.now() };
    case "refer":
      if (state.referred) return state;
      return { ...state, referred: true, audit: log(state, "refer"), updatedAt: Date.now() };
    case "confirm": {
      const path = carePath(state);
      if (!state.counseling && !state.referred) return state;
      if (path.confirmatory === action.stage || (path.confirmatory === "done" && action.stage === "ordered")) return state;
      return {
        ...state,
        pathway: { ...path, confirmatory: action.stage },
        audit: log(state, "confirm", undefined, action.stage),
        updatedAt: Date.now(),
      };
    }
    case "repro": {
      const path = carePath(state);
      if ((!state.counseling && !state.referred) || path.reproductive === "referred") return state;
      return { ...state, pathway: { ...path, reproductive: "referred" }, audit: log(state, "repro"), updatedAt: Date.now() };
    }
    case "register": {
      if (!isReleased(state) || state.audit.some((ev) => ev.code === "register")) return state;
      return { ...state, audit: log(state, "register"), updatedAt: Date.now() };
    }
    case "counselNote": {
      const path = carePath(state);
      const text = action.text.trim().slice(0, 1200);
      if (text === path.note) return state;
      const first = !path.note && text;
      return {
        ...state,
        pathway: { ...path, note: text },
        audit: first ? log(state, "note") : state.audit,
        updatedAt: Date.now(),
      };
    }
    case "setPreset": {
      const preset = getPresetById(action.presetId);
      return {
        ...state,
        pairingCode: null,
        presetId: preset.id,
        files: structuredClone(preset.files),
        people: {
          layla: createBlankPersonRuntime(),
          omar: createBlankPersonRuntime(),
        },
        booking: null,
        counseling: false,
        courtSeen: false,
        systemSeen: false,
        inviteSent: false,
        inviteSigned: false,
        referred: false,
        audit: [],
        updatedAt: Date.now(),
      };
    }
    case "setReport": {
      const nextFiles: CaseFiles = {
        ...state.files,
        [action.id]: { ...action.file, id: action.id, joined: true },
      };
      const resetPartner = (p: PersonRuntime, opened: boolean): PersonRuntime => ({
        ...p,
        opened,
        consented: false,
        step: 0,
        answers: ["", "", ""],
        attempt: null,
        passed: false,
      });
      return {
        ...state,
        presetId: "custom",
        files: nextFiles,
        people: {
          layla: resetPartner(state.people.layla, action.id === "layla" ? true : state.people.layla.opened),
          omar: resetPartner(state.people.omar, action.id === "omar" ? true : state.people.omar.opened),
        },
        booking: null,
        counseling: false,
        courtSeen: false,
        audit: log(state, "upload", action.id),
        updatedAt: Date.now(),
      };
    }
    case "hydrateSnapshot": {
      const s = action.snapshot;
      return {
        ...state,
        ...s,
        // A snapshot without a care path (court view, older cases) must not keep a stale one.
        pathway: s.pathway,
        focus: action.focus ?? state.focus,
        appMode: action.appMode ?? state.appMode,
        view: action.view ?? state.view,
        // Preserve locally typed drafts so background sync never wipes active typing
        people: {
          layla: {
            ...s.people.layla,
            draft: state.people.layla.draft || s.people.layla.draft,
            askDraft: state.people.layla.askDraft || s.people.layla.askDraft,
            screen: state.appMode === "live" ? state.people.layla.screen : s.people.layla.screen,
          },
          omar: {
            ...s.people.omar,
            draft: state.people.omar.draft || s.people.omar.draft,
            askDraft: state.people.omar.askDraft || s.people.omar.askDraft,
            screen: state.appMode === "live" ? state.people.omar.screen : s.people.omar.screen,
          },
        },
      };
    }
    case "reset": {
      if (state.appMode === "live") {
        return {
          ...freshState(state.lang, "workspace", "live"),
          pairingCode: null,
        };
      }
      const baseFiles =
        state.presetId === "custom" ? state.files : structuredClone(getPresetById(state.presetId).files);
      return {
        ...freshState(state.lang, state.view === "landing" ? "landing" : "stage", "prototype"),
        presetId: state.presetId,
        files: baseFiles,
      };
    }
    default:
      return state;
  }
}

export type GuideKey = "g1" | "g2" | "g3" | "g4" | "g5" | "g6" | "g7" | "g8" | "g9";

export type GuideStep = {
  index: number;
  key: GuideKey;
  outcomes: number[];
  run: Action[];
};

/** Derived from the case itself, so the presenter guide can never drift from what the phones show. */
const DEMO_NOTE = {
  en: "You both carry a change in the same gene, and you are both healthy. We talked through what 1 in 4 means for each pregnancy, and the options you asked about. A confirmatory test is arranged, and you can ask me anything before you decide what is right for you.",
  ar: "تحملان معاً تغييراً في الجين نفسه، وأنتما بصحة جيدة. تحدثنا عن معنى احتمال 1 من 4 في كل حمل، وعن الخيارات التي سألتما عنها. رُتّب فحص تأكيدي، ويمكنكما سؤالي عن أي شيء قبل أن تقررا ما يناسبكما.",
};

export function guideStep(state: State): GuideStep {
  const { layla, omar } = state.people;
  const stage: Action = { type: "view", view: "stage" };
  if (!layla.opened) return { index: 0, key: "g1", outcomes: [1, 4], run: [stage, { type: "open", id: "layla" }] };
  if (!omar.opened) return { index: 1, key: "g2", outcomes: [1, 4], run: [stage, { type: "open", id: "omar" }] };
  if (!isCompiled(state)) {
    const next: PersonId = layla.consented ? "omar" : "layla";
    return {
      index: 2,
      key: "g3",
      outcomes: [4],
      run: [stage, { type: "screen", id: next, screen: "share" }, { type: "consent", id: next }],
    };
  }
  if (!isExplained(state)) {
    const next: PersonId = layla.passed ? "omar" : "layla";
    return {
      index: 3,
      key: "g4",
      outcomes: [1, 6],
      run: [
        stage,
        { type: "screen", id: next, screen: "explain" },
        ...[0, 1, 2].flatMap((): Action[] => [
          { type: "sample", id: next, kind: "pass" },
          { type: "submit", id: next },
        ]),
      ],
    };
  }
  if (!state.counseling) {
    return {
      index: 4,
      key: "g5",
      outcomes: [2, 3, 5],
      run: [
        { type: "interest", id: "layla", interest: "opt2" },
        { type: "book", id: "layla", slot: "slot2" },
        { type: "view", view: "counselor" },
        { type: "counsel" },
        { type: "confirm", stage: "ordered" },
        { type: "counselNote", text: state.lang === "ar" ? DEMO_NOTE.ar : DEMO_NOTE.en },
      ],
    };
  }
  if (!state.courtSeen) return { index: 5, key: "g6", outcomes: [4], run: [{ type: "view", view: "court" }] };
  if (!state.inviteSent) {
    return {
      index: 6,
      key: "g7",
      outcomes: [4, 5],
      run: [stage, { type: "screen", id: "layla", screen: "family" }, { type: "invite", id: "layla" }],
    };
  }
  if (!state.systemSeen) return { index: 7, key: "g8", outcomes: [6], run: [{ type: "view", view: "system" }] };
  return { index: 8, key: "g9", outcomes: [2, 3, 4], run: [{ type: "view", view: "agent" }] };
}

const SESSION_STORAGE_KEY = "satr:live:session:v1";

function loadStoredSession(): LiveSessionMeta | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LiveSessionMeta) : null;
  } catch {
    return null;
  }
}

function saveStoredSession(meta: LiveSessionMeta | null) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  if (!meta) window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  else window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(meta));
}

const STAFF_STORAGE_KEY = "satr:staff:session:v1";

function loadStaffSession(): StaffSession | null {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(STAFF_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as StaffSession) : null;
    return parsed && parsed.exp > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

function saveStaffSession(meta: StaffSession | null) {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  if (!meta) window.sessionStorage.removeItem(STAFF_STORAGE_KEY);
  else window.sessionStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(meta));
}

/** The view each staff role works in. */
export const STAFF_VIEW: Record<StaffRole, View> = { counselor: "counselor", court: "court", system: "system" };

export type SatrContextValue = {
  state: State;
  dispatch: Dispatch<Action>;
  adapterKind: AdapterKind;
  liveSession: LiveSessionMeta | null;
  systemMetrics: SystemAggregateMetrics | null;
  counselorCases: CounselorCaseSummary[];
  switchMode: (mode: AppMode, targetView?: View) => void;
  startLiveCase: (params: {
    nameEn: string;
    nameAr?: string;
    number?: string;
    file?: PersonFile;
  }) => Promise<LiveSessionMeta>;
  joinLiveCase: (params: {
    pairingCode: string;
    nameEn: string;
    nameAr?: string;
    number?: string;
    file?: PersonFile;
  }) => Promise<LiveSessionMeta>;
  leaveLiveCase: () => void;
  inspectCounselorCase: (pairingCode: string) => Promise<void>;
  refreshLiveCase: () => Promise<void>;
  staffSession: StaffSession | null;
  demoKeyHint: boolean;
  signInStaff: (role: StaffRole, key: string) => Promise<void>;
  signOutStaff: () => void;
  lookupCourtCase: (pairingCode: string) => Promise<boolean>;
  systemError: string | null;
  resumeLiveCase: (pairingCode: string, token: string) => Promise<boolean>;
  deleteMyReport: () => Promise<void>;
  courtCases: CourtCaseSummary[];
};

const Ctx = createContext<SatrContextValue | null>(null);

export function SatrProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reduce, undefined, () => freshState());
  const [liveBackendKind, setLiveBackendKind] = useState<AdapterKind>("local");
  const [liveSession, setLiveSession] = useState<LiveSessionMeta | null>(() => loadStoredSession());
  const [systemMetrics, setSystemMetrics] = useState<SystemAggregateMetrics | null>(null);
  const [counselorCases, setCounselorCases] = useState<CounselorCaseSummary[]>([]);
  const [courtCases, setCourtCases] = useState<CourtCaseSummary[]>([]);
  const [staffSession, setStaffSession] = useState<StaffSession | null>(() => loadStaffSession());
  const [systemError, setSystemError] = useState<string | null>(null);
  const [demoKeyHint, setDemoKeyHint] = useState(false);
  const staffRef = useRef(staffSession);
  useEffect(() => {
    staffRef.current = staffSession;
  }, [staffSession]);
  const skipNextSave = useRef(false);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // Probe Neon API availability on mount
  useEffect(() => {
    let active = true;
    neonApiCaseAdapter.checkAvailability().then((kind) => {
      if (!active) return;
      setLiveBackendKind(kind);
      setDemoKeyHint(kind === "local" || neonApiCaseAdapter.demoKey);
    });
    return () => {
      active = false;
    };
  }, []);

  // Rehydrate stored live session if present
  useEffect(() => {
    const existing = loadStoredSession();
    if (!existing || loadStaffSession()) return;
    neonApiCaseAdapter
      .fetchCase({ pairingCode: existing.pairingCode, role: "participant", token: existing.token })
      .then((snap) => {
        if (!snap) {
          saveStoredSession(null);
          setLiveSession(null);
          return;
        }
        skipNextSave.current = true;
        rawDispatch({
          type: "hydrateSnapshot",
          snapshot: snap,
          focus: existing.slot,
          appMode: "live",
          view: "workspace",
        });
      });
  }, []);

  // Coming back to the live app from the guided demo reloads this applicant's own case.
  useEffect(() => {
    if (state.appMode !== "live" || state.pairingCode || !liveSession || staffSession) return;
    void neonApiCaseAdapter
      .fetchCase({ pairingCode: liveSession.pairingCode, role: "participant", token: liveSession.token })
      .then((snap) => {
        if (!snap) return;
        skipNextSave.current = true;
        rawDispatch({ type: "hydrateSnapshot", snapshot: snap, focus: liveSession.slot });
      });
  }, [state.appMode, state.pairingCode, liveSession, staffSession]);

  const dispatch: Dispatch<Action> = useCallback((action: Action) => {
    rawDispatch(action);
    // Optional async grounded synthesis enrichment on manual Ask turns
    if (action.type === "ask") {
      const current = stateRef.current;
      const person = current.people[action.id];
      const q = (action.text ?? person.askDraft).trim();
      if (q) {
        void defaultAskAdapter
          .answer({
            personId: action.id,
            question: q,
            opened: person.opened,
            compiled: isCompiled(current),
            files: current.files,
            lang: current.lang,
          })
          .then((turn) => {
            if (turn.customSpeech && Object.keys(turn.customSpeech).length > 0) {
              rawDispatch({ type: "enrichTurn", id: action.id, q, customSpeech: turn.customSpeech });
            }
          });
      }
    }
  }, []);

  // Persist mutations to Live Adapter when in live mode with an active pairingCode
  useEffect(() => {
    if (state.appMode !== "live" || !state.pairingCode) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const snapshot = extractSnapshot(stateRef.current);
    if (staffSession) {
      // Analysts only read. Counsellors record sessions and referrals; the court registers certificates.
      if (staffSession.role === "system") return;
      void neonApiCaseAdapter.saveSnapshot({
        pairingCode: state.pairingCode,
        role: staffSession.role,
        token: staffSession.token,
        snapshot,
      });
      return;
    }
    if (!liveSession || liveSession.pairingCode !== state.pairingCode) return;
    void neonApiCaseAdapter.saveSnapshot({
      pairingCode: state.pairingCode,
      role: "participant",
      slot: liveSession.slot,
      token: liveSession.token,
      snapshot,
    });
  }, [
    state.appMode,
    state.pairingCode,
    state.files,
    state.people,
    state.booking,
    state.counseling,
    state.inviteSent,
    state.inviteSigned,
    state.referred,
    state.pathway,
    state.audit.length,
    liveSession,
    staffSession,
  ]);

  const refreshLiveCase = useCallback(async () => {
    const current = stateRef.current;
    if (current.appMode !== "live" || !current.pairingCode) return;
    const staff = staffRef.current;
    if (staff?.role === "system") return;
    if (!staff && !liveSession) return;
    const snap = await neonApiCaseAdapter.fetchCase({
      pairingCode: current.pairingCode,
      role: staff ? staff.role : "participant",
      token: staff ? staff.token : liveSession?.token,
    });
    if (snap) {
      skipNextSave.current = true;
      rawDispatch({ type: "hydrateSnapshot", snapshot: snap });
    }
  }, [liveSession]);

  // Subscribe to cross-tab BroadcastChannel or Neon polling updates
  useEffect(() => {
    if (state.appMode !== "live" || !state.pairingCode) return;
    return neonApiCaseAdapter.subscribe(state.pairingCode, () => {
      void refreshLiveCase();
    });
  }, [state.appMode, state.pairingCode, refreshLiveCase]);

  // Staff desks in the live app load only what the signed-in role may see, using the staff token.
  useEffect(() => {
    if (state.appMode !== "live" || !staffSession) return;
    let timer: number | undefined;
    if (state.view === "system" && staffSession.role === "system") {
      const load = () =>
        neonApiCaseAdapter
          .fetchSystemMetrics(staffSession.token)
          .then((m) => {
            setSystemMetrics(m);
            setSystemError(null);
          })
          .catch((err: unknown) => setSystemError(err instanceof Error ? err.message : "Could not load figures"));
      void load();
      timer = window.setInterval(load, 5000);
    }
    if (state.view === "court" && staffSession.role === "court") {
      const load = () => neonApiCaseAdapter.listCourtCases(staffSession.token).then(setCourtCases);
      void load();
      timer = window.setInterval(load, 5000);
    }
    if (state.view === "counselor" && staffSession.role === "counselor") {
      const load = () => neonApiCaseAdapter.listCounselorCases(staffSession.token).then(setCounselorCases);
      void load();
      timer = window.setInterval(load, 5000);
    }
    return () => window.clearInterval(timer);
  }, [state.view, state.appMode, staffSession]);

  const switchMode = useCallback((mode: AppMode, targetView?: View) => {
    rawDispatch({ type: "mode", appMode: mode, view: targetView });
  }, []);

  const startLiveCase = useCallback(
    async (params: { nameEn: string; nameAr?: string; number?: string; file?: PersonFile }) => {
      const created = await neonApiCaseAdapter.createLiveCase(params);
      saveStaffSession(null);
      setStaffSession(null);
      setLiveBackendKind(neonApiCaseAdapter.kind);
      setLiveSession(created.session);
      saveStoredSession(created.session);
      skipNextSave.current = true;
      rawDispatch({
        type: "hydrateSnapshot",
        snapshot: created.snapshot,
        focus: created.session.slot,
        appMode: "live",
        view: "workspace",
      });
      return created.session;
    },
    [],
  );

  const joinLiveCase = useCallback(
    async (params: {
      pairingCode: string;
      nameEn: string;
      nameAr?: string;
      number?: string;
      file?: PersonFile;
    }) => {
      const joined = await neonApiCaseAdapter.joinLiveCase(params);
      saveStaffSession(null);
      setStaffSession(null);
      setLiveBackendKind(neonApiCaseAdapter.kind);
      setLiveSession(joined.session);
      saveStoredSession(joined.session);
      skipNextSave.current = true;
      rawDispatch({
        type: "hydrateSnapshot",
        snapshot: joined.snapshot,
        focus: joined.session.slot,
        appMode: "live",
        view: "workspace",
      });
      return joined.session;
    },
    [],
  );

  const resumeLiveCase = useCallback(async (pairingCode: string, token: string) => {
    const resumed = await neonApiCaseAdapter.resumeSession(pairingCode, token);
    if (!resumed) return false;
    saveStaffSession(null);
    setStaffSession(null);
    setLiveSession(resumed.session);
    saveStoredSession(resumed.session);
    skipNextSave.current = true;
    rawDispatch({ type: "hydrateSnapshot", snapshot: resumed.snapshot, focus: resumed.session.slot, appMode: "live", view: "workspace" });
    return true;
  }, []);

  const deleteMyReport = useCallback(async () => {
    if (!liveSession) return;
    await neonApiCaseAdapter.deleteParticipant(liveSession.pairingCode, liveSession.token);
    saveStoredSession(null);
    setLiveSession(null);
    rawDispatch({ type: "reset" });
  }, [liveSession]);

  const leaveLiveCase = useCallback(() => {
    saveStoredSession(null);
    setLiveSession(null);
    rawDispatch({ type: "reset" });
  }, []);

  const signInStaff = useCallback(async (role: StaffRole, key: string) => {
    const session = await neonApiCaseAdapter.signInStaff(role, key);
    saveStaffSession(session);
    setStaffSession(session);
    // A staff browser never keeps an applicant's file open at the same time.
    saveStoredSession(null);
    setLiveSession(null);
    setCounselorCases([]);
    setSystemMetrics(null);
    rawDispatch({ type: "hydrateSnapshot", snapshot: { ...createDefaultSnapshot(), pairingCode: null }, appMode: "live", view: STAFF_VIEW[role] });
  }, []);

  const signOutStaff = useCallback(() => {
    saveStaffSession(null);
    setStaffSession(null);
    setCounselorCases([]);
    setSystemMetrics(null);
    rawDispatch({ type: "hydrateSnapshot", snapshot: { ...createDefaultSnapshot(), pairingCode: null }, appMode: "live", view: "staff" });
  }, []);

  const lookupCourtCase = useCallback(async (pairingCode: string) => {
    const staff = staffRef.current;
    if (staff?.role !== "court") return false;
    const snap = await neonApiCaseAdapter.fetchCase({ pairingCode, role: "court", token: staff.token });
    if (!snap) return false;
    skipNextSave.current = true;
    rawDispatch({ type: "hydrateSnapshot", snapshot: snap, appMode: "live", view: "court" });
    return true;
  }, []);

  const inspectCounselorCase = useCallback(async (pairingCode: string) => {
    const staff = staffRef.current;
    if (staff?.role !== "counselor") return;
    const snap = await neonApiCaseAdapter.fetchCase({ pairingCode, role: "counselor", token: staff.token });
    if (!snap) return;
    skipNextSave.current = true;
    rawDispatch({
      type: "hydrateSnapshot",
      snapshot: snap,
      appMode: "live",
      view: "counselor",
    });
  }, []);

  const adapterKind: AdapterKind = state.appMode === "prototype" ? "simulation" : liveBackendKind;

  return (
    <Ctx.Provider
      value={{
        state,
        dispatch,
        adapterKind,
        liveSession,
        systemMetrics,
        counselorCases,
        switchMode,
        startLiveCase,
        joinLiveCase,
        leaveLiveCase,
        inspectCounselorCase,
        refreshLiveCase,
        staffSession,
        demoKeyHint,
        signInStaff,
        signOutStaff,
        lookupCourtCase,
        systemError,
        resumeLiveCase,
        deleteMyReport,
        courtCases,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSatr() {
  const value = useContext(Ctx);
  if (!value) throw new Error("SatrProvider missing");
  return value;
}
