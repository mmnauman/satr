import type { Lang } from "./strings";
import { intersectionGenes, inviteText, partnerOf, PEOPLE, reply, withheldCount, type PersonId } from "./content";
import { ALL_GENE_TOKENS, interpret, leakedTokens, type Intent } from "./logic";

/**
 * The assistant never writes free text about genes. It picks tools, each tool returns only what
 * this person may know right now, and the answer is built from those returns in approved wording.
 */
export type ToolName =
  | "read_own_file"
  | "read_couple_compile"
  | "state_chance"
  | "list_paths"
  | "draft_invite"
  | "refuse_decision"
  | "hand_to_physician";

export type AgentTurn = {
  q: string;
  intent: Intent;
  opened: boolean;
  compiled: boolean;
  steps: ToolName[];
};

export const TOOL_LABEL: Record<ToolName, Record<Lang, string>> = {
  read_own_file: { en: "Looked at your own results", ar: "اطّلع على نتائجك أنت" },
  read_couple_compile: { en: "Checked your shared result", ar: "تحقق من نتيجتكما المشتركة" },
  state_chance: { en: "Worked out the chance", ar: "حسب الاحتمال" },
  list_paths: { en: "Listed the options", ar: "عدّد الخيارات" },
  draft_invite: { en: "Wrote an invitation", ar: "كتب دعوة" },
  refuse_decision: { en: "Left the decision with you", ar: "ترك القرار لك" },
  hand_to_physician: { en: "Passed it to a counsellor", ar: "أحاله إلى المستشار" },
};

export function plan(intent: Intent): ToolName[] {
  switch (intent) {
    case "carrier":
      return ["read_own_file"];
    case "sees":
      return ["read_couple_compile"];
    case "risk":
      return ["read_couple_compile", "state_chance"];
    case "options":
      return ["list_paths"];
    case "invite":
      return ["draft_invite"];
    case "refuse-marry":
    case "refuse-direct":
      return ["refuse_decision"];
    default:
      return ["hand_to_physician"];
  }
}

function ownGenes(id: PersonId): string[] {
  return PEOPLE[id].findings.map((finding) => finding.gene);
}

function geneList(genes: string[], lang: Lang): string {
  if (genes.length < 2) return genes[0] ?? "";
  if (lang === "ar") return genes.join(" و");
  return `${genes.slice(0, -1).join(", ")} and ${genes[genes.length - 1]}`;
}

function observation(id: PersonId, tool: ToolName, turn: AgentTurn, lang: Lang): string {
  const genes = geneList(ownGenes(id), lang);
  const shared = geneList(intersectionGenes(), lang);
  const kept = withheldCount(id);
  const partner = partnerOf(id).name[lang];
  if (lang === "ar") {
    switch (tool) {
      case "read_own_file":
        return turn.opened ? `وجد ${genes} في نتائجك. لم يطّلع على نتائج ${partner}.` : "نتيجتك ما زالت مختومة، فلم يقرأ أي اسم جين.";
      case "read_couple_compile":
        return turn.compiled
          ? `النتيجة المشتركة تحوي ${shared} فقط. بقيت ${kept} نتيجة لك خارجها.`
          : "لا توجد نتيجة مشتركة بعد، لأنكما لم توافقا معاً.";
      case "state_chance":
        return turn.compiled
          ? `استخدم الأرقام المعتمدة لـ ${shared} فقط: 1 من 4، و1 من 2، و1 من 4.`
          : "لم يعطِ رقماً خاصاً بكما، بل شرح النمط العام فقط.";
      case "list_paths":
        return "ذكر ثلاثة مسارات مرخصة دون ترتيبها أو التوصية بأي منها.";
      case "draft_invite":
        return "كتب الرسالة وتأكد أنها لا تذكر جيناً ولا حالة ولا شخصاً. لم يرسلها.";
      case "refuse_decision":
        return "لم يقل نعم ولا لا. أضاف السؤال إلى ملاحظات جلسة الإرشاد.";
      default:
        return "لا يملك إجابة معتمدة، فأضاف السؤال إلى ملاحظات المستشار.";
    }
  }
  switch (tool) {
    case "read_own_file":
      return turn.opened
        ? `Found ${genes} in your results. ${partner}’s results were not looked at.`
        : "Your result is still sealed, so no gene names were read.";
    case "read_couple_compile":
      return turn.compiled
        ? `Your shared result contains ${shared} only. ${kept} of your results stayed out of it.`
        : "There is no shared result yet, because you haven’t both agreed.";
    case "state_chance":
      return turn.compiled
        ? `Used the approved figures for ${shared} only: 1 in 4, 1 in 2, 1 in 4.`
        : "Gave no figure for you as a couple, only the general pattern.";
    case "list_paths":
      return "Named three licensed options without ranking or recommending any.";
    case "draft_invite":
      return "Wrote the note and checked it names no gene, condition, or person. Didn’t send it.";
    case "refuse_decision":
      return "Said neither yes nor no. Added the question to your counselling notes.";
    default:
      return "Had no approved answer, so added the question to your counsellor’s notes.";
  }
}

