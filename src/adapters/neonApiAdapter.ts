import type { PersonFile, PersonId } from "../domain/case";
import { localBrowserCaseAdapter } from "./localBrowserAdapter";
import type {
  AdapterKind,
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

type Health = { ok?: boolean; store?: "neon" | "file" | "browser"; demoKey?: boolean };

/**
 * Live Application Adapter:
 * Talks to the Satr server (/api/*). The server keeps cases in Neon Postgres when DATABASE_URL is
 * set, or in a JSON file on its own disk otherwise, and enforces every role and consent rule.
 * Falls back to LocalBrowserCaseAdapter (localStorage + BroadcastChannel) only when no Satr
 * server is reachable, for example on static hosting.
 */
export class NeonApiCaseAdapter implements CaseStoreAdapter {
  private serverKind: AdapterKind | null = null;
  private probePromise: Promise<AdapterKind> | null = null;
  demoKey = false;

  get kind(): AdapterKind {
    return this.serverKind ?? "local";
  }

  private get neonAvailable(): boolean {
    return this.serverKind === "neon" || this.serverKind === "server";
  }

  async checkAvailability(): Promise<AdapterKind> {
    if (this.serverKind !== null) return this.kind;
    if (!this.probePromise) {
      this.probePromise = fetch("/api/health", { method: "GET" })
        .then(async (res): Promise<AdapterKind> => {
          if (!res.ok) return "local";
          const data = (await res.json()) as Health;
          // "browser": the host cannot keep cases (serverless without a database), so keep them here.
          if (!data.ok || data.store === "browser") return "local";
          this.demoKey = Boolean(data.demoKey);
          return data.store === "neon" ? "neon" : "server";
        })
        .catch((): AdapterKind => "local");
    }
    this.serverKind = await this.probePromise;
    return this.kind;
  }

  async signInStaff(role: StaffRole, key: string): Promise<StaffSession> {
    const mode = await this.checkAvailability();
    if (mode === "local") return localBrowserCaseAdapter.signInStaff(role, key);
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, key }),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<StaffSession> & { error?: string };
    if (!res.ok || !data.token || !data.role || !data.name || !data.exp) {
      throw new Error(data.error || "Sign-in failed");
    }
    return { role: data.role, token: data.token, exp: data.exp, name: data.name };
  }

  async resumeSession(pairingCode: string, token: string): Promise<{ session: LiveSessionMeta; snapshot: CaseSnapshot } | null> {
    const mode = await this.checkAvailability();
    if (mode === "local") return localBrowserCaseAdapter.resumeSession(pairingCode, token);
    const code = pairingCode.trim().toUpperCase();
    const res = await fetch(`/api/cases/${encodeURIComponent(code)}?role=participant`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { slot?: PersonId; snapshot?: CaseSnapshot };
    if (!data.slot || !data.snapshot) return null;
    return { session: { pairingCode: code, slot: data.slot, token }, snapshot: data.snapshot };
  }

  async seedDemo(key: string): Promise<SeededCouple[]> {
    const mode = await this.checkAvailability();
    if (mode === "local") return localBrowserCaseAdapter.seedDemo(key);
    const res = await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "seed", key }) });
    const data = (await res.json().catch(() => ({}))) as { couples?: SeededCouple[]; error?: string };
    if (!res.ok || !data.couples) throw new Error(data.error || "Could not load the sample couples");
    return data.couples;
  }

  async resetAll(key: string): Promise<void> {
    const mode = await this.checkAvailability();
    if (mode === "local") return localBrowserCaseAdapter.resetAll(key);
    const res = await fetch("/api/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset", key }) });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || "Could not reset");
    }
  }

  async deleteParticipant(pairingCode: string, token: string): Promise<boolean> {
    const mode = await this.checkAvailability();
    if (mode === "local") return localBrowserCaseAdapter.deleteParticipant(pairingCode, token);
    const res = await fetch(`/api/cases/${encodeURIComponent(pairingCode)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "delete" }),
    });
    return res.ok;
  }

  async createLiveCase(params: {
    nameEn: string;
    nameAr?: string;
    number?: string;
    file?: PersonFile;
  }): Promise<{ session: LiveSessionMeta; snapshot: CaseSnapshot }> {
    const mode = await this.checkAvailability();
    if (mode === "local") return localBrowserCaseAdapter.createLiveCase(params);

    const res = await fetch("/api/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...params }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || "Could not create the case");
    }
    return (await res.json()) as { session: LiveSessionMeta; snapshot: CaseSnapshot };
  }

  async joinLiveCase(params: {
    pairingCode: string;
    nameEn: string;
    nameAr?: string;
    number?: string;
    file?: PersonFile;
  }): Promise<{ session: LiveSessionMeta; snapshot: CaseSnapshot }> {
    const mode = await this.checkAvailability();
    if (mode === "local") return localBrowserCaseAdapter.joinLiveCase(params);

    const code = params.pairingCode.trim().toUpperCase();
    const res = await fetch(`/api/cases/${encodeURIComponent(code)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "join", ...params }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || "Pairing code not found");
    }
    return (await res.json()) as { session: LiveSessionMeta; snapshot: CaseSnapshot };
  }

  async fetchCase(params: {
    pairingCode: string;
    role: ViewerRole;
    token?: string;
  }): Promise<CaseSnapshot | null> {
    const mode = await this.checkAvailability();
    if (mode === "local") return localBrowserCaseAdapter.fetchCase(params);

    const code = params.pairingCode.trim().toUpperCase();
    const res = await fetch(
      `/api/cases/${encodeURIComponent(code)}?role=${encodeURIComponent(params.role)}`,
      {
        headers: params.token ? { Authorization: `Bearer ${params.token}` } : undefined,
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { snapshot?: CaseSnapshot };
    return data.snapshot ?? null;
  }

  async saveSnapshot(params: {
    pairingCode: string;
    role: ViewerRole;
    slot?: PersonId;
    token?: string;
    snapshot: CaseSnapshot;
  }): Promise<CaseSnapshot> {
    const mode = await this.checkAvailability();
    if (mode === "local") return localBrowserCaseAdapter.saveSnapshot(params);

    const code = params.pairingCode.trim().toUpperCase();
    const res = await fetch(`/api/cases/${encodeURIComponent(code)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(params.token ? { Authorization: `Bearer ${params.token}` } : {}),
      },
      body: JSON.stringify({
        action: "save",
        role: params.role,
        slot: params.slot,
        snapshot: params.snapshot,
      }),
    });
    if (!res.ok) return params.snapshot;
    const data = (await res.json()) as { snapshot?: CaseSnapshot };
    return data.snapshot ?? params.snapshot;
  }

  subscribe(pairingCode: string, onUpdate: () => void): () => void {
    if (this.neonAvailable !== true) {
      return localBrowserCaseAdapter.subscribe(pairingCode, onUpdate);
    }
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") onUpdate();
    }, 3500);
    const onVisible = () => {
      if (document.visibilityState === "visible") onUpdate();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }

  async fetchSystemMetrics(staffToken?: string): Promise<SystemAggregateMetrics> {
    const mode = await this.checkAvailability();
    if (mode === "local") return localBrowserCaseAdapter.fetchSystemMetrics(staffToken);

    const res = await fetch("/api/cases?role=system", {
      headers: staffToken ? { Authorization: `Bearer ${staffToken}` } : undefined,
    });
    if (!res.ok) throw new Error("Sign in as a health-system analyst to see these figures.");
    return (await res.json()) as SystemAggregateMetrics;
  }

  async listCourtCases(staffToken?: string): Promise<CourtCaseSummary[]> {
    const mode = await this.checkAvailability();
    if (mode === "local") return localBrowserCaseAdapter.listCourtCases(staffToken);
    const res = await fetch("/api/cases?role=court", {
      headers: staffToken ? { Authorization: `Bearer ${staffToken}` } : undefined,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { cases?: CourtCaseSummary[] };
    return data.cases ?? [];
  }

  async listCounselorCases(staffToken?: string): Promise<CounselorCaseSummary[]> {
    const mode = await this.checkAvailability();
    if (mode === "local") return localBrowserCaseAdapter.listCounselorCases(staffToken);

    const res = await fetch("/api/cases?role=counselor", {
      headers: staffToken ? { Authorization: `Bearer ${staffToken}` } : undefined,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { cases?: CounselorCaseSummary[] };
    return data.cases ?? [];
  }
}

export const neonApiCaseAdapter = new NeonApiCaseAdapter();
