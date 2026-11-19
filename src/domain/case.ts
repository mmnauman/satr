import {
  allKnownSensitiveTokens,
  buildFinding,
  GENE_CATALOG,
  sharedGeneExplanation,
  type Finding,
  type FindingInput,
  type Lang,
} from "./genes";

export type { Finding, FindingInput, Lang };
export type PersonId = "layla" | "omar";
export type ParticipantSlot = "a" | "b";

export const SLOT_TO_ID: Record<ParticipantSlot, PersonId> = { a: "layla", b: "omar" };
export const ID_TO_SLOT: Record<PersonId, ParticipantSlot> = { layla: "a", omar: "b" };

export function otherPersonId(id: PersonId): PersonId {
  return id === "layla" ? "omar" : "layla";
}

export type PersonFile = {
  id: PersonId;
  name: Record<Lang, string>;
  initial: Record<Lang, string>;
  partner: PersonId;
  number: string;
  joined: boolean;
  reportSource?: string;
  findings: Finding[];
};

export type CaseFiles = Record<PersonId, PersonFile>;

export type CoupleAnalysis = {
  reportableA: string[];
  reportableB: string[];
  sharedGenes: string[];
  withheldA: number;
  withheldB: number;
  hasVus: boolean;
  hasXLinked: boolean;
  hasDominant: boolean;
  tier: 1 | 2;
  escalationReasons: string[];
};

export function makeBilingualName(enRaw: string, arRaw?: string): { name: Record<Lang, string>; initial: Record<Lang, string> } {
  const en = enRaw.trim() || "Applicant";
  const ar = (arRaw ?? enRaw).trim() || "متقدم";
  const initEn = (en[0] ?? "A").toUpperCase();
  const initAr = ar[0] ?? initEn;
  return {
    name: { en, ar },
    initial: { en: initEn, ar: initAr },
  };
}

export function createPersonFile(params: {
  id: PersonId;
  nameEn: string;
  nameAr?: string;
  number?: string;
  joined?: boolean;
  reportSource?: string;
  findings: (Finding | FindingInput)[];
}): PersonFile {
  const { name, initial } = makeBilingualName(params.nameEn, params.nameAr);
  const findings: Finding[] = params.findings.map((f) => ("condition" in f && "body" in f ? f : buildFinding(f)));
  const fallbackNo = params.id === "layla" ? "AD-18421" : "AD-18422";
  return {
    id: params.id,
    name,
    initial,
    partner: otherPersonId(params.id),
    number: params.number?.trim() || fallbackNo,
    joined: params.joined ?? true,
    reportSource: params.reportSource,
    findings,
  };
}

/**
 * Reportable genes for Diffie-Hellman couple PSI:
 * Only Pathogenic or Likely Pathogenic autosomal recessive carrier findings participate in
 * couple 1-in-4 intersection math. VUS findings are excluded (never presented as couple risk),
 * and X-linked / dominant findings trigger direct genetic counselling regardless of partner panel.
 */
export function reportableGenesOf(file: PersonFile): string[] {
  return file.findings
    .filter((f) => f.classification !== "vus" && f.inheritance === "autosomal_recessive")
    .map((f) => f.gene);
}

export function analyzeCase(files: CaseFiles): CoupleAnalysis {
  const reportableA = reportableGenesOf(files.layla);
  const reportableB = reportableGenesOf(files.omar);
  const setA = new Set(reportableA);
  const sharedGenes = reportableB.filter((g) => setA.has(g));
  const sharedSet = new Set(sharedGenes);

  const allFindings = [...files.layla.findings, ...files.omar.findings];
  const hasVus = allFindings.some((f) => f.classification === "vus");
  const hasXLinked = allFindings.some((f) => f.inheritance === "x_linked");
  const hasDominant = allFindings.some((f) => f.inheritance === "autosomal_dominant");

  const escalationReasons: string[] = [];
  if (sharedGenes.length > 1) escalationReasons.push("multiple_shared_genes");
  if (hasVus) escalationReasons.push("vus_present");
  if (hasXLinked) escalationReasons.push("x_linked_finding");
  if (hasDominant) escalationReasons.push("dominant_finding");

  const tier: 1 | 2 = escalationReasons.length > 0 ? 2 : 1;

  return {
    reportableA,
    reportableB,
    sharedGenes,
    withheldA: files.layla.findings.filter((f) => !sharedSet.has(f.gene)).length,
    withheldB: files.omar.findings.filter((f) => !sharedSet.has(f.gene)).length,
    hasVus,
    hasXLinked,
    hasDominant,
    tier,
    escalationReasons,
  };
}

