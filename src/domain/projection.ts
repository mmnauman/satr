import type {
  AdapterKind,
  AuditEvent,
  CourtCaseSummary,
  CaseSnapshot,
  CounselorCaseSummary,
  PersonRuntime,
  SystemAggregateMetrics,
  ViewerRole,
} from "../adapters/types";
import { analyzeCase, otherPersonId, type PersonId } from "./case";

const PROCESS_CODES = new Set<AuditEvent["code"]>(["join", "open", "consent", "compiled", "passed", "book", "counsel", "view", "register"]);

function redactPersonRuntime(runtime: PersonRuntime): PersonRuntime {
  return {
    ...runtime,
    answers: ["", "", ""],
    draft: "",
    askDraft: "",
    thread: [],
  };
}

/**
 * Enforces least-privilege role redaction on a canonical CaseSnapshot.
 * Used identically on the Vercel / Neon API boundary and in automated privacy checks.
 */
export function projectSnapshotForRole(
  canonical: CaseSnapshot,
  viewer: { role: ViewerRole; slot?: PersonId },
): CaseSnapshot {
  if (viewer.role === "counselor") {
    // The counsellor sees the shared result, and a person's full result only if that person agreed.
    const compiledForCounselor = canonical.people.layla.consented && canonical.people.omar.consented;
    const shared = new Set(analyzeCase(canonical.files).sharedGenes);
    const scoped = (id: PersonId) =>
      canonical.people[id].counselorFull
        ? structuredClone(canonical.files[id].findings)
        : canonical.files[id].findings.filter((f) => compiledForCounselor && shared.has(f.gene)).map((f) => structuredClone(f));
    const tidy = (r: PersonRuntime): PersonRuntime => ({ ...structuredClone(r), draft: "", askDraft: "" });
    return {
      ...structuredClone(canonical),
      files: {
        layla: { ...structuredClone(canonical.files.layla), findings: scoped("layla") },
        omar: { ...structuredClone(canonical.files.omar), findings: scoped("omar") },
      },
      people: { layla: tidy(canonical.people.layla), omar: tidy(canonical.people.omar) },
    };
  }

  if (viewer.role === "court" || viewer.role === "system") {
    return {
      ...canonical,
      pathway: undefined,
      files: {
        layla: { ...canonical.files.layla, findings: [] },
        omar: { ...canonical.files.omar, findings: [] },
      },
      people: {
        layla: { ...redactPersonRuntime(canonical.people.layla), interests: [] },
        omar: { ...redactPersonRuntime(canonical.people.omar), interests: [] },
      },
      // Process steps only: never a referral, a test, a question or a note.
      audit: canonical.audit.filter((ev) => PROCESS_CODES.has(ev.code)).map((ev) => ({ code: ev.code, at: ev.at })),
    };
  }

  // Participant projection: strip partner's private genes, answers, drafts, and chat thread
  const me: PersonId = viewer.slot ?? "layla";
  const other: PersonId = otherPersonId(me);
  const compiled = canonical.people.layla.consented && canonical.people.omar.consented;
  const sharedSet = new Set(analyzeCase(canonical.files).sharedGenes);

  const otherPermittedFindings = compiled
    ? canonical.files[other].findings.filter((f) => sharedSet.has(f.gene) && f.classification !== "vus")
    : [];

  return {
    ...canonical,
    files: {
      ...canonical.files,
      [me]: structuredClone(canonical.files[me]),
      [other]: {
        ...canonical.files[other],
        findings: structuredClone(otherPermittedFindings),
      },
    },
    people: {
      ...canonical.people,
      [me]: structuredClone(canonical.people[me]),
      [other]: redactPersonRuntime(canonical.people[other]),
    },
    audit: canonical.audit.map((ev) =>
      ev.code === "escalate" && ev.id === other ? { ...ev, detail: undefined } : { ...ev },
    ),
  };
}

/**
 * Merges a participant's local mutation back into the canonical server snapshot without
 * allowing one participant to overwrite or erase the other participant's private report or answers.
 */
export function mergeParticipantUpdate(
  canonical: CaseSnapshot,
  slot: PersonId,
  incoming: CaseSnapshot,
): CaseSnapshot {
  const prevReportJson = JSON.stringify(canonical.files[slot].findings.map((f) => `${f.gene}:${f.classification}`));
  const nextReportJson = JSON.stringify(incoming.files[slot].findings.map((f) => `${f.gene}:${f.classification}`));
  const reportChanged = prevReportJson !== nextReportJson;

  const other = otherPersonId(slot);
  const nextOtherRuntime: PersonRuntime = reportChanged
    ? {
        ...canonical.people[other],
        consented: false,
        passed: false,
        step: 0,
        answers: ["", "", ""],
        attempt: null,
      }
    : canonical.people[other];

  const mergedPeople = {
    ...canonical.people,
    [slot]: incoming.people[slot],
    [other]: nextOtherRuntime,
  };

  return {
    ...canonical,
    files: {
      ...canonical.files,
      [slot]: { ...incoming.files[slot], joined: true },
      [other]: canonical.files[other],
    },
    people: mergedPeople,
    booking: reportChanged ? null : incoming.booking ?? canonical.booking,
    // Only the counsellor can record a session or a referral; a participant cannot set these.
    counseling: reportChanged ? false : canonical.counseling,
    inviteSent: canonical.inviteSent || incoming.inviteSent,
    inviteSigned: incoming.inviteSigned,
    referred: canonical.referred,
    pathway: canonical.pathway,
    audit: appendAudit(canonical.audit, incoming.audit, (ev) => (ev.id === slot || ev.code === "compiled") && !STAFF_CODES.has(ev.code)),
    updatedAt: Date.now(),
  };
}

