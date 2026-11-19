import { createPersonFile, type PersonFile, type PersonId } from "../domain/case";
import {
  computeSystemMetrics,
  mergeParticipantUpdate,
  counselorMayOpen,
  mergeCounselorUpdate,
  mergeCourtUpdate,
  projectSnapshotForRole,
  removeParticipant,
  summarizeCounselorCase,
  summarizeCourtCase,
} from "../domain/projection";
import { buildSeedCase, DEMO_SEEDS, seedLabel } from "../domain/demoSeed";
import { createBlankPersonRuntime, createDefaultSnapshot } from "./simulationAdapter";
import type {
  CaseSnapshot,
  CaseStoreAdapter,
  CounselorCaseSummary,
  CourtCaseSummary,
  LiveSessionMeta,
  SeededCouple,
  StaffRole,
  StaffSession,
  SystemAggregateMetrics,
  ViewerRole,
} from "./types";

/**
 * Browser-only fallback for when no Satr server is reachable. Everything lives in this browser's
 * storage, so it is a single-device demonstration; the role rules below mirror the server's.
 */
const LOCAL_STAFF_KEY = "satr-demo";
const LOCAL_STAFF_NAMES: Record<StaffRole, { en: string; ar: string }> = {
  counselor: { en: "Dr Aisha, genetic counsellor", ar: "د. عائشة، مستشارة وراثية" },
  court: { en: "Marriage court clerk", ar: "موظف محكمة الزواج" },
  system: { en: "Health-system analyst", ar: "محلل النظام الصحي" },
};

function localStaffRole(token: string | undefined): StaffRole | null {
  const m = /^local-staff\.(counselor|court|system)\.(\d+)$/.exec(token ?? "");
  if (!m || Number(m[2]) < Date.now()) return null;
  return m[1] as StaffRole;
}

type StoredCaseEnvelope = {
  canonical: CaseSnapshot;
  tokenA: string;
  tokenB: string | null;
};

const STORAGE_KEY = "satr:live:cases:v1";
const CHANNEL_NAME = "satr-live-sync";
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePairingCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function readAllCases(): Record<string, StoredCaseEnvelope> {
  if (typeof window === "undefined" || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StoredCaseEnvelope>;
  } catch {
    return {};
  }
}

function writeAllCases(map: Record<string, StoredCaseEnvelope>, updatedCode?: string) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  if (updatedCode && "BroadcastChannel" in window) {
    try {
      const ch = new BroadcastChannel(CHANNEL_NAME);
      ch.postMessage({ pairingCode: updatedCode, at: Date.now() });
      ch.close();
    } catch {
      // Ignore BroadcastChannel errors in restricted contexts
    }
  }
}

export class LocalBrowserCaseAdapter implements CaseStoreAdapter {
  readonly kind = "local" as const;

  async createLiveCase(params: {
    nameEn: string;
    nameAr?: string;
    number?: string;
    file?: PersonFile;
  }): Promise<{ session: LiveSessionMeta; snapshot: CaseSnapshot }> {
    const all = readAllCases();
    let code = generatePairingCode();
    while (all[code]) code = generatePairingCode();
    const tokenA = generateToken();

    const fileA =
      params.file ??
      createPersonFile({
        id: "layla",
        nameEn: params.nameEn,
        nameAr: params.nameAr,
        number: params.number || `AD-${Math.floor(10000 + Math.random() * 89999)}`,
        joined: true,
        reportSource: "Live screening report",
        findings: [],
      });

    const waitingPartner = createPersonFile({
      id: "omar",
      nameEn: "Partner",
      nameAr: "الشريك",
      number: "Pending",
      joined: false,
      reportSource: "Waiting to join",
      findings: [],
    });

    const canonical: CaseSnapshot = {
      ...createDefaultSnapshot(),
      pairingCode: code,
      presetId: "custom",
      files: {
        layla: fileA,
        omar: waitingPartner,
      },
      people: {
        layla: createBlankPersonRuntime(),
        omar: createBlankPersonRuntime(),
      },
      audit: [{ code: "join", id: "layla", at: Date.now() }],
      updatedAt: Date.now(),
    };

    all[code] = { canonical, tokenA, tokenB: null };
    writeAllCases(all, code);

    return {
      session: { pairingCode: code, slot: "layla", token: tokenA },
      snapshot: projectSnapshotForRole(canonical, { role: "participant", slot: "layla" }),
    };
  }

