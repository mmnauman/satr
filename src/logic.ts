import { allKnownSensitiveTokens, findMentionedGeneInText } from "./domain/genes.js";

export type Reason =
  | "empty"
  | "carrier-pass"
  | "carrier-ill"
  | "carrier-vague"
  | "sees-pass"
  | "sees-exposed"
  | "sees-vague"
  | "risk-pass"
  | "risk-certain"
  | "risk-number"
  | "risk-vague";

export type Intent =
  | "refuse-marry"
  | "refuse-direct"
  | "distress"
  | "partner-probe"
  | "gene-detail"
  | "vus"
  | "booking"
  | "court"
  | "consanguinity"
  | "risk"
  | "sees"
  | "options"
  | "invite"
  | "carrier"
  | "escalate";

export function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}\s%]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const MARRY_BAN = [
  "should not marry",
  "should not get married",
  "shouldnt marry",
  "shouldnt get married",
  "must not marry",
  "do not marry",
  "dont marry",
  "dont get married",
  "cancel the marriage",
  "end the marriage",
  "call off the marriage",
  "لازم ما نتزوج",
  "لازم نلغي",
  "ما نتزوج",
  "لا نتزوج",
  "يجب الا نتزوج",
  "لا يجب ان نتزوج",
  "نلغي الزواج",
];

function assertsIll(s: string): boolean {
  return (
    /\bi am (sick|ill)\b/.test(s) ||
    /\bi m (sick|ill)\b/.test(s) ||
    /\bim (sick|ill)\b/.test(s) ||
    /\bi have (the )?(disease|condition|illness|usher)\b/.test(s) ||
    /diagnosed with/.test(s) ||
    /انا مريض/.test(s) ||
    /عندي المرض/.test(s) ||
    /عندي الحاله/.test(s) ||
    MARRY_BAN.some((phrase) => s.includes(phrase))
  );
}

function explainsCarrier(s: string): boolean {
  const carries =
    /\b(carry|carries|carrier|clear|panel)\b/.test(s) || /احمل/.test(s) || /\bحامل/.test(s) || /لوح/.test(s);
  const negates =
    /not (sick|ill|a diagnosis|the disease|diagnosed|affected)/.test(s) ||
    /do not have/.test(s) ||
    /dont have/.test(s) ||
    /does not mean/.test(s) ||
    /is not (the|a) /.test(s) ||
    /not the same/.test(s) ||
    /healthy/.test(s) ||
    /لا اعاني/.test(s) ||
    /لست مريض/.test(s) ||
    /ليس تشخيص/.test(s) ||
    /ليست تشخيص/.test(s) ||
    /ما عندي المرض/.test(s) ||
    /مو مرض/.test(s) ||
    /ليس مرض/.test(s) ||
    /سليم/.test(s);
  return carries && negates;
}

function mentionedWithoutNegation(s: string, term: string): boolean {
  let from = 0;
  while (from < s.length) {
    const at = s.indexOf(term, from);
    if (at < 0) return false;
    const window = s.slice(Math.max(0, at - 28), at + term.length + 8);
    // "my other result stays private" keeps it private, so a privacy word just after counts too.
    const after = s.slice(at + term.length, at + term.length + 40);
    const negated =
      /not |no |never |doesnt |does not |wont |will not |cant |cannot |without |ما |لا |لن |مو |بدون /.test(
        window,
      ) || /private|hidden|secret|stays? with me|kept|to myself|خاص|خاصه|مخفي|يبقي|تبقي|سري/.test(after);
    if (!negated) return true;
    from = at + term.length;
  }
  return false;
}

const DEFAULT_PRIVATE_TERMS = [
  "gjb2",
  "mefv",
  "everything",
  "all my",
  "all of my",
  "my other",
  "other result",
  "كل نتائجي",
  "كل النتائج",
  "كل شي",
  "نتيجتي الاخري",
  "الباقي",
];

function saysSharedOnly(s: string): boolean {
  return (
    /only the (shared |one |gene|genes)/.test(s) ||
    /sees only/.test(s) ||
    /see only/.test(s) ||
    /just the (shared |one |gene|genes)/.test(s) ||
    /shared gene/.test(s) ||
    /gene we both/.test(s) ||
    /genes we both/.test(s) ||
    /no shared gene/.test(s) ||
    /nothing shared/.test(s) ||
    /الجين المشترك/.test(s) ||
    /الجينات المشتركه/.test(s) ||
    /فقط الجين/.test(s) ||
    /يري الجين المشترك/.test(s) ||
    /ترى الجين المشترك/.test(s) ||
    /يشوف الجين المشترك/.test(s) ||
    /لا يوجد جين مشترك/.test(s)
  );
}

