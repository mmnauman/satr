import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import type { Lang } from "./strings";
import { harmfulSample, passingSample, type PersonId } from "./content";
import { plan, type AgentTurn } from "./loop";
import { interpret, scoreAnswer, type Reason } from "./logic";

export type View = "landing" | "stage" | "counselor" | "court" | "system" | "agent";
export type Screen = "home" | "result" | "share" | "explain" | "ask" | "family";
export type Interest = "opt1" | "opt2" | "opt3" | "opt4";
export type Slot = "slot1" | "slot2" | "slot3";

export type AuditCode =
  | "open"
  | "consent"
  | "withdraw"
  | "compiled"
  | "passed"
  | "fail"
  | "counsel"
  | "invite"
  | "refer"
  | "escalate"
  | "book"
  | "interest";

export type AuditEvent = { code: AuditCode; id?: PersonId; detail?: string; at: number };

export type PersonRuntime = {
  screen: Screen;
  simple: boolean;
  opened: boolean;
  consented: boolean;
  step: 0 | 1 | 2;
  answers: [string, string, string];
  attempt: Reason | null;
  firstTry: boolean[];
  passed: boolean;
  draft: string;
  askDraft: string;
  thread: AgentTurn[];
  escalations: number;
  interests: Interest[];
};

export type State = {
  lang: Lang;
  view: View;
  focus: PersonId;
  people: Record<PersonId, PersonRuntime>;
  booking: Slot | null;
  counseling: boolean;
  courtSeen: boolean;
  systemSeen: boolean;
  inviteSent: boolean;
  inviteSigned: boolean;
  referred: boolean;
  audit: AuditEvent[];
};

export type Action =
  | { type: "lang"; lang: Lang }
  | { type: "view"; view: View }
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
  | { type: "interest"; id: PersonId; interest: Interest }
  | { type: "book"; id: PersonId; slot: Slot }
  | { type: "counsel" }
  | { type: "signInvite"; on: boolean }
  | { type: "invite"; id: PersonId }
  | { type: "refer" }
  | { type: "reset" };

function blankPerson(): PersonRuntime {
  return {
    screen: "home",
    simple: false,
    opened: false,
    consented: false,
    step: 0,
    answers: ["", "", ""],
    attempt: null,
    firstTry: [],
    passed: false,
    draft: "",
    askDraft: "",
    thread: [],
    escalations: 0,
    interests: [],
  };
}

export function freshState(lang: Lang = "en", view: View = "landing"): State {
  return {
    lang,
    view,
    focus: "layla",
    people: { layla: blankPerson(), omar: blankPerson() },
    booking: null,
    counseling: false,
    courtSeen: false,
    systemSeen: false,
    inviteSent: false,
    inviteSigned: false,
    referred: false,
    audit: [],
  };
}

export function isCompiled(state: State): boolean {
  return state.people.layla.consented && state.people.omar.consented;
}

export function isExplained(state: State): boolean {
  return state.people.layla.passed && state.people.omar.passed;
}

export function isReleased(state: State): boolean {
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
        action.kind === "fail" ? harmfulSample(state.lang) : passingSample(action.id, person.step, state.lang);
      return withPerson(state, action.id, { draft: text, attempt: null });
    }
    case "submit": {
      if (!isCompiled(state)) return state;
      const person = state.people[action.id];
      if (person.passed) return state;
      const graded = scoreAnswer(person.step, person.draft);
      const firstTry = [...person.firstTry];
      if (firstTry[person.step] === undefined) firstTry[person.step] = graded.pass;
      if (!graded.pass) return withPerson(state, action.id, { attempt: graded.reason, firstTry }, "fail");
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
      return withPerson(state, action.id, { answers, firstTry, draft: "", attempt: null, passed: true }, "passed");
    }
    case "askdraft":
      return withPerson(state, action.id, { askDraft: action.text });
    case "ask": {
      const person = state.people[action.id];
      const q = (action.text ?? person.askDraft).trim();
      if (!q) return state;
      const intent = interpret(q);
      const steps = plan(intent);
      const needsHuman = steps.includes("refuse_decision") || steps.includes("hand_to_physician");
      const turn: AgentTurn = { q, intent, opened: person.opened, compiled: isCompiled(state), steps };
      return withPerson(
        state,
        action.id,
        {
          askDraft: "",
          thread: [...person.thread, turn].slice(-8),
          escalations: person.escalations + (needsHuman ? 1 : 0),
        },
        needsHuman ? "escalate" : undefined,
        needsHuman ? q : undefined,
      );
    }
    case "interest": {
      const person = state.people[action.id];
      if (person.interests.includes(action.interest)) {
        return withPerson(state, action.id, { interests: person.interests.filter((i) => i !== action.interest) });
      }
      return withPerson(state, action.id, { interests: [...person.interests, action.interest] }, "interest", action.interest);
    }
    case "book":
      if (!isExplained(state) || state.booking) return state;
      return { ...state, booking: action.slot, audit: log(state, "book", action.id, action.slot) };
    case "counsel":
      if (!isExplained(state) || state.counseling) return state;
      return { ...state, counseling: true, audit: log(state, "counsel") };
    case "signInvite":
      return { ...state, inviteSigned: action.on };
    case "invite":
      if (state.inviteSent) return state;
      return { ...state, inviteSent: true, audit: log(state, "invite", action.id) };
    case "refer":
      if (state.referred) return state;
      return { ...state, referred: true, audit: log(state, "refer") };
    case "reset":
      return freshState(state.lang, state.view === "landing" ? "landing" : "stage");
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
      run: [{ type: "book", id: "layla", slot: "slot2" }, { type: "view", view: "counselor" }, { type: "counsel" }],
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

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

export function SatrProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, undefined, () => freshState());
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useSatr() {
  const value = useContext(Ctx);
  if (!value) throw new Error("SatrProvider missing");
  return value;
}