export function personalEscalationFindings(file: PersonFile): Finding[] {
  return file.findings.filter(
    (f) => f.classification === "vus" || f.inheritance === "x_linked" || f.inheritance === "autosomal_dominant",
  );
}

export function allCaseSensitiveTokens(files: CaseFiles): string[] {
  const genes: string[] = [];
  const conditions: string[] = [];
  for (const id of ["layla", "omar"] as const) {
    for (const f of files[id].findings) {
      genes.push(f.gene);
      conditions.push(f.condition.en, f.condition.ar);
      const cat = GENE_CATALOG[f.gene];
      if (cat) conditions.push(cat.conditionName.en, cat.conditionName.ar);
    }
  }
  return allKnownSensitiveTokens(genes, conditions);
}

export function forbiddenTokensForPatient(
  files: CaseFiles,
  viewer: PersonId,
  openedOwn: boolean,
  compiledShared: boolean,
): string[] {
  const allowedGenes = new Set<string>();
  if (openedOwn) {
    for (const f of files[viewer].findings) allowedGenes.add(f.gene.toLowerCase());
  }
  if (compiledShared) {
    for (const g of analyzeCase(files).sharedGenes) allowedGenes.add(g.toLowerCase());
  }

  const allowedWords = new Set<string>(allowedGenes);
  for (const g of allowedGenes) {
    const entry = GENE_CATALOG[g.toUpperCase()];
    if (entry) {
      allowedWords.add(entry.conditionName.en.toLowerCase());
      allowedWords.add(entry.conditionName.ar.toLowerCase());
      allowedWords.add(entry.conditionLine.en.toLowerCase());
      allowedWords.add(entry.conditionLine.ar.toLowerCase());
      for (const alias of entry.aliases) allowedWords.add(alias.toLowerCase());
    }
    for (const id of ["layla", "omar"] as const) {
      for (const f of files[id].findings) {
        if (f.gene.toLowerCase() === g) {
          allowedWords.add(f.condition.en.toLowerCase());
          allowedWords.add(f.condition.ar.toLowerCase());
        }
      }
    }
  }

  return allCaseSensitiveTokens(files).filter((tok) => !allowedWords.has(tok.toLowerCase()));
}

export function sharedGeneBody(files: CaseFiles, gene: string, lang: Lang): string {
  const finding =
    files.layla.findings.find((f) => f.gene === gene) ?? files.omar.findings.find((f) => f.gene === gene);
  return sharedGeneExplanation(gene, lang, finding?.condition[lang]);
}

export function noSharedFindingsBody(lang: Lang): string {
  if (lang === "ar") {
    return "لم يظهر بين لوحتيكما أي جين جسدي متنحٍ مشترك مسبب للمرض ضمن الجينات المفحوصة. هذه نتيجة مطمئنة تنطبق على أكثر من 92% من الأزواج. ومع ذلك، فإن الفحص يغطي الجينات والتغييرات المعروفة في اللوحة ولا يلغي الاحتمال الأساسي البسيط الموجود في كل حمل، ويمكنكما دائماً التحدث مع مستشار وراثي إذا كانت لديكما أسئلة أو تاريخ عائلي.";
  }
  return "No shared disease-causing autosomal recessive gene change was found between your two panels. That reassuring outcome applies to over 92% of screened couples. Even so, screening reduces inherited risk rather than eliminating every baseline pregnancy chance, and you are always welcome to speak with a genetic counsellor if you have questions or family history.";
}

export type CasePresetId = "cousin-ush2a" | "thalassemia-hbb" | "clear-panel" | "xlinked-g6pd" | "tier2-vus";

export type CasePreset = {
  id: CasePresetId;
  label: Record<Lang, string>;
  note: Record<Lang, string>;
  files: CaseFiles;
};