function hasNumber(s: string): boolean {
  return /1 in 4|one in four|25%|25 percent|واحد من اربع|1 من 4|ربع/.test(s);
}

function hasUncertainty(s: string): boolean {
  return (
    /chance|probab|possible|might|may |not certain|not a certainty|not a diagnosis|uncertain|baseline|lowers risk|residual/.test(
      s,
    ) ||
    /احتمال|فرصه|ليس مؤكد|ليست مؤكد|مو اكيد|ليس تشخيص|ليست تشخيص|قد |يقلل الاحتمال|اساسي/.test(s)
  );
}

function assertsCertain(s: string): boolean {
  const word = (token: string) => ` ${s} `.includes(` ${token} `);
  return (
    /will have/.test(s) ||
    /definitely/.test(s) ||
    /for sure/.test(s) ||
    /my child (has|will)/.test(s) ||
    /certain to/.test(s) ||
    /100% safe/.test(s) ||
    /zero risk/.test(s) ||
    word("اكيد") ||
    word("حتما") ||
    /طفلي مصاب/.test(s) ||
    /راح يصير/.test(s) ||
    assertsIll(s)
  );
}

export type ScoreContext = {
  privateGenes?: string[];
  sharedCount?: number;
};

export function scoreAnswer(
  step: 0 | 1 | 2,
  raw: string,
  context?: ScoreContext,
): { pass: boolean; reason: Reason } {
  const s = normalize(raw);
  if (!s) return { pass: false, reason: "empty" };

  if (step === 0) {
    if (assertsIll(s)) return { pass: false, reason: "carrier-ill" };
    if (explainsCarrier(s)) return { pass: true, reason: "carrier-pass" };
    return { pass: false, reason: "carrier-vague" };
  }

  const dynamicPrivate = context?.privateGenes
    ? [
        ...context.privateGenes.map((g) => g.toLowerCase()),
        ...DEFAULT_PRIVATE_TERMS.filter((t) => t !== "gjb2" && t !== "mefv"),
      ]
    : DEFAULT_PRIVATE_TERMS;

  if (step === 1) {
    if (dynamicPrivate.some((term) => term && mentionedWithoutNegation(s, term))) {
      return { pass: false, reason: "sees-exposed" };
    }
    if (saysSharedOnly(s) || dynamicPrivate.some((term) => term && s.includes(term))) {
      return { pass: true, reason: "sees-pass" };
    }
    return { pass: false, reason: "sees-vague" };
  }

  if (assertsCertain(s)) return { pass: false, reason: "risk-certain" };
  if (context?.sharedCount === 0) {
    if (hasUncertainty(s) && /no shared|lowers|baseline|pregnan|small|لا يوجد|مطمئن|يقلل|حمل/.test(s)) {
      return { pass: true, reason: "risk-pass" };
    }
  }
  if (hasNumber(s) && hasUncertainty(s)) return { pass: true, reason: "risk-pass" };
  if (hasUncertainty(s) && /pregnan|child|حمل|طفل/.test(s)) {
    return { pass: true, reason: "risk-pass" };
  }
  if (hasNumber(s)) return { pass: false, reason: "risk-number" };
  return { pass: false, reason: "risk-vague" };
}