  async joinLiveCase(params: {
    pairingCode: string;
    nameEn: string;
    nameAr?: string;
    number?: string;
    file?: PersonFile;
  }): Promise<{ session: LiveSessionMeta; snapshot: CaseSnapshot }> {
    const code = params.pairingCode.trim().toUpperCase();
    const all = readAllCases();
    const entry = all[code];
    if (!entry) {
      throw new Error("Pairing code not found");
    }
    const tokenB = entry.tokenB ?? generateToken();
    const fileB =
      params.file ??
      createPersonFile({
        id: "omar",
        nameEn: params.nameEn,
        nameAr: params.nameAr,
        number:
          params.number ||
          (entry.canonical.files.omar.joined
            ? entry.canonical.files.omar.number
            : `AD-${Math.floor(10000 + Math.random() * 89999)}`),
        joined: true,
        reportSource: "Live screening report",
        findings: entry.canonical.files.omar.joined ? entry.canonical.files.omar.findings : [],
      });

    entry.tokenB = tokenB;
    entry.canonical = {
      ...entry.canonical,
      files: {
        ...entry.canonical.files,
        omar: fileB,
      },
      audit: [...entry.canonical.audit, { code: "join", id: "omar", at: Date.now() }],
      updatedAt: Date.now(),
    };
    writeAllCases(all, code);

    return {
      session: { pairingCode: code, slot: "omar", token: tokenB },
      snapshot: projectSnapshotForRole(entry.canonical, { role: "participant", slot: "omar" }),
    };
  }

  async fetchCase(params: {
    pairingCode: string;
    role: ViewerRole;
    token?: string;
  }): Promise<CaseSnapshot | null> {
    const code = params.pairingCode.trim().toUpperCase();
    const entry = readAllCases()[code];
    if (!entry) return null;

    if (params.role === "participant") {
      const slot: PersonId | null =
        params.token === entry.tokenA ? "layla" : params.token === entry.tokenB ? "omar" : null;
      if (!slot) return null;
      return projectSnapshotForRole(entry.canonical, { role: "participant", slot });
    }
    // Same staff rules as the server: a valid staff token for that role, and counsellors only once booked.
    if (localStaffRole(params.token) !== params.role) return null;
    if (params.role === "counselor" && !counselorMayOpen(entry.canonical)) return null;
    return projectSnapshotForRole(entry.canonical, { role: params.role });
  }

  async seedDemo(key: string): Promise<SeededCouple[]> {
    if (key.trim() !== LOCAL_STAFF_KEY) throw new Error("That access key is not right.");
    const all = readAllCases();
    const couples: SeededCouple[] = [];
    for (const spec of DEMO_SEEDS) {
      const code = generatePairingCode();
      const canonical = buildSeedCase(spec, code);
      const tokenA = generateToken();
      const tokenB = generateToken();
      all[code] = { canonical, tokenA, tokenB };
      couples.push({
        code,
        stage: spec.stage,
        label: seedLabel(spec),
        people: { layla: { name: canonical.files.layla.name, token: tokenA }, omar: { name: canonical.files.omar.name, token: tokenB } },
      });
    }
    writeAllCases(all);
    return couples;
  }

  async resetAll(key: string): Promise<void> {
    if (key.trim() !== LOCAL_STAFF_KEY) throw new Error("That access key is not right.");
    writeAllCases({});
  }

  async deleteParticipant(pairingCode: string, token: string): Promise<boolean> {
    const code = pairingCode.trim().toUpperCase();
    const all = readAllCases();
    const entry = all[code];
    if (!entry) return false;
    const slot: PersonId | null = token === entry.tokenA ? "layla" : token === entry.tokenB ? "omar" : null;
    if (!slot) return false;
    entry.canonical = removeParticipant(entry.canonical, slot, createBlankPersonRuntime());
    writeAllCases(all, code);
    return true;
  }