function speech(id: PersonId, turn: AgentTurn, lang: Lang): string {
  const partner = partnerOf(id).name[lang];
  const genes = geneList(ownGenes(id), lang);
  const shared = geneList(intersectionGenes(), lang);
  if (turn.intent === "carrier") {
    if (!turn.opened) {
      return lang === "ar"
        ? "نتيجتك ما زالت مختومة، لذلك لا أستطيع أن أخبرك بما تحمله. افتحها أولاً ثم اسألني مجدداً. وبشكل عام، الحامل شخص سليم لديه تغيير في نسخة واحدة من جين، ولا يعني ذلك أنه مصاب."
        : "Your result is still sealed, so I can’t tell you what you carry yet. Open it first, then ask me again. In general, a carrier is a healthy person with a change in one copy of a gene. It doesn’t mean they’re ill.";
    }
    return lang === "ar"
      ? `في نتائجك أنت، تحمل تغييرات في ${genes}. هذا يعني أنك حامل وبصحة جيدة، وليس تشخيصاً لك ولا لأي طفل. لم أطّلع على نتائج ${partner}، فهي ليست من حقي ولا من حقك.`
      : `In your own results, you carry changes in ${genes}. That makes you a carrier, and you’re healthy. It isn’t a diagnosis for you or for any child. I haven’t looked at ${partner}’s results; they’re private to them.`;
  }
  if (turn.intent === "sees") {
    if (!turn.compiled) {
      return lang === "ar"
        ? "حتى الآن لا يرى شريكك أي شيء من نتائجك، لأنكما لم توافقا معاً على المشاركة. وعندما توافقان، لن يرى إلا جيناً تحملانه كلاكما."
        : "Right now your partner can’t see anything from your results, because you haven’t both agreed to share. When you do, they’ll only see a gene you both carry.";
    }
    return lang === "ar"
      ? `نتيجتكما المشتركة تحوي ${shared} فقط، أي الجين الذي تحملانه معاً. نتيجتك الأخرى بقيت خاصة بك، ولا أعرف ما في نتائج ${partner} الأخرى.`
      : `Your shared result contains only ${shared}, the gene you both carry. Your other result stayed private, and I don’t know what else is in ${partner}’s results either.`;
  }
  if (turn.intent === "risk") {
    if (!turn.compiled) {
      return lang === "ar"
        ? "لم توافقا معاً على المشاركة بعد، لذلك لا أستطيع أن أقول إن كان هناك جين مشترك بينكما. بشكل عام، عندما يحمل الأبوان التغيير نفسه، يكون في كل حمل احتمال بنحو 1 من 4 أن يصاب الطفل، و1 من 2 أن يكون حاملاً سليماً، و1 من 4 ألا يرث شيئاً."
        : "You haven’t both agreed to share yet, so I can’t say whether you have a gene in common. In general, when two parents carry the same change, each pregnancy has about a 1 in 4 chance of the child being affected, a 1 in 2 chance of a healthy carrier, and a 1 in 4 chance of neither.";
    }
    return lang === "ar"
      ? `تحملان معاً تغييراً في ${shared}. في كل حمل احتمال بنحو 1 من 4 أن يرث الطفل التغيير منكما ويصاب، ونحو 1 من 2 أن يكون حاملاً سليماً مثلكما، ونحو 1 من 4 ألا يرث أي تغيير. هذا احتمال وليس تشخيصاً، ولا يحسم أمر زواجكما.`
      : `You both carry a change in ${shared}. In each pregnancy there’s about a 1 in 4 chance the baby inherits it from both of you and is affected, about a 1 in 2 chance of a healthy carrier like you, and about a 1 in 4 chance of neither. It’s a chance, not a diagnosis, and it doesn’t decide your marriage.`;
  }
  if (turn.intent === "invite") {
    return lang === "ar"
      ? `${reply("invite", turn.compiled, lang)} هذه مسودة: «${inviteText(lang)}» يمكنك إرسالها من صفحة العائلة.`
      : `${reply("invite", turn.compiled, lang)} Here’s a draft: “${inviteText(lang)}” You can send it from the Family page.`;
  }
  return reply(turn.intent, turn.compiled, lang);
}