const STAFF_CODES = new Set<AuditEvent["code"]>(["counsel", "refer", "view", "confirm", "repro", "note"]);

function auditKey(ev: AuditEvent): string {
  return `${ev.at}|${ev.code}|${ev.id ?? ""}`;
}

/**
 * The activity log is append-only: a save can add new events the sender is allowed to write,
 * but it can never remove or rewrite what is already recorded.
 */
export function appendAudit(
  existing: AuditEvent[],
  incoming: AuditEvent[],
  allowed: (ev: AuditEvent) => boolean,
): AuditEvent[] {
  const seen = new Set(existing.map(auditKey));
  const added = incoming.filter((ev) => !seen.has(auditKey(ev)) && allowed(ev));
  return [...existing, ...added].sort((a, b) => a.at - b.at);
}

/** Merges what a signed-in counsellor may change: the session record, the referral and the booking. */
export function mergeCounselorUpdate(canonical: CaseSnapshot, incoming: CaseSnapshot): CaseSnapshot {
  return {
    ...canonical,
    counseling: incoming.counseling,
    referred: incoming.referred,
    booking: incoming.booking ?? canonical.booking,
    pathway: incoming.pathway ?? canonical.pathway,
    audit: appendAudit(canonical.audit, incoming.audit, (ev) => STAFF_CODES.has(ev.code) && ev.code !== "view"),
    updatedAt: Date.now(),
  };
}

/** A case reaches the counsellor's queue only once the couple has booked a session. */
export function counselorMayOpen(c: CaseSnapshot): boolean {
  return Boolean(c.booking || c.counseling || c.referred);
}

/** Adds one "staff opened this" entry, at most once every 30 minutes per role, so the couple can see it. */
export function recordStaffView(c: CaseSnapshot, role: "counselor" | "court" | "system"): CaseSnapshot | null {
  const recent = c.audit.some((ev) => ev.code === "view" && ev.detail === role && Date.now() - ev.at < 30 * 60 * 1000);
  if (recent) return null;
  return { ...c, audit: [...c.audit, { code: "view", detail: role, at: Date.now() }], updatedAt: Date.now() };
}