  async resumeSession(pairingCode: string, token: string): Promise<{ session: LiveSessionMeta; snapshot: CaseSnapshot } | null> {
    const code = pairingCode.trim().toUpperCase();
    const entry = readAllCases()[code];
    if (!entry) return null;
    const slot: PersonId | null = token === entry.tokenA ? "layla" : token === entry.tokenB ? "omar" : null;
    if (!slot) return null;
    return { session: { pairingCode: code, slot, token }, snapshot: projectSnapshotForRole(entry.canonical, { role: "participant", slot }) };
  }

  async signInStaff(role: StaffRole, key: string): Promise<StaffSession> {
    if (key.trim() !== LOCAL_STAFF_KEY) throw new Error("That access key is not right.");
    const exp = Date.now() + 12 * 60 * 60 * 1000;
    return { role, exp, token: `local-staff.${role}.${exp}`, name: LOCAL_STAFF_NAMES[role] };
  }

  async saveSnapshot(params: {
    pairingCode: string;
    role: ViewerRole;
    slot?: PersonId;
    token?: string;
    snapshot: CaseSnapshot;
  }): Promise<CaseSnapshot> {
    const code = params.pairingCode.trim().toUpperCase();
    const all = readAllCases();
    const entry = all[code];
    if (!entry) return params.snapshot;

    if (params.role === "court") {
      if (localStaffRole(params.token) !== "court") return params.snapshot;
      entry.canonical = mergeCourtUpdate(entry.canonical, params.snapshot);
      writeAllCases(all, code);
      return projectSnapshotForRole(entry.canonical, { role: "court" });
    }
    if (params.role === "counselor") {
      if (localStaffRole(params.token) !== "counselor" || !counselorMayOpen(entry.canonical)) return params.snapshot;
      entry.canonical = mergeCounselorUpdate(entry.canonical, params.snapshot);
      writeAllCases(all, code);
      return projectSnapshotForRole(entry.canonical, { role: "counselor" });
    }
    if (params.role !== "participant") return params.snapshot;

    const slot: PersonId | null =
      params.token === entry.tokenA ? "layla" : params.token === entry.tokenB ? "omar" : null;
    if (!slot) return params.snapshot;

    entry.canonical = mergeParticipantUpdate(entry.canonical, slot, params.snapshot);
    writeAllCases(all, code);
    return projectSnapshotForRole(entry.canonical, { role: "participant", slot });
  }

  subscribe(pairingCode: string, onUpdate: () => void): () => void {
    const code = pairingCode.trim().toUpperCase();
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === STORAGE_KEY) onUpdate();
    };
    window.addEventListener("storage", onStorage);

    let ch: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      try {
        ch = new BroadcastChannel(CHANNEL_NAME);
        ch.onmessage = (ev: MessageEvent<{ pairingCode?: string }>) => {
          if (!ev.data?.pairingCode || ev.data.pairingCode === code) onUpdate();
        };
      } catch {
        ch = null;
      }
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      ch?.close();
    };
  }

  async fetchSystemMetrics(staffToken?: string): Promise<SystemAggregateMetrics> {
    if (localStaffRole(staffToken) !== "system") throw new Error("Sign in as a health-system analyst to see these figures.");
    const all = Object.values(readAllCases()).map((e) => e.canonical);
    return computeSystemMetrics(all, "local");
  }

  async listCourtCases(staffToken?: string): Promise<CourtCaseSummary[]> {
    if (localStaffRole(staffToken) !== "court") return [];
    return Object.values(readAllCases())
      .map((e) => e.canonical)
      .filter((c) => c.files.layla.joined && c.files.omar.joined)
      .map(summarizeCourtCase)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async listCounselorCases(staffToken?: string): Promise<CounselorCaseSummary[]> {
    if (localStaffRole(staffToken) !== "counselor") return [];
    return Object.values(readAllCases())
      .map((e) => e.canonical)
      .filter(counselorMayOpen)
      .map((c) => summarizeCounselorCase(projectSnapshotForRole(c, { role: "counselor" })))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }
}

export const localBrowserCaseAdapter = new LocalBrowserCaseAdapter();