export type TurnView = {
  steps: { tool: ToolName; label: string; observation: string }[];
  speech: string;
  handed: boolean;
};

export function renderTurn(id: PersonId, turn: AgentTurn, lang: Lang): TurnView {
  return {
    steps: turn.steps.map((tool) => ({ tool, label: TOOL_LABEL[tool][lang], observation: observation(id, tool, turn, lang) })),
    speech: speech(id, turn, lang),
    handed: turn.steps.includes("refuse_decision") || turn.steps.includes("hand_to_physician"),
  };
}

export function allowedGeneTokens(id: PersonId, turn: AgentTurn): string[] {
  if (turn.opened && turn.intent === "carrier") return ownGenes(id);
  if (turn.compiled && (turn.intent === "sees" || turn.intent === "risk")) return intersectionGenes();
  return [];
}

export function unexpectedTokens(id: PersonId, turn: AgentTurn, lang: Lang): string[] {
  const view = renderTurn(id, turn, lang);
  const text = `${view.steps.map((step) => step.observation).join(" ")} ${view.speech}`;
  const allow = new Set(allowedGeneTokens(id, turn).map((token) => token.toLowerCase()));
  return leakedTokens(text, ALL_GENE_TOKENS.filter((token) => !allow.has(token.toLowerCase())));
}

export function runAgentChecks(): string[] {
  const bad: string[] = [];
  const intents: Intent[] = ["carrier", "sees", "risk", "options", "invite", "refuse-marry", "refuse-direct", "escalate"];
  const expectPlan: Record<Intent, ToolName[]> = {
    carrier: ["read_own_file"],
    sees: ["read_couple_compile"],
    risk: ["read_couple_compile", "state_chance"],
    options: ["list_paths"],
    invite: ["draft_invite"],
    "refuse-marry": ["refuse_decision"],
    "refuse-direct": ["refuse_decision"],
    escalate: ["hand_to_physician"],
  };
  for (const intent of intents) {
    const steps = plan(intent);
    if (steps.join() !== expectPlan[intent].join()) bad.push(`plan ${intent}: ${steps.join()}`);
  }
  if (interpret("Should we get married?") !== "refuse-marry") bad.push("marry still classified");
  for (const id of ["layla", "omar"] as const) {
    const partnerPrivate = id === "layla" ? "MEFV" : "GJB2";
    for (const opened of [false, true]) {
      for (const compiled of [false, true]) {
        for (const intent of intents) {
          const turn: AgentTurn = { q: intent, intent, opened, compiled, steps: plan(intent) };
          for (const lang of ["en", "ar"] as const) {
            const leaks = unexpectedTokens(id, turn, lang);
            if (leaks.length) bad.push(`${id} ${intent} open=${opened} compiled=${compiled} ${lang}: ${leaks.join(",")}`);
            const view = renderTurn(id, turn, lang);
            const blob = `${view.speech} ${view.steps.map((step) => step.observation).join(" ")}`;
            if (blob.toLowerCase().includes(partnerPrivate.toLowerCase())) bad.push(`${id} saw ${partnerPrivate} on ${intent}`);
            if (compiled && (intent === "sees" || intent === "risk") && !blob.includes("USH2A")) {
              bad.push(`${id} ${intent} ${lang} omitted USH2A`);
            }
            if (!opened && intent === "carrier" && /USH2A|GJB2|MEFV/.test(blob)) bad.push(`${id} closed file named a gene ${lang}`);
            if (opened && intent === "carrier") {
              for (const gene of ownGenes(id)) if (!blob.includes(gene)) bad.push(`${id} carrier missed ${gene} ${lang}`);
            }
          }
        }
      }
    }
  }
  return bad;
}
