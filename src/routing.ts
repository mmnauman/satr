import type { AppMode, View } from "./adapters/types";

/**
 * Hash routes, so every screen has a link that can be shared, bookmarked or opened on a
 * second phone. The guided demo lives under #/demo; the live app has its own paths.
 *
 *   #/                 overview
 *   #/me               my screening (live)
 *   #/join/K7M2P9      join a partner's case (live)
 *   #/signin/CODE/TOKEN  an applicant's private link back into their own case
 *   #/staff            staff sign-in (live)
 *   #/demo             how Satr works: the real app with sample couples; become anyone
 *   #/counsellor       genetic counsellor desk (live, signed in)
 *   #/court            court desk (live, signed in)
 *   #/system           health-system view (live, signed in)
 *   #/how              how Satr answers (live)
 *   #/phones, #/phones/counsellor, ...   side-by-side phones with a presenter guide (offline)
 */

export type Route = { appMode: AppMode; view: View; joinCode?: string; signin?: { code: string; token: string } };

const VIEW_SLUG: Partial<Record<View, string>> = {
  counselor: "counsellor",
  court: "court",
  system: "system",
  agent: "how",
};

const SLUG_VIEW: Record<string, View> = {
  counsellor: "counselor",
  counselor: "counselor",
  court: "court",
  system: "system",
  how: "agent",
};

export function routeToHash(appMode: AppMode, view: View): string {
  if (view === "landing") return "#/";
  if (appMode === "prototype") {
    if (view === "stage" || view === "workspace" || view === "staff" || view === "access") return "#/phones";
    return `#/phones/${VIEW_SLUG[view] ?? ""}`;
  }
  if (view === "workspace" || view === "stage") return "#/me";
  if (view === "staff") return "#/staff";
  if (view === "access") return "#/demo";
  return `#/${VIEW_SLUG[view] ?? "me"}`;
}

export function hashToRoute(hash: string): Route | null {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  if (parts.length === 0) return { appMode: "prototype", view: "landing" };
  const [head, second] = parts;
  if (head === "phones") {
    return { appMode: "prototype", view: second ? SLUG_VIEW[second] ?? "stage" : "stage" };
  }
  // The demo is the real application with sample couples (see Access.tsx).
  if (head === "demo") return { appMode: "live", view: "access" };
  if (head === "me") return { appMode: "live", view: "workspace" };
  if (head === "join") {
    const code = (second ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    return { appMode: "live", view: "workspace", joinCode: code || undefined };
  }
  if (head === "signin") {
    const code = (second ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
    const token = (parts[2] ?? "").replace(/[^a-f0-9]/gi, "").slice(0, 80);
    return { appMode: "live", view: "workspace", signin: code && token ? { code, token } : undefined };
  }
  if (head === "staff") return { appMode: "live", view: "staff" };
  if (head === "access") return { appMode: "live", view: "access" };
  if (SLUG_VIEW[head]) return { appMode: "live", view: SLUG_VIEW[head] };
  return null;
}

// Read once at start-up, before anything rewrites the address bar.
const OPENED_WITH_JOIN = typeof window === "undefined" ? null : hashToRoute(window.location.hash)?.joinCode ?? null;

/** The pairing code in a #/join/CODE link, if this page was opened from one. */
export function joinCodeFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return hashToRoute(window.location.hash)?.joinCode ?? OPENED_WITH_JOIN;
}

/** Each applicant's own private link back into their case, on any device. Keep it private. */
export function signInLink(code: string, token: string): string {
  if (typeof window === "undefined") return `#/signin/${code}/${token}`;
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/signin/${code}/${token}`;
}

/** A link the first applicant sends to their partner. */
export function inviteLink(code: string): string {
  if (typeof window === "undefined") return `#/join/${code}`;
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#/join/${code}`;
}