export function createDefaultLaylaOmarFiles(): CaseFiles {
  return {
    layla: {
      id: "layla",
      name: { en: "Layla", ar: "ليلى" },
      initial: { en: "L", ar: "ل" },
      partner: "omar",
      number: "AD-18421",
      joined: true,
      reportSource: "Abu Dhabi 570-gene panel · Preset",
      findings: [
        {
          ...buildFinding({ gene: "USH2A", classification: "pathogenic" }),
          body: {
            en: "The lab found that you carry a change in a gene called USH2A. When a child inherits this change from both parents, it can cause Usher syndrome type 2A, which affects hearing from birth and sight over time. Carrying it does not mean you have the condition, and it is not a diagnosis for any future child. Carriers are healthy. It simply means the change is something you could pass on.",
            ar: "وجد المختبر أنك تحمل تغييراً في جين اسمه USH2A. إذا ورث الطفل هذا التغيير من الأبوين معاً، فقد يسبب متلازمة أوشر من النوع 2A التي تؤثر في السمع منذ الولادة وفي البصر مع الوقت. حملك له لا يعني أنك مصابة بالحالة، وليس تشخيصاً لأي طفل في المستقبل. الحامل شخص سليم، والأمر يعني فقط أن هذا التغيير قد ينتقل منك إلى أطفالك.",
          },
        },
        {
          ...buildFinding({ gene: "GJB2", classification: "pathogenic" }),
          simple: {
            en: "You carry a second gene change. You are healthy. This one stays private to you.",
            ar: "تحملين تغييراً ثانياً. أنت بصحة جيدة. هذه النتيجة تبقى خاصة بك.",
          },
          body: {
            en: "You also carry a change in GJB2, a gene linked to some kinds of inherited hearing loss. You do not have hearing loss because of it. This result stays private to you. It would only ever appear in your shared result if your partner carried a change in the same gene and you had both agreed to share.",
            ar: "تحملين أيضاً تغييراً في GJB2، وهو جين مرتبط ببعض أنواع ضعف السمع الوراثي. هذا لا يعني أنك تعانين ضعف السمع. تبقى هذه النتيجة خاصة بك، ولن تظهر في نتيجتكما المشتركة إلا إذا كان شريكك يحمل تغييراً في الجين نفسه ووافقتما معاً على المشاركة.",
          },
        },
      ],
    },
    omar: {
      id: "omar",
      name: { en: "Omar", ar: "عمر" },
      initial: { en: "O", ar: "ع" },
      partner: "layla",
      number: "AD-18422",
      joined: true,
      reportSource: "Abu Dhabi 570-gene panel · Preset",
      findings: [
        buildFinding({ gene: "USH2A", classification: "pathogenic" }),
        buildFinding({ gene: "MEFV", classification: "pathogenic" }),
      ],
    },
  };
}

