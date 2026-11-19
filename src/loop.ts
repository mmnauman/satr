import {
  PEOPLE,
  intersectionGenes,
  inviteText,
  partnerOf,
  reply,
  withheldCount,
  type CaseFiles,
  type Lang,
  type PersonId,
} from "./content";
import { forbiddenTokensForPatient } from "./domain/case";
import { findMentionedGeneInText, GENE_CATALOG } from "./domain/genes";
import { interpret, leakedTokens, MARRY_BAN, type Intent } from "./logic";

/**
 * The assistant plans permissioned tool calls first, each tool sees only what this viewer
 * is permitted to know right now, and every reply is checked against forbidden gene tokens.
 */
export type ToolName =
  | "read_own_file"
  | "read_couple_compile"
  | "lookup_gene_info"
  | "state_chance"
  | "list_paths"
  | "check_pathway_status"
  | "draft_invite"
  | "refuse_decision"
  | "hand_to_physician";

export type AgentTurn = {
  q: string;
  intent: Intent;
  opened: boolean;
  compiled: boolean;
  steps: ToolName[];
  customSpeech?: Partial<Record<Lang, string>>;
};

export const TOOL_LABEL: Record<ToolName, Record<Lang, string>> = {
  read_own_file: { en: "Looked at your own results", ar: "اطّلع على نتائجك أنت" },
  read_couple_compile: { en: "Checked your shared result", ar: "تحقق من نتيجتكما المشتركة" },
  lookup_gene_info: { en: "Checked approved gene guide", ar: "راجع الدليل الجيني المعتمد" },
  state_chance: { en: "Worked out the chance", ar: "حسب الاحتمال" },
  list_paths: { en: "Listed the options", ar: "عدّد الخيارات" },
  check_pathway_status: { en: "Checked your counselling step", ar: "تحقق من خطوة الإرشاد" },
  draft_invite: { en: "Wrote an invitation", ar: "كتب دعوة" },
  refuse_decision: { en: "Left the decision with you", ar: "ترك القرار لك" },
  hand_to_physician: { en: "Passed it to a counsellor", ar: "أحاله إلى المستشار" },
};

export function plan(intent: Intent): ToolName[] {
  switch (intent) {
    case "carrier":
      return ["read_own_file"];
    case "gene-detail":
      return ["read_own_file", "read_couple_compile", "lookup_gene_info"];
    case "partner-probe":
      return ["read_couple_compile"];
    case "sees":
      return ["read_couple_compile"];
    case "court":
      return ["check_pathway_status"];
    case "consanguinity":
      return ["lookup_gene_info"];
    case "risk":
      return ["read_couple_compile", "state_chance"];
    case "vus":
      return ["read_own_file", "hand_to_physician"];
    case "options":
      return ["list_paths"];
    case "booking":
      return ["check_pathway_status"];
    case "invite":
      return ["draft_invite"];
    case "refuse-marry":
    case "refuse-direct":
      return ["refuse_decision"];
    case "distress":
    case "escalate":
    default:
      return ["hand_to_physician"];
  }
}

function ownGenes(id: PersonId, files: CaseFiles = PEOPLE): string[] {
  return files[id].findings.map((finding) => finding.gene);
}

export function geneList(genes: string[], lang: Lang): string {
  if (genes.length === 0) return "";
  if (genes.length < 2) return genes[0] ?? "";
  if (lang === "ar") return genes.join(" و");
  return `${genes.slice(0, -1).join(", ")} and ${genes[genes.length - 1]}`;
}