export function interpret(raw: string, extraCaseGenes: string[] = []): Intent {
  const s = normalize(raw);
  if (!s) return "escalate";

  // 1. Marriage directives must always refuse personal recommendation and hand off
  if (
    /(\b(marry|married|marriage|wedding)\b)|نتزوج|الزواج|اتزوج|اخطب/.test(s) &&
    /should|whether|do we|cancel|stop|call off|نصح|هل |لازم|اقرر|decide|اختار|نلغي/.test(s)
  ) {
    return "refuse-marry";
  }
  if (/should we marry|shall we marry|compatible to marry|هل نتزوج|هل اتزوج|نوافق على الزواج/.test(s)) {
    return "refuse-marry";
  }

  // 2. Distress, fear, coercion or family pressure signals -> compassionate escalation
  if (
    /\b(scared|terrified|anxious|afraid|panic|forced|pressured|ashamed|fault|blame)\b/.test(s) ||
    /خائف|خايف|قلقان|مرعوب|مجبر|ضغط الاهل|ذنبي|غلطتي/.test(s)
  ) {
    return "distress";
  }

  // 3. Specific reproductive procedure recommendation requests -> neutral handoff
  if (
    /\b(ivf|pgd|pgt|pgt m|amniocentesis|cvs|termination|abort)\b/.test(s) ||
    /انابيب|اطفال انابيب|حقن مجهري|فحص الاجنه|اجهاض/.test(s)
  ) {
    return "refuse-direct";
  }

  // 4. Probing partner's private results ("Does Omar carry MEFV?", "What else does my partner have?")
  const mentionsPartner =
    /\b(partner|husband|wife|fiance|fiancee|omar|layla|khalid|noura|rashid|mariam|zayed|amina|saif|hessa|his|her)\b/.test(
      s,
    ) || /شريك|شريكتي|زوجي|زوجتي|خطيبي|خطيبتي|عمر|ليلي|خالد|نوره|راشد|مريم|زايد|امينه|سيف|حصه/.test(s);

  const mentionedGene = findMentionedGeneInText(raw, extraCaseGenes);

  if (
    mentionsPartner &&
    (/\b(carry|carries|have|has|other|private|panel|genes|report)\b/.test(s) ||
      /يحمل|تحمل|عنده|عندها|لديه|لديها|جينات|تقرير|الاخري|الخاصه/.test(s)) &&
    !/\b(what (does|will|can) .* see|partner see)\b/.test(s) &&
    !/ماذا يري|ماذا تري|يشوف/.test(s)
  ) {
    return "partner-probe";
  }

  // 5. Court / screening certificate questions
  if (/\b(court|judge|certificate|attestation)\b/.test(s) || /محكمه|المحكمه|القاضي|الشهاده|شهاده الفحص/.test(s)) {
    return "court";
  }

  // 6. VUS / uncertain variant questions
  if (/\b(vus|uncertain|inconclusive|unclassified)\b/.test(s) || /غير محسوم|غير مصنف|غير واضح/.test(s)) {
    return "vus";
  }

  // 7. Specific gene or condition lookup ("What is HBB?", "Tell me about USH2A", "اشرح جين G6PD")
  if (mentionedGene) {
    return "gene-detail";
  }

  // 8. Relative / family cascade invitation (check before consanguinity so "invite my cousin" stays "invite")
  if (
    /\b(invite|nudge|tell my|notify|relative|sister|brother|sibling)\b/.test(s) ||
    (/\bcousin\b/.test(s) && /\b(invite|screen|test|tell|send|can i)\b/.test(s)) ||
    /ادعو|ادع |دعوه|اقاربي|قريبي|اختي|اخي|ابن عمي|بنت عمي/.test(s)
  ) {
    return "invite";
  }

  // 9. Consanguinity / cousin marriage context questions (non-directive education)
  if (/\b(consanguin|cousins|first cousin|related|blood relative)\b/.test(s) || /زواج الاقارب|ابناء عم|قرابه/.test(s)) {
    return "consanguinity";
  }

  // 10. Booking / genetic counsellor appointment questions
  if (
    /\b(book|booking|appointment|schedule|counsellor|counselor|specialist|when can we meet)\b/.test(s) ||
    /حجز|موعد|احجز|مستشار|متي نقابل/.test(s)
  ) {
    return "booking";
  }

  // 11. Privacy / what partner sees
  if (
    /what (does|will|can) (he|she|omar|layla|my partner) see|partner see|who can see|يشوف|يري |تري |ترى |ماذا يري|ماذا ترى|من يري/.test(
      s,
    )
  ) {
    return "sees";
  }

  // 12. Couple / pregnancy risk & residual risk
  if (
    /\b(risk|chance|1 in 4|one in four|25%|percent|pregnancy|children|baby|residual|no shared)\b/.test(s) ||
    /احتمال|فرصه|نسبه|حمل|طفل|اطفال|مشترك/.test(s)
  ) {
    return "risk";
  }

  // 13. Care options
  if (/option|choice|what can we|what should we do|paths|خيارات|وش نسوي|ماذا نفعل|مسارات/.test(s)) {
    return "options";
  }

  // 14. Carrier meaning / own results
  if (
    /\b(carrier|carry|what does (this|it|that) mean|my result|my report|my genes|healthy|am i sick|am i ill)\b/.test(
      s,
    ) ||
    /معني|حامل|احمل|نتيجتي|تقريري|جيناتي|هل انا مريض/.test(s)
  ) {
    return "carrier";
  }

  return "escalate";
}

