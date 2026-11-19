import { createBlankPersonRuntime, createDefaultSnapshot } from "../adapters/simulationAdapter.js";
import type { AuditEvent, CaseSnapshot, PersonRuntime } from "../adapters/types.js";
import { passingSample } from "../content.js";
import { getPresetById, type CasePresetId, type PersonId } from "./case.js";

/**
 * Sample couples for the demo access page, each stopped at a different point on the route,
 * so a reviewer can open any role and find real records waiting. All people are fictional.
 */

export type SeedStage = "fresh" | "agreed" | "booked" | "counselled" | "referred";

export type SeedSpec = { presetId: CasePresetId; stage: SeedStage; fullShare?: PersonId[]; interests?: ("opt2" | "opt3")[] };

export const DEMO_SEEDS: SeedSpec[] = [
  { presetId: "cousin-ush2a", stage: "fresh" },
  { presetId: "thalassemia-hbb", stage: "booked", fullShare: ["layla"], interests: ["opt2"] },
  { presetId: "tier2-vus", stage: "referred", fullShare: ["layla", "omar"], interests: ["opt3"] },
  { presetId: "clear-panel", stage: "counselled" },
  { presetId: "xlinked-g6pd", stage: "agreed" },
];

const DAY = 24 * 60 * 60 * 1000;

function explained(id: PersonId, snap: CaseSnapshot, firstTry: boolean[]): PersonRuntime {
  const answers = [0, 1, 2].map((step) => passingSample(id, step as 0 | 1 | 2, "en", snap.files)) as [string, string, string];
  return { ...snap.people[id], opened: true, consented: true, passed: true, step: 2, answers, firstTry, explainLang: id === "layla" ? "ar" : "en", explainSimple: id === "omar" };
}

/** Builds one seeded case. `now` is passed in so the timeline reads as days of real use. */
export function buildSeedCase(spec: SeedSpec, code: string, now = Date.now()): CaseSnapshot {
  const preset = getPresetById(spec.presetId);
  const base: CaseSnapshot = {
    ...createDefaultSnapshot(),
    pairingCode: code,
    presetId: spec.presetId,
    files: structuredClone(preset.files),
    people: { layla: createBlankPersonRuntime(), omar: createBlankPersonRuntime() },
  };
  const start = now - 9 * DAY;
  const audit: AuditEvent[] = [
    { code: "join", id: "layla", at: start },
    { code: "join", id: "omar", at: start + 2 * 60 * 60 * 1000 },
  ];
  if (spec.stage === "fresh") return { ...base, audit, updatedAt: start };

  audit.push(
    { code: "open", id: "layla", at: start + DAY },
    { code: "open", id: "omar", at: start + DAY + 3600_000 },
    { code: "consent", id: "layla", at: start + 2 * DAY },
    { code: "consent", id: "omar", at: start + 2 * DAY + 600_000 },
    { code: "compiled", at: start + 2 * DAY + 600_001 },
  );
  let snap: CaseSnapshot = { ...base };
  snap.people = {
    layla: explained("layla", snap, [true, true, true]),
    omar: explained("omar", snap, [true, false, true]),
  };
  audit.push(
    { code: "fail", id: "omar", at: start + 3 * DAY },
    { code: "passed", id: "layla", at: start + 3 * DAY + 600_000 },
    { code: "passed", id: "omar", at: start + 3 * DAY + 1200_000 },
  );
  for (const id of spec.fullShare ?? []) {
    snap.people[id] = { ...snap.people[id], counselorFull: true };
    audit.push({ code: "share", id, detail: "on", at: start + 4 * DAY });
  }
  for (const interest of spec.interests ?? []) {
    snap.people.layla = { ...snap.people.layla, interests: [...snap.people.layla.interests, interest] };
    audit.push({ code: "interest", id: "layla", detail: interest, at: start + 4 * DAY + 60_000 });
  }
  if (spec.stage === "agreed") return { ...snap, audit, updatedAt: start + 4 * DAY };

  snap = { ...snap, booking: "slot2" };
  audit.push({ code: "book", id: "layla", detail: "slot2", at: start + 4 * DAY + 3600_000 });
  if (spec.stage === "booked") return { ...snap, audit, updatedAt: start + 4 * DAY + 3600_000 };

  if (spec.stage === "referred") {
    audit.push({ code: "refer", at: start + 6 * DAY });
    return { ...snap, referred: true, audit, updatedAt: start + 6 * DAY };
  }

  audit.push({ code: "counsel", at: start + 6 * DAY }, { code: "note", at: start + 6 * DAY + 600_000 });
  return {
    ...snap,
    counseling: true,
    pathway: {
      confirmatory: "none",
      reproductive: "none",
      note: "You share no disease-causing change on this panel. We talked about what screening can and cannot rule out, and you know you can come back with any question.",
    },
    audit,
    updatedAt: start + 6 * DAY,
  };
}

export function seedLabel(spec: SeedSpec): { en: string; ar: string } {
  const label = getPresetById(spec.presetId).label;
  return label;
}
