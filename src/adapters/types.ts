import type { CaseFiles, CasePresetId, PersonFile, PersonId } from "../domain/case.js";
import type { Lang } from "../domain/genes.js";
import type { AgentTurn } from "../loop.js";
import type { Reason } from "../logic.js";

export type AppMode = "prototype" | "live";
export type AdapterKind = "simulation" | "local" | "server" | "neon";
export type ViewerRole = "participant" | "counselor" | "court" | "system";
export type StaffRole = Exclude<ViewerRole, "participant">;

/** Who is using this browser in the live app. Participants hold a case token; staff hold a signed staff token. */
export type LiveIdentity =
  | { kind: "participant"; pairingCode: string; slot: "layla" | "omar"; token: string }
  | { kind: "staff"; role: StaffRole; token: string; exp: number; name: { en: string; ar: string } };

export type View = "landing" | "workspace" | "stage" | "counselor" | "court" | "system" | "agent" | "staff" | "access";
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
  | "interest"
  | "upload"
  | "join"
  | "view"
  | "share"
  | "confirm"
  | "repro"
  | "note"
  | "delete"
  | "register";

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
  /** Explicit consent: the genetic counsellor may see this person's full result, not only the shared part. */
  counselorFull: boolean;
  /** Language and view in use when this person explained the result, for the equity figures. */
  explainLang?: Lang;
  explainSimple?: boolean;
  /** This person removed their report and answers from Satr. */
  deleted?: boolean;
};

/**
 * What happens after counselling, recorded by the genetic counsellor so the route from a result
 * to care can be traced: a confirmatory test, and specialised reproductive-genomics services only
 * when the couple asks for them.
 */
export type CarePath = {
  confirmatory: "none" | "ordered" | "done";
  reproductive: "none" | "referred";
  /** The counsellor's plain-language summary of the session, shared with the couple. */
  note: string;
};

export type CaseSnapshot = {
  pairingCode: string | null;
  presetId: CasePresetId | "custom";
  files: CaseFiles;
  people: Record<PersonId, PersonRuntime>;
  booking: Slot | null;
  counseling: boolean;
  courtSeen: boolean;
  systemSeen: boolean;
  inviteSent: boolean;
  inviteSigned: boolean;
  referred: boolean;
  pathway?: CarePath;
  audit: AuditEvent[];
  updatedAt?: number;
};

export type LiveSessionMeta = {
  pairingCode: string;
  slot: PersonId;
  token: string;
};

export type SystemAggregateMetrics = {
  totalCases: number;
  firstTryUnderstandingPct: number | null;
  counselingBookedOrDonePct: number | null;
  unauthorisedViews: number;
  escalatedQuestions: number;
  reportsOpened: number;
  explainRetries: number;
  source: AdapterKind;
  medianDaysToCounselling?: number | null;
  medianDaysToReferral?: number | null;
  confirmatoryOrdered?: number;
  confirmatoryDone?: number;
  reproductiveReferrals?: number;
  committeeReferrals?: number;
  byGroup?: { key: "ar" | "ar-simple" | "en" | "en-simple"; people: number; firstTryPct: number | null }[];
};

export type CounselorCaseSummary = {
  pairingCode: string;
  names: Record<Lang, string>;
  numbers: string;
  tier: 1 | 2;
  sharedGenes: string[];
  counseling: boolean;
  explained: boolean;
  booking: Slot | null;
  referred?: boolean;
  updatedAt: number;
};

export interface CaseStoreAdapter {
  readonly kind: AdapterKind;
  createLiveCase(params: {
    nameEn: string;
    nameAr?: string;
    number?: string;
    file?: PersonFile;
  }): Promise<{ session: LiveSessionMeta; snapshot: CaseSnapshot }>;
  joinLiveCase(params: {
    pairingCode: string;
    nameEn: string;
    nameAr?: string;
    number?: string;
    file?: PersonFile;
  }): Promise<{ session: LiveSessionMeta; snapshot: CaseSnapshot }>;
  fetchCase(params: {
    pairingCode: string;
    role: ViewerRole;
    token?: string;
  }): Promise<CaseSnapshot | null>;
  saveSnapshot(params: {
    pairingCode: string;
    role: ViewerRole;
    slot?: PersonId;
    token?: string;
    snapshot: CaseSnapshot;
  }): Promise<CaseSnapshot>;
  subscribe?(pairingCode: string, onUpdate: () => void): () => void;
  fetchSystemMetrics(staffToken?: string): Promise<SystemAggregateMetrics>;
  listCounselorCases(staffToken?: string): Promise<CounselorCaseSummary[]>;
  listCourtCases?(staffToken?: string): Promise<CourtCaseSummary[]>;
  signInStaff?(role: StaffRole, key: string): Promise<StaffSession>;
  deleteParticipant?(pairingCode: string, token: string): Promise<boolean>;
  seedDemo?(key: string): Promise<SeededCouple[]>;
  resetAll?(key: string): Promise<void>;
  resumeSession?(pairingCode: string, token: string): Promise<{ session: LiveSessionMeta; snapshot: CaseSnapshot } | null>;
}

export type StaffSession = { role: StaffRole; token: string; exp: number; name: { en: string; ar: string } };

/** What the marriage court may know about a couple: process steps only, never a result. */
export type CourtCaseSummary = {
  pairingCode: string;
  names: Record<Lang, string>;
  numbers: string;
  stage: "waiting" | "progress" | "counselling" | "ready";
  issuedAt?: number;
  registeredAt?: number;
  updatedAt: number;
};

export type SeededCouple = {
  code: string;
  stage: "fresh" | "agreed" | "booked" | "counselled" | "referred";
  label: { en: string; ar: string };
  people: Record<"layla" | "omar", { name: { en: string; ar: string }; token: string }>;
};
