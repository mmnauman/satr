import { createDefaultLaylaOmarFiles, createPersonFile, type PersonFile } from "../domain/case";
import { computeSystemMetrics, summarizeCounselorCase } from "../domain/projection";
import type {
  CaseSnapshot,
  CaseStoreAdapter,
  CounselorCaseSummary,
  LiveSessionMeta,
  PersonRuntime,
  SystemAggregateMetrics,
} from "./types";

export function createBlankPersonRuntime(counselorFull = false): PersonRuntime {
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
    counselorFull,
  };
}

export function createDefaultSnapshot(): CaseSnapshot {
  return {
    pairingCode: null,
    presetId: "cousin-ush2a",
    files: createDefaultLaylaOmarFiles(),
    people: {
      layla: createBlankPersonRuntime(true),
      omar: createBlankPersonRuntime(true),
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

export class SimulationCaseAdapter implements CaseStoreAdapter {
  readonly kind = "simulation" as const;
  private current: CaseSnapshot = createDefaultSnapshot();

  async createLiveCase(params: {
    nameEn: string;
    nameAr?: string;
    number?: string;
    file?: PersonFile;
  }): Promise<{ session: LiveSessionMeta; snapshot: CaseSnapshot }> {
    const fileA =
      params.file ??
      createPersonFile({
        id: "layla",
        nameEn: params.nameEn,
        nameAr: params.nameAr,
        number: params.number ?? "AD-30101",
        findings: [],
      });
    this.current = {
      ...createDefaultSnapshot(),
      pairingCode: "SIM-DEMO",
      presetId: "custom",
      files: {
        ...this.current.files,
        layla: fileA,
      },
    };
    return {
      session: { pairingCode: "SIM-DEMO", slot: "layla", token: "sim-a" },
      snapshot: structuredClone(this.current),
    };
  }

  async joinLiveCase(params: {
    pairingCode: string;
    nameEn: string;
    nameAr?: string;
    number?: string;
    file?: PersonFile;
  }): Promise<{ session: LiveSessionMeta; snapshot: CaseSnapshot }> {
    const fileB =
      params.file ??
      createPersonFile({
        id: "omar",
        nameEn: params.nameEn,
        nameAr: params.nameAr,
        number: params.number ?? "AD-30102",
        findings: [],
      });
    this.current = {
      ...this.current,
      files: {
        ...this.current.files,
        omar: fileB,
      },
    };
    return {
      session: { pairingCode: params.pairingCode, slot: "omar", token: "sim-b" },
      snapshot: structuredClone(this.current),
    };
  }

  async fetchCase(): Promise<CaseSnapshot | null> {
    return structuredClone(this.current);
  }

  async saveSnapshot(params: { snapshot: CaseSnapshot }): Promise<CaseSnapshot> {
    this.current = structuredClone(params.snapshot);
    return structuredClone(this.current);
  }

  async fetchSystemMetrics(): Promise<SystemAggregateMetrics> {
    return computeSystemMetrics([this.current], "simulation");
  }

  async listCounselorCases(): Promise<CounselorCaseSummary[]> {
    return [summarizeCounselorCase(this.current)];
  }
}

export const simulationCaseAdapter = new SimulationCaseAdapter();