function observation(id: PersonId, tool: ToolName, turn: AgentTurn, lang: Lang, files: CaseFiles): string {
  const own = ownGenes(id, files);
  const genes = geneList(own, lang);
  const sharedArr = intersectionGenes(files);
  const shared = geneList(sharedArr, lang);
  const kept = withheldCount(id, files);
  const partner = partnerOf(id, files).name[lang];

  if (lang === "ar") {
    switch (tool) {
      case "read_own_file":
        if (!turn.opened) return "نتيجتك ما زالت مختومة، فلم يقرأ أي اسم جين.";
        if (own.length === 0) return `لوحتك أنت سليمة بلا متغيرات حاملة معتبرة. لم يطّلع على نتائج ${partner}.`;
        return `وجد ${genes} في نتائجك. لم يطّلع على نتائج ${partner}.`;
      case "read_couple_compile":
        if (!turn.compiled) return "لا توجد نتيجة مشتركة بعد، لأنكما لم توافقا معاً.";
        if (sharedArr.length === 0) return `لا يوجد جين جسدي متنحٍ مشترك بين لوحتيكما. بقيت ${kept} من نتائجك خارجها.`;
        return `النتيجة المشتركة تحوي ${shared} فقط. بقيت ${kept} نتيجة لك خارجها.`;
      case "lookup_gene_info":
        return "طابق السؤال مع الدليل الجيني المعتمد للجينات المسموح لك برؤيتها فقط.";
      case "state_chance":
        if (!turn.compiled) return "لم يعطِ رقماً خاصاً بكما، بل شرح النمط العام فقط.";
        if (sharedArr.length === 0) return "أوضح انخفاض الخطر مع بقاء الاحتمال الأساسي البسيط في كل حمل.";
        return `استخدم الأرقام المعتمدة لـ ${shared} فقط: 1 من 4، و1 من 2، و1 من 4.`;
      case "list_paths":
        return "ذكر المسارات الطبية المرخصة دون ترتيبها أو التوصية بأي منها.";
      case "check_pathway_status":
        return "راجع خطوات الشرح وحجز جلسة الإرشاد الوراثي المعتمدة.";
      case "draft_invite":
        return "كتب الرسالة وتأكد أنها لا تذكر جيناً ولا حالة ولا شخصاً. لم يرسلها.";
      case "refuse_decision":
        return "لم يقل نعم ولا لا. أضاف السؤال إلى ملاحظات جلسة الإرشاد.";
      default:
        return "أضاف السؤال إلى قائمة مستشارك الوراثي لمناقشته معكما مباشرة.";
    }
  }

  switch (tool) {
    case "read_own_file":
      if (!turn.opened) return "Your result is still sealed, so no gene names were read.";
      if (own.length === 0) return `Your own panel has 0 reportable carrier changes. ${partner}’s results were not looked at.`;
      return `Found ${genes} in your results. ${partner}’s results were not looked at.`;
    case "read_couple_compile":
      if (!turn.compiled) return "There is no shared result yet, because you haven’t both agreed.";
      if (sharedArr.length === 0) return `Your shared comparison found 0 overlapping recessive genes. ${kept} of your results stayed private.`;
      return `Your shared result contains ${shared} only. ${kept} of your results stayed out of it.`;
    case "lookup_gene_info":
      return "Checked approved clinical notes only for genes permitted in your view.";
    case "state_chance":
      if (!turn.compiled) return "Gave no figure for you as a couple, only the general pattern.";
      if (sharedArr.length === 0) return "Stated lower risk alongside normal baseline residual chance per pregnancy.";
      return `Used the approved figures for ${shared} only: 1 in 4, 1 in 2, 1 in 4.`;
    case "list_paths":
      return "Named three licensed options without ranking or recommending any.";
    case "check_pathway_status":
      return "Checked explain-it-back completion and genetic counsellor booking availability.";
    case "draft_invite":
      return "Wrote the note and checked it names no gene, condition, or person. Didn’t send it.";
    case "refuse_decision":
      return "Said neither yes nor no. Added the question to your counselling notes.";
    default:
      return "Had no automated clinical answer, so added the question to your counsellor’s notes.";
  }
}