export const ALL_GENE_TOKENS = allKnownSensitiveTokens();

export function leakedTokens(text: string, forbidden: string[]): string[] {
  const hay = text.toLowerCase();
  return forbidden.filter((token) => hay.includes(token.toLowerCase()));
}

export function patientForbidden(allowShared: boolean, sharedGenes: string[] = ["USH2A"]): string[] {
  const allow = new Set<string>();
  if (allowShared) {
    for (const g of sharedGenes) allow.add(g.toLowerCase());
    if (sharedGenes.includes("USH2A")) {
      for (const alias of ["usher", "أوشر", "اوشر", "usher syndrome"]) allow.add(alias);
    }
  }
  return ALL_GENE_TOKENS.filter((tok) => !allow.has(tok.toLowerCase()));
}

export function runScoreChecks(): string[] {
  const failures: string[] = [];
  const expect = (name: string, step: 0 | 1 | 2, text: string, pass: boolean, reason: Reason) => {
    const got = scoreAnswer(step, text);
    if (got.pass !== pass || got.reason !== reason) {
      failures.push(`${name}: expected ${pass} ${reason}, got ${got.pass} ${got.reason}`);
    }
  };

  expect(
    "carrier en",
    0,
    "I carry a change in a gene. I do not have the condition, and this is not a diagnosis.",
    true,
    "carrier-pass",
  );
  expect(
    "carrier ar",
    0,
    "أحمل تغييراً في جين. لا أعاني الحالة، وهذه ليست تشخيصاً.",
    true,
    "carrier-pass",
  );
  expect("carrier harm", 0, "I have the disease and we should not get married.", false, "carrier-ill");
  expect("carrier empty", 0, "   ", false, "empty");
  expect("carrier vague", 0, "It is a gene.", false, "carrier-vague");
  expect("sees private after", 1, "Khalid only sees the gene we both carry, my other result stays private.", true, "sees-pass");
  expect("sees private after ar", 1, "يرى الجين المشترك فقط، ونتيجتي الاخرى تبقى خاصة.", true, "sees-pass");
  expect("sees exposed", 1, "He can see my other results too.", false, "sees-exposed");

  expect(
    "sees en",
    1,
    "Omar sees only the gene we both carry, USH2A. He does not see my other result.",
    true,
    "sees-pass",
  );
  expect(
    "sees ar",
    1,
    "عمر يرى الجين المشترك فقط، USH2A. لا يرى نتيجتي الأخرى.",
    true,
    "sees-pass",
  );
  expect("sees leak", 1, "He sees everything, including GJB2.", false, "sees-exposed");
  expect("sees deny", 1, "He does not see GJB2.", true, "sees-pass");

  expect(
    "risk en",
    2,
    "One in four is a chance for a future pregnancy, not a certainty and not a diagnosis.",
    true,
    "risk-pass",
  );
  expect(
    "risk ar",
    2,
    "واحد من أربعة احتمال لحمل قادم، ليس أمراً مؤكداً وليس تشخيصاً لطفل.",
    true,
    "risk-pass",
  );
  expect("risk number", 2, "1 in 4", false, "risk-number");
  expect("risk certain", 2, "My child will have the condition.", false, "risk-certain");

  if (interpret("Should we get married?") !== "refuse-marry") failures.push("marry intent");
  if (interpret("هل نتزوج؟") !== "refuse-marry") failures.push("marry ar intent");
  if (interpret("Should we do IVF?") !== "refuse-direct") failures.push("ivf intent");
  if (interpret("What does Omar see?") !== "sees") failures.push("sees intent");
  if (interpret("What is the risk?") !== "risk") failures.push("risk intent");
  if (interpret("Can I invite my cousin?") !== "invite") failures.push("invite intent");
  if (interpret("Does Omar carry MEFV?") !== "partner-probe") failures.push("partner probe intent");
  if (interpret("Tell me about USH2A") !== "gene-detail") failures.push("gene detail intent");
  if (interpret("What does the court see?") !== "court") failures.push("court intent");
  if (interpret("What is the weather?") !== "escalate") failures.push("escalate intent");

  return failures;
}
