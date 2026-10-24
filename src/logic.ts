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

const MARRY_BAN = [
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
    /\b(carry|carries|carrier)\b/.test(s) || /احمل/.test(s) || /\bحامل/.test(s);
  const negates =
    /not (sick|ill|a diagnosis|the disease|diagnosed)/.test(s) ||
    /do not have/.test(s) ||
    /dont have/.test(s) ||
    /does not mean/.test(s) ||
    /is not (the|a) /.test(s) ||
    /not the same/.test(s) ||
    /لا اعاني/.test(s) ||
    /لست مريض/.test(s) ||
    /ليس تشخيص/.test(s) ||
    /ليست تشخيص/.test(s) ||
    /ما عندي المرض/.test(s) ||
    /مو مرض/.test(s) ||
    /ليس مرض/.test(s);
  return carries && negates;
}

function mentionedWithoutNegation(s: string, term: string): boolean {
  let from = 0;
  while (from < s.length) {
    const at = s.indexOf(term, from);
    if (at < 0) return false;
    const window = s.slice(Math.max(0, at - 28), at + term.length + 8);
    const negated =
      /not |no |never |doesnt |does not |wont |will not |cant |cannot |without |ما |لا |لن |مو |بدون /.test(
        window,
      );
    if (!negated) return true;
    from = at + term.length;
  }
  return false;
}

const PRIVATE_TERMS = [
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
    /only the (shared |one |gene)/.test(s) ||
    /sees only/.test(s) ||
    /see only/.test(s) ||
    /just the (shared |one |gene)/.test(s) ||
    /shared gene/.test(s) ||
    /gene we both/.test(s) ||
    /الجين المشترك/.test(s) ||
    /فقط الجين/.test(s) ||
    /يري الجين المشترك/.test(s) ||
    /ترى الجين المشترك/.test(s) ||
    /يشوف الجين المشترك/.test(s)
  );
}

function hasNumber(s: string): boolean {
  return /1 in 4|one in four|25%|25 percent|واحد من اربع|1 من 4|ربع/.test(s);
}

function hasUncertainty(s: string): boolean {
  return (
    /chance|probab|possible|might|may |not certain|not a certainty|not a diagnosis|uncertain/.test(
      s,
    ) ||
    /احتمال|فرصه|ليس مؤكد|ليست مؤكد|مو اكيد|ليس تشخيص|ليست تشخيص|قد /.test(s)
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
    word("اكيد") ||
    word("حتما") ||
    /طفلي مصاب/.test(s) ||
    /راح يصير/.test(s) ||
    assertsIll(s)
  );
}

export function scoreAnswer(step: 0 | 1 | 2, raw: string): { pass: boolean; reason: Reason } {
  const s = normalize(raw);
  if (!s) return { pass: false, reason: "empty" };

  if (step === 0) {
    if (assertsIll(s)) return { pass: false, reason: "carrier-ill" };
    if (explainsCarrier(s)) return { pass: true, reason: "carrier-pass" };
    return { pass: false, reason: "carrier-vague" };
  }

  if (step === 1) {
    if (PRIVATE_TERMS.some((term) => mentionedWithoutNegation(s, term))) {
      return { pass: false, reason: "sees-exposed" };
    }
    if (saysSharedOnly(s) || PRIVATE_TERMS.some((term) => s.includes(term))) {
      return { pass: true, reason: "sees-pass" };
    }
    return { pass: false, reason: "sees-vague" };
  }

  if (assertsCertain(s)) return { pass: false, reason: "risk-certain" };
  if (hasNumber(s) && hasUncertainty(s)) return { pass: true, reason: "risk-pass" };
  if (hasUncertainty(s) && /pregnan|child|حمل|طفل/.test(s)) {
    return { pass: true, reason: "risk-pass" };
  }
  if (hasNumber(s)) return { pass: false, reason: "risk-number" };
  return { pass: false, reason: "risk-vague" };
}

export function interpret(raw: string): Intent {
  const s = normalize(raw);
  if (!s) return "escalate";
  if (
    /(\b(marry|married|marriage|wedding)\b)|نتزوج|الزواج|اتزوج|اخطب/.test(s) &&
    /should|whether|do we|نصح|هل |لازم|اقرر|decide|اختار/.test(s)
  ) {
    return "refuse-marry";
  }
  if (/should we marry|shall we marry|هل نتزوج|هل اتزوج|نوافق على الزواج/.test(s)) {
    return "refuse-marry";
  }
  if (/ivf|pgd|pgt|انابيب|اطفال انابيب|حقن/.test(s)) return "refuse-direct";
  if (/cousin|relative|sister|brother|sibling|قريب|ابن عم|بنت عم|اختي|اخي|ادع/.test(s)) {
    return "invite";
  }
  if (/what (does|will|can) (he|she|omar|layla|my partner) see|partner see|يشوف|يري |ترى |ماذا يرى|ماذا ترى/.test(s)) {
    return "sees";
  }
  if (/risk|chance|1 in 4|one in four|احتمال|فرصه|نسبه/.test(s)) return "risk";
  if (/option|choice|what can we|what should we do|خيارات|وش نسوي|ماذا نفعل/.test(s)) {
    return "options";
  }
  if (/carrier|what does (this|it|that) mean|معنى|حامل|احمل/.test(s)) return "carrier";
  return "escalate";
}

const GENE_TOKENS = ["USH2A", "GJB2", "MEFV", "CYP21A2", "CFTR", "ABCA4", "Usher", "أوشر", "اوشر"];

export function leakedTokens(text: string, forbidden: string[]): string[] {
  const hay = text.toLowerCase();
  return forbidden.filter((token) => hay.includes(token.toLowerCase()));
}

export function patientForbidden(allowShared: boolean): string[] {
  const base = ["GJB2", "MEFV", "CYP21A2", "CFTR", "ABCA4"];
  if (!allowShared) base.push("USH2A", "Usher", "أوشر", "اوشر");
  return base;
}

export const ALL_GENE_TOKENS = GENE_TOKENS;

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
  if (interpret("What is the weather?") !== "escalate") failures.push("escalate intent");

  return failures;
}
