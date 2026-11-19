import type { CaseFiles, Lang, PersonId } from "../content";
import { interpret } from "../logic";
import { plan, renderTurn, validateCandidateSpeech, type AgentTurn } from "../loop";

export type AskRequest = {
  personId: PersonId;
  question: string;
  opened: boolean;
  compiled: boolean;
  files: CaseFiles;
  lang: Lang;
};

export interface AskEngineAdapter {
  readonly kind: "deterministic" | "hybrid-remote";
  answer(req: AskRequest): Promise<AgentTurn>;
  answerSync(req: AskRequest): AgentTurn;
}

function buildBaseTurn(req: AskRequest): AgentTurn {
  const caseGenes = [...req.files.layla.findings, ...req.files.omar.findings].map((f) => f.gene);
  const intent = interpret(req.question, caseGenes);
  const steps = plan(intent);
  return {
    q: req.question.trim(),
    intent,
    opened: req.opened,
    compiled: req.compiled,
    steps,
  };
}

export class DeterministicCatalogAskAdapter implements AskEngineAdapter {
  readonly kind = "deterministic" as const;

  answerSync(req: AskRequest): AgentTurn {
    return buildBaseTurn(req);
  }

  async answer(req: AskRequest): Promise<AgentTurn> {
    return buildBaseTurn(req);
  }
}

/**
 * Hybrid Ask Engine:
 * 1. Immediately computes the deterministic, consent-scoped turn from approved catalog rules.
 * 2. Optionally calls /api/ask with ONLY the already-redacted observations for this viewer
 *    when remote synthesis is enabled on the deployment, then runs validateCandidateSpeech()
 *    to guarantee zero forbidden gene tokens and zero marriage/clinical directives.
 */
export class HybridGroundedAskAdapter implements AskEngineAdapter {
  readonly kind = "hybrid-remote" as const;
  private remoteAvailable: boolean | null = null;

  answerSync(req: AskRequest): AgentTurn {
    return buildBaseTurn(req);
  }

  async answer(req: AskRequest): Promise<AgentTurn> {
    const base = buildBaseTurn(req);
    // Refusal and escalation boundaries always stay strictly deterministic
    if (
      base.intent === "refuse-marry" ||
      base.intent === "refuse-direct" ||
      base.intent === "partner-probe" ||
      this.remoteAvailable === false
    ) {
      return base;
    }

    try {
      const enView = renderTurn(req.personId, base, "en", req.files);
      const arView = renderTurn(req.personId, base, "ar", req.files);
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: base.q,
          intent: base.intent,
          lang: req.lang,
          permittedObservationsEn: enView.steps.map((s) => `${s.label}: ${s.observation}`),
          permittedObservationsAr: arView.steps.map((s) => `${s.label}: ${s.observation}`),
          baselineEn: enView.speech,
          baselineAr: arView.speech,
        }),
      });
      if (!res.ok) {
        if (res.status === 404 || res.status === 501) this.remoteAvailable = false;
        return base;
      }
      const payload = (await res.json()) as { enabled?: boolean; speechEn?: string; speechAr?: string };
      if (!payload.enabled) {
        this.remoteAvailable = false;
        return base;
      }
      this.remoteAvailable = true;
      const customSpeech: Partial<Record<Lang, string>> = {};
      if (payload.speechEn && validateCandidateSpeech(req.personId, base, payload.speechEn, req.files)) {
        customSpeech.en = payload.speechEn;
      }
      if (payload.speechAr && validateCandidateSpeech(req.personId, base, payload.speechAr, req.files)) {
        customSpeech.ar = payload.speechAr;
      }
      if (Object.keys(customSpeech).length === 0) return base;
      return { ...base, customSpeech };
    } catch {
      this.remoteAvailable = false;
      return base;
    }
  }
}

export const defaultAskAdapter: AskEngineAdapter = new HybridGroundedAskAdapter();