export const CASE_PRESETS: CasePreset[] = [
  {
    id: "cousin-ush2a",
    label: { en: "Layla & Omar · Shared USH2A", ar: "ليلى وعمر · جين USH2A مشترك" },
    note: {
      en: "1 shared gene (USH2A) + 1 private gene on each side (GJB2, MEFV). Tier 1 counsellor session.",
      ar: "جين مشترك واحد (USH2A) وجين خاص لكل طرف (GJB2 وMEFV). جلسة مستشار من المستوى الأول.",
    },
    files: createDefaultLaylaOmarFiles(),
  },
  {
    id: "thalassemia-hbb",
    label: { en: "Noura & Khalid · Shared HBB (Thalassemia)", ar: "نورة وخالد · جين HBB مشترك (الثلاسيميا)" },
    note: {
      en: "Both carry beta-thalassemia (HBB); PAH and CFTR stay private to their owners.",
      ar: "يحملان معاً بيتا ثلاسيميا (HBB)؛ ويبقى PAH وCFTR خاصين بصاحبيهما.",
    },
    files: {
      layla: createPersonFile({
        id: "layla",
        nameEn: "Noura",
        nameAr: "نورة",
        number: "AD-20411",
        reportSource: "Sample · HBB + PAH",
        findings: [
          { gene: "HBB", classification: "pathogenic" },
          { gene: "PAH", classification: "pathogenic" },
        ],
      }),
      omar: createPersonFile({
        id: "omar",
        nameEn: "Khalid",
        nameAr: "خالد",
        number: "AD-20412",
        reportSource: "Sample · HBB + CFTR",
        findings: [
          { gene: "HBB", classification: "pathogenic" },
          { gene: "CFTR", classification: "likely_pathogenic" },
        ],
      }),
    },
  },
  {
    id: "clear-panel",
    label: { en: "Amina & Zayed · No shared gene (92%+ outcome)", ar: "أمينة وزايد · بلا جين مشترك (أكثر من 92%)" },
    note: {
      en: "Each carries 1 recessive change (SMN1 vs GJB2), 0 shared. Shows residual risk and non-disclosure.",
      ar: "يحمل كل طرف تغييراً متنحياً مختلفاً (SMN1 مقابل GJB2) دون اشتراك. يعرض الخطر المتبقي وحفظ الخصوصية.",
    },
    files: {
      layla: createPersonFile({
        id: "layla",
        nameEn: "Amina",
        nameAr: "أمينة",
        number: "AD-21901",
        reportSource: "Sample · SMN1 only",
        findings: [{ gene: "SMN1", classification: "pathogenic" }],
      }),
      omar: createPersonFile({
        id: "omar",
        nameEn: "Zayed",
        nameAr: "زايد",
        number: "AD-21902",
        reportSource: "Sample · GJB2 only",
        findings: [{ gene: "GJB2", classification: "pathogenic" }],
      }),
    },
  },
  {
    id: "xlinked-g6pd",
    label: { en: "Hessa & Saif · X-linked G6PD escalation", ar: "حصة وسيف · إحالة G6PD المرتبط بـ X" },
    note: {
      en: "Hessa carries X-linked G6PD; 0 shared recessive genes. Routes Hessa to counsellor while keeping G6PD private from Saif.",
      ar: "تحمل حصة جين G6PD المرتبط بـ X دون جينات متنحية مشتركة. يوجّه حصة للمستشار مع إبقاء G6PD خاصاً بها.",
    },
    files: {
      layla: createPersonFile({
        id: "layla",
        nameEn: "Hessa",
        nameAr: "حصة",
        number: "AD-22310",
        reportSource: "Sample · G6PD X-linked",
        findings: [{ gene: "G6PD", classification: "pathogenic", inheritance: "x_linked" }],
      }),
      omar: createPersonFile({
        id: "omar",
        nameEn: "Saif",
        nameAr: "سيف",
        number: "AD-22311",
        reportSource: "Sample · Clear panel",
        findings: [],
      }),
    },
  },
  {
    id: "tier2-vus",
    label: { en: "Mariam & Rashid · Multi-gene + VUS (Tier 2)", ar: "مريم وراشد · جينان مشتركان + VUS (المستوى الثاني)" },
    note: {
      en: "Shared CYP21A2 and CFTR plus an uncertain ABCA4 variant in Mariam (excluded from PSI, escalated to committee).",
      ar: "يشتركان في CYP21A2 وCFTR مع تغيير غير محسوم في ABCA4 لدى مريم (مستبعد من المطابقة ويُحال للجنة).",
    },
    files: {
      layla: createPersonFile({
        id: "layla",
        nameEn: "Mariam",
        nameAr: "مريم",
        number: "AD-19004A",
        reportSource: "Sample · Tier 2 + VUS",
        findings: [
          { gene: "CYP21A2", classification: "pathogenic" },
          { gene: "CFTR", classification: "pathogenic" },
          { gene: "ABCA4", classification: "vus" },
        ],
      }),
      omar: createPersonFile({
        id: "omar",
        nameEn: "Rashid",
        nameAr: "راشد",
        number: "AD-19004B",
        reportSource: "Sample · Tier 2",
        findings: [
          { gene: "CYP21A2", classification: "pathogenic" },
          { gene: "CFTR", classification: "pathogenic" },
        ],
      }),
    },
  },
];

export function getPresetById(id: CasePresetId): CasePreset {
  return CASE_PRESETS.find((p) => p.id === id) ?? CASE_PRESETS[0];
}