export function computeSystemMetrics(
  cases: CaseSnapshot[],
  source: AdapterKind,
  unauthorisedViews = 0,
): SystemAggregateMetrics {
  let firstTryTotal = 0;
  let firstTryPassed = 0;
  let eligibleCouples = 0;
  let bookedOrCounselled = 0;
  let escalatedQuestions = 0;
  let reportsOpened = 0;
  let explainRetries = 0;
  let confirmatoryOrdered = 0;
  let confirmatoryDone = 0;
  let reproductiveReferrals = 0;
  let committeeReferrals = 0;
  const toCounselling: number[] = [];
  const toReferral: number[] = [];
  type GroupKey = "ar" | "ar-simple" | "en" | "en-simple";
  const groups = new Map<GroupKey, { people: number; tries: number; passed: number }>();
  const DAY = 24 * 60 * 60 * 1000;

  for (const c of cases) {
    for (const id of ["layla", "omar"] as const) {
      const p = c.people[id];
      if (p.opened) reportsOpened += 1;
      const tries = p.firstTry.filter((ft): ft is boolean => typeof ft === "boolean");
      for (const ft of tries) {
        firstTryTotal += 1;
        if (ft) firstTryPassed += 1;
      }
      if (tries.length > 0) {
        const key = `${p.explainLang ?? "en"}${p.explainSimple ? "-simple" : ""}` as GroupKey;
        const g = groups.get(key) ?? { people: 0, tries: 0, passed: 0 };
        g.people += 1;
        g.tries += tries.length;
        g.passed += tries.filter(Boolean).length;
        groups.set(key, g);
      }
    }
    // Time from the first result being opened to counselling, and to a referral onward.
    const firstOpen = c.audit.find((ev) => ev.code === "open")?.at;
    const counselAt = c.audit.find((ev) => ev.code === "counsel")?.at;
    const referAt = c.audit.find((ev) => ev.code === "refer" || ev.code === "repro" || (ev.code === "confirm" && ev.detail === "ordered"))?.at;
    if (firstOpen && counselAt) toCounselling.push((counselAt - firstOpen) / DAY);
    if (firstOpen && referAt) toReferral.push((referAt - firstOpen) / DAY);
    const path = c.pathway;
    if (path?.confirmatory === "ordered" || path?.confirmatory === "done") confirmatoryOrdered += 1;
    if (path?.confirmatory === "done") confirmatoryDone += 1;
    if (path?.reproductive === "referred") reproductiveReferrals += 1;
    if (c.referred) committeeReferrals += 1;
    if (c.files.layla.joined && c.files.omar.joined) {
      eligibleCouples += 1;
      if (c.booking || c.counseling) bookedOrCounselled += 1;
    }
    for (const ev of c.audit) {
      if (ev.code === "escalate") escalatedQuestions += 1;
      if (ev.code === "fail") explainRetries += 1;
    }
  }

  return {
    totalCases: cases.length,
    firstTryUnderstandingPct:
      firstTryTotal > 0 ? Math.round((firstTryPassed / firstTryTotal) * 100) : null,
    counselingBookedOrDonePct:
      eligibleCouples > 0 ? Math.round((bookedOrCounselled / eligibleCouples) * 100) : null,
    unauthorisedViews,
    escalatedQuestions,
    reportsOpened,
    explainRetries,
    source,
    medianDaysToCounselling: median(toCounselling),
    medianDaysToReferral: median(toReferral),
    confirmatoryOrdered,
    confirmatoryDone,
    reproductiveReferrals,
    committeeReferrals,
    byGroup: (["ar", "ar-simple", "en", "en-simple"] as const).map((key) => {
      const g = groups.get(key);
      return { key, people: g?.people ?? 0, firstTryPct: g && g.tries > 0 ? Math.round((g.passed / g.tries) * 100) : null };
    }),
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const m = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(m * 10) / 10;
}

export function summarizeCounselorCase(c: CaseSnapshot): CounselorCaseSummary {
  const analysis = analyzeCase(c.files);
  return {
    pairingCode: c.pairingCode ?? "DEMO",
    names: {
      en: `${c.files.layla.name.en} & ${c.files.omar.name.en}`,
      ar: `${c.files.layla.name.ar} و ${c.files.omar.name.ar}`,
    },
    numbers: `${c.files.layla.number} · ${c.files.omar.number}`,
    tier: analysis.tier,
    sharedGenes: analysis.sharedGenes,
    counseling: c.counseling,
    referred: c.referred,
    explained: c.people.layla.passed && c.people.omar.passed,
    booking: c.booking,
    updatedAt: c.updatedAt ?? Date.now(),
  };
}

/**
 * A participant removes their own report: findings, answers, drafts and questions go. Their
 * partner can no longer match against anything, and the log keeps only the fact of removal.
 */
export function removeParticipant(canonical: CaseSnapshot, slot: PersonId, blank: PersonRuntime): CaseSnapshot {
  const other = otherPersonId(slot);
  return {
    ...canonical,
    files: {
      ...canonical.files,
      [slot]: { ...canonical.files[slot], findings: [], reportSource: "Removed by its owner" },
    },
    people: {
      ...canonical.people,
      [slot]: { ...blank, deleted: true },
      [other]: { ...canonical.people[other], consented: false },
    },
    audit: [
      ...canonical.audit.map((ev) => (ev.id === slot && ev.code === "escalate" ? { ...ev, detail: undefined } : ev)),
      { code: "delete", id: slot, at: Date.now() },
    ],
    updatedAt: Date.now(),
  };
}

/** The court's register line for a couple: names, screening numbers and where they are in the process. */
export function summarizeCourtCase(c: CaseSnapshot): CourtCaseSummary {
  const both = c.files.layla.joined && c.files.omar.joined;
  const explained = c.people.layla.passed && c.people.omar.passed;
  const stage: CourtCaseSummary["stage"] = !both ? "waiting" : !explained ? "progress" : !c.counseling ? "counselling" : "ready";
  return {
    pairingCode: c.pairingCode ?? "DEMO",
    names: {
      en: `${c.files.layla.name.en} & ${c.files.omar.name.en}`,
      ar: `${c.files.layla.name.ar} و ${c.files.omar.name.ar}`,
    },
    numbers: `${c.files.layla.number} · ${c.files.omar.number}`,
    stage,
    issuedAt: c.audit.find((ev) => ev.code === "counsel")?.at,
    registeredAt: c.audit.find((ev) => ev.code === "register")?.at,
    updatedAt: c.updatedAt ?? Date.now(),
  };
}

/** The court may do one thing: register an issued certificate. Nothing else it sends is kept. */
export function mergeCourtUpdate(canonical: CaseSnapshot, incoming: CaseSnapshot): CaseSnapshot {
  const issued = canonical.counseling && canonical.people.layla.passed && canonical.people.omar.passed;
  if (!issued || canonical.audit.some((ev) => ev.code === "register")) return canonical;
  const audit = appendAudit(canonical.audit, incoming.audit, (ev) => ev.code === "register");
  if (audit.length === canonical.audit.length) return canonical;
  return { ...canonical, audit, updatedAt: Date.now() };
}