function deterministicSpeech(id: PersonId, turn: AgentTurn, lang: Lang, files: CaseFiles): string {
  const partner = partnerOf(id, files).name[lang];
  const ownFindings = files[id].findings;
  const own = ownGenes(id, files);
  const genes = geneList(own, lang);
  const sharedArr = intersectionGenes(files);
  const shared = geneList(sharedArr, lang);

  if (turn.intent === "carrier") {
    if (!turn.opened) {
      return lang === "ar"
        ? "نتيجتك ما زالت مختومة، لذلك لا أستطيع أن أخبرك بما تحمله. افتحها أولاً ثم اسألني مجدداً. وبشكل عام، الحامل شخص سليم لديه تغيير في نسخة واحدة من جين، ولا يعني ذلك أنه مصاب."
        : "Your result is still sealed, so I can’t tell you what you carry yet. Open it first, then ask me again. In general, a carrier is a healthy person with a change in one copy of a gene. It doesn’t mean they’re ill.";
    }
    if (own.length === 0) {
      return lang === "ar"
        ? `في تقريرك أنت، لم يظهر أي تغيير حامل معتبر ضمن اللوحة المفحوصة. هذا أمر مطمئن، وإن كان الفحص يقلل الاحتمال الوراثي ولا يلغي كل احتمال أساسي في الحمل. لم أطّلع على نتائج ${partner}، فهي خاصة به.`
        : `In your own report, no reportable carrier gene changes were found on the panel. That is reassuring, though screening lowers inherited risk rather than eliminating every baseline chance. I haven’t looked at ${partner}’s results; they stay private to them.`;
    }
    return lang === "ar"
      ? `في نتائجك أنت، تحمل تغييرات في ${genes}. هذا يعني أنك حامل وبصحة جيدة، وليس تشخيصاً لك ولا لأي طفل. لم أطّلع على نتائج ${partner}، فهي ليست من حقي ولا من حقك.`
      : `In your own results, you carry changes in ${genes}. That makes you a carrier, and you’re healthy. It isn’t a diagnosis for you or for any child. I haven’t looked at ${partner}’s results; they’re private to them.`;
  }

  if (turn.intent === "gene-detail") {
    const allCaseGenes = [...files.layla.findings, ...files.omar.findings].map((f) => f.gene);
    const mentioned = findMentionedGeneInText(turn.q, allCaseGenes);
    const allowedSet = new Set<string>();
    if (turn.opened) for (const g of own) allowedSet.add(g);
    if (turn.compiled) for (const g of sharedArr) allowedSet.add(g);

    if (!turn.opened && !turn.compiled) {
      return lang === "ar"
        ? "نتيجتك ما زالت مختومة، لذلك لا أستطيع فحص جين بعينه في ملفك بعد. افتح نتيجتك أولاً ثم اسألني مجدداً."
        : "Your result is still sealed, so I can’t check a specific gene in your file yet. Open your result first, then ask me again.";
    }

    if (mentioned && allowedSet.has(mentioned)) {
      const ownFinding = ownFindings.find((f) => f.gene === mentioned);
      const isShared = turn.compiled && sharedArr.includes(mentioned);
      const catalog = GENE_CATALOG[mentioned];
      if (ownFinding?.classification === "vus") {
        return ownFinding.body[lang];
      }
      if (isShared) {
        const base = catalog ? catalog.sharedBody[lang] : ownFinding?.body[lang] ?? "";
        return base;
      }
      if (catalog) {
        return lang === "ar"
          ? `${catalog.summary.ar} هذه النتيجة موجودة في تقريرك الخاص، ولا تظهر لشريكك إلا إذا كان يحمل تغييراً معتبراً في الجين نفسه ووافقتما معاً على المشاركة.`
          : `${catalog.summary.en} This finding appears in your own opened report, and it never appears to ${partner} unless you both carry a reportable change in it and both agree to share.`;
      }
      if (ownFinding) return ownFinding.body[lang];
    }

    return lang === "ar"
      ? `هذا الجين لا يظهر في تقريرك المفتوح${turn.compiled ? " ولا في نتيجتكما المشتركة" : ""}، ولا أفحص أبداً التقرير الخاص بـ${partner}. إذا كنت تسأل بسبب تاريخ عائلي لحالة معينة، فقد يناقش المستشار الوراثي ذلك معك بالتفصيل.`
      : `That gene does not appear in your opened report${turn.compiled ? " or in your shared result" : ""}, and I never inspect ${partner}’s private report. If you are asking because of family history, your genetic counsellor can walk through it with you directly.`;
  }

  if (turn.intent === "partner-probe") {
    if (!turn.compiled) {
      return lang === "ar"
        ? `لا أستطيع الاطلاع على تقرير ${partner} أو تأكيد أي جين فيه. تبقى لوحة كل شخص خاصة به وحده، ولا تتم أي مطابقة إلا بعد موافقتكما معاً.`
        : `I can’t inspect or confirm anything in ${partner}’s report. Each person’s full panel stays private to them, and nothing is compared unless you both agree to share.`;
    }
    if (sharedArr.length === 0) {
      return lang === "ar"
        ? `لا أطّلع أبداً على التقرير الكامل الخاص بـ${partner}. بعد موافقتكما معاً، أظهرت المطابقة عدم وجود جين جسدي متنحٍ مشترك بينكما، ويبقى أي شيء آخر في لوحة أيٍّ منكما خاصاً بصاحبه.`
        : `I never look at ${partner}’s private report. Because you both agreed to share, I can confirm only that your comparison found no shared autosomal recessive gene change. Anything else on either panel stays private.`;
    }
    return lang === "ar"
      ? `لا أطّلع أبداً على التقرير الكامل الخاص بـ${partner}. ما أستطيع تأكيده بعد موافقتكما معاً هو نتيجتكما المشتركة فقط: ${shared}. أي نتيجة أخرى لدى أيٍّ منكما تبقى خاصة بصاحبها.`
      : `I never inspect ${partner}’s private report. Because you both agreed to share, the only finding shared between you is ${shared}. Anything else either of you may carry stays completely private.`;
  }

  if (turn.intent === "sees") {
    if (!turn.compiled) {
      return lang === "ar"
        ? "حتى الآن لا يرى شريكك أي شيء من نتائجك، لأنكما لم توافقا معاً على المشاركة. وعندما توافقان، لن يرى إلا جيناً تحملانه كلاكما."
        : "Right now your partner can’t see anything from your results, because you haven’t both agreed to share. When you do, they’ll only see a gene you both carry.";
    }
    if (sharedArr.length === 0) {
      return lang === "ar"
        ? `يرى ${partner} فقط أنه لم يظهر بينكما أي جين متنحٍ مشترك مسبب للمرض. نتائجك الفردية بقيت خاصة بك، ولا تعرف أنت ما في لوحته الأخرى.`
        : `${partner} sees only that no shared disease-causing recessive gene was found between you. Your individual findings stayed private to you, and theirs stayed private to them.`;
    }
    return lang === "ar"
      ? `نتيجتكما المشتركة تحوي ${shared} فقط، أي الجين الذي تحملانه معاً. نتيجتك الأخرى بقيت خاصة بك، ولا أعرف ما في نتائج ${partner} الأخرى.`
      : `Your shared result contains only ${shared}, the gene you both carry. Your other result stayed private, and I don’t know what else is in ${partner}’s results either.`;
  }

  if (turn.intent === "court") {
    return lang === "ar"
      ? "تستلم محكمة الزواج شهادة فحص تؤكد إتمام الفحص المخبري وجلسة الإرشاد الوراثي فقط، بلا أي اسم جين أو حالة طبية على الإطلاق. نتائج الفحص لا تمنع الزواج قانوناً، والقرار يعود لكما دائماً."
      : "The marriage court receives only a screening certificate confirming that laboratory screening and genetic counselling took place, with zero gene or condition names on it. Screening results do not legally prevent marriage; the decision always belongs to the two of you.";
  }

  if (turn.intent === "consanguinity") {
    return lang === "ar"
      ? "زواج الأقارب ممارسة اجتماعية وعائلية محترمة، وأكثر من 92% من الأزواج المفحوصين لا يشتركون في تغيير جيني مسبب للمرض. لأن الأقارب يتشاركون جزءاً من الأصول العائلية، يحوّل الفحص الاحتمال العام إلى معلومة دقيقة وخاصة بكما لدعم الاختيار المستنير بلا أي حكم أو توجيه."
      : "Marriage between relatives is a respected family tradition, and over 92% of screened couples share no disease-causing gene change on the panel. Because relatives share ancestry, screening turns a broad population probability into clear, private information for the two of you—supporting informed choice without judgement.";
  }

  if (turn.intent === "vus") {
    const ownVus = turn.opened ? ownFindings.filter((f) => f.classification === "vus").map((f) => f.gene) : [];
    const named = ownVus.length > 0 ? ` (${geneList(ownVus, lang)})` : "";
    return lang === "ar"
      ? `التغيير غير المحسوم الأهمية${named} يعني أن الأدلة العلمية الحالية لا تكفي لتصنيفه مسبباً للمرض أو طبيعياً. لذلك لا يُعامل كخطر مؤكد ولا يدخل في حساب 1 من 4 للزوجين، ويبقى خاصاً بصاحبه، وقد أضفت سؤالك ليراجعه معك المستشار الوراثي.`
      : `A variant of uncertain significance${named} means current medical evidence cannot yet classify the change as disease-causing or harmless. It is never treated as a confirmed risk, never included in couple 1-in-4 calculations, and stays private to its owner. I’ve added your question for your genetic counsellor to review with you.`;
  }

  if (turn.intent === "booking") {
    return lang === "ar"
      ? "بعد فتح نتيجتك والموافقة المشتركة وإتمام ثلاث خطوات قصيرة للشرح بكلماتك، يمكنك اختيار موعد مباشر مع مستشار وراثي معتمد من تبويب «اشرح». وإذا كان لديك سؤال طبي خاص فقد يُضاف مباشرة إلى ملاحظات المستشار."
      : "Once you open your result, agree to compare, and finish the three short explain-it-back steps, you can pick an appointment slot with an accredited genetic counsellor right on the Explain tab. Any personal clinical question you ask here is also saved directly to their session notes.";
  }

  if (turn.intent === "distress") {
    return lang === "ar"
      ? "خذ وقتك، ولا داعي للذعر. حمل تغيير جيني أمر شائع جداً ولا يعني أنك مريض، وليس خطأ أحد على الإطلاق، ولا يخرج أي شيء من حسابك دون إذنك. أبلغت المستشار الوراثي بسؤالك حتى يرافقكما بهدوء ووضوح."
      : "Please take your time—there is no need to panic. Carrying a gene change is common, does not mean you are ill, is nobody’s fault, and nothing leaves your account without your permission. I’ve flagged your note for an accredited genetic counsellor so a qualified specialist can talk it through with you calmly.";
  }

  if (turn.intent === "risk") {
    if (!turn.compiled) {
      return lang === "ar"
        ? "لم توافقا معاً على المشاركة بعد، لذلك لا أستطيع أن أقول إن كان هناك جين مشترك بينكما. بشكل عام، عندما يحمل الأبوان التغيير نفسه، يكون في كل حمل احتمال بنحو 1 من 4 أن يصاب الطفل، و1 من 2 أن يكون حاملاً سليماً، و1 من 4 ألا يرث شيئاً."
        : "You haven’t both agreed to share yet, so I can’t say whether you have a gene in common. In general, when two parents carry the same change, each pregnancy has about a 1 in 4 chance of the child being affected, a 1 in 2 chance of a healthy carrier, and a 1 in 4 chance of neither.";
    }
    if (sharedArr.length === 0) {
      return lang === "ar"
        ? "لا يوجد بين لوحتيكما أي جين جسدي متنحٍ مشترك مسبب للمرض، فلا ينطبق عليكما احتمال 1 من 4 لأي من جينات اللوحة. هذا يقلل الخطر الوراثي كثيراً، مع بقاء الاحتمال الأساسي البسيط الموجود في كل حمل."
        : "No shared disease-causing autosomal recessive gene was found between your two panels, so no 1-in-4 shared panel risk applies to you. That substantially lowers inherited risk, while a small baseline chance still exists in every pregnancy.";
    }
    return lang === "ar"
      ? `تحملان معاً تغييراً في ${shared}. في كل حمل على حدة احتمال بنحو 1 من 4 أن يرث الطفل التغيير منكما ويصاب، ونحو 1 من 2 أن يكون حاملاً سليماً مثلكما، ونحو 1 من 4 ألا يرث أي تغيير. هذا احتمال مستقل في كل حمل وليس تشخيصاً، ولا يحسم أمر زواجكما.`
      : `You both carry a change in ${shared}. In each pregnancy independently, there’s about a 1 in 4 chance the baby inherits it from both of you and is affected, about a 1 in 2 chance of a healthy carrier like you, and about a 1 in 4 chance of neither. It’s a chance, not a diagnosis, and it doesn’t decide your marriage.`;
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

export function allowedGeneTokens(id: PersonId, turn: AgentTurn, files: CaseFiles = PEOPLE): string[] {
  const allow = new Set<string>();
  const addWithAliases = (gene: string) => {
    allow.add(gene);
    const cat = GENE_CATALOG[gene];
    if (cat) {
      allow.add(cat.conditionName.en);
      allow.add(cat.conditionName.ar);
      for (const alias of cat.aliases) allow.add(alias);
    }
  };

  if (turn.opened && (turn.intent === "carrier" || turn.intent === "gene-detail" || turn.intent === "vus")) {
    for (const g of ownGenes(id, files)) addWithAliases(g);
  }
  if (
    turn.compiled &&
    (turn.intent === "sees" || turn.intent === "risk" || turn.intent === "partner-probe" || turn.intent === "gene-detail")
  ) {
    for (const g of intersectionGenes(files)) addWithAliases(g);
  }
  return [...allow];
}

export function validateCandidateSpeech(
  id: PersonId,
  turn: AgentTurn,
  candidate: string,
  files: CaseFiles = PEOPLE,
): boolean {
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (MARRY_BAN.some((phrase) => lower.includes(phrase))) return false;
  if (/\byou should (not )?marry\b|\bi recommend\b/.test(lower)) return false;

  const forbidden = forbiddenTokensForPatient(
    files,
    id,
    turn.opened && (turn.intent === "carrier" || turn.intent === "gene-detail" || turn.intent === "vus"),
    turn.compiled &&
      (turn.intent === "sees" || turn.intent === "risk" || turn.intent === "partner-probe" || turn.intent === "gene-detail"),
  );
  return leakedTokens(trimmed, forbidden).length === 0;
}

export function renderTurn(id: PersonId, turn: AgentTurn, lang: Lang, files: CaseFiles = PEOPLE): TurnView {
  const custom = turn.customSpeech?.[lang];
  const safeSpeech =
    custom && validateCandidateSpeech(id, turn, custom, files)
      ? custom
      : deterministicSpeech(id, turn, lang, files);

  return {
    steps: turn.steps.map((tool) => ({
      tool,
      label: TOOL_LABEL[tool][lang],
      observation: observation(id, tool, turn, lang, files),
    })),
    speech: safeSpeech,
    handed: turn.steps.includes("refuse_decision") || turn.steps.includes("hand_to_physician"),
  };
}

export function unexpectedTokens(id: PersonId, turn: AgentTurn, lang: Lang, files: CaseFiles = PEOPLE): string[] {
  const view = renderTurn(id, turn, lang, files);
  const text = `${view.steps.map((step) => step.observation).join(" ")} ${view.speech}`;
  const allowOwn = turn.opened && (turn.intent === "carrier" || turn.intent === "gene-detail" || turn.intent === "vus");
  const allowShared =
    turn.compiled &&
    (turn.intent === "sees" || turn.intent === "risk" || turn.intent === "partner-probe" || turn.intent === "gene-detail");
  const forbidden = forbiddenTokensForPatient(files, id, allowOwn, allowShared);
  return leakedTokens(text, forbidden);
}

export function runAgentChecks(): string[] {
  const bad: string[] = [];
  const coreIntents: Intent[] = [
    "carrier",
    "sees",
    "risk",
    "options",
    "invite",
    "refuse-marry",
    "refuse-direct",
    "escalate",
    "partner-probe",
    "gene-detail",
    "court",
    "consanguinity",
    "vus",
    "booking",
    "distress",
  ];
  if (interpret("Should we get married?") !== "refuse-marry") bad.push("marry still classified");
  for (const id of ["layla", "omar"] as const) {
    const partnerPrivate = id === "layla" ? "MEFV" : "GJB2";
    for (const opened of [false, true]) {
      for (const compiled of [false, true]) {
        for (const intent of coreIntents) {
          const q =
            intent === "partner-probe"
              ? `Does my partner carry ${partnerPrivate}?`
              : intent === "gene-detail"
                ? `Tell me about ${partnerPrivate}`
                : intent;
          const turn: AgentTurn = { q, intent, opened, compiled, steps: plan(intent) };
          for (const lang of ["en", "ar"] as const) {
            const leaks = unexpectedTokens(id, turn, lang);
            if (leaks.length) bad.push(`${id} ${intent} open=${opened} compiled=${compiled} ${lang}: ${leaks.join(",")}`);
            const view = renderTurn(id, turn, lang);
            const blob = `${view.speech} ${view.steps.map((step) => step.observation).join(" ")}`;
            if (blob.toLowerCase().includes(partnerPrivate.toLowerCase())) {
              bad.push(`${id} saw ${partnerPrivate} on ${intent}`);
            }
            if (compiled && (intent === "sees" || intent === "risk") && !blob.includes("USH2A")) {
              bad.push(`${id} ${intent} ${lang} omitted USH2A`);
            }
            if (!opened && intent === "carrier" && /USH2A|GJB2|MEFV/.test(blob)) {
              bad.push(`${id} closed file named a gene ${lang}`);
            }
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
