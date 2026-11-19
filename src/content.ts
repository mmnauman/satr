import {
  allCaseSensitiveTokens,
  analyzeCase,
  createDefaultLaylaOmarFiles,
  type CaseFiles,
  type Finding,
  type PersonFile,
  type PersonId,
} from "./domain/case";
import type { Lang } from "./domain/genes";
import { leakedTokens, patientForbidden, scoreAnswer, type Intent } from "./logic";

export type { CaseFiles, Finding, Lang, PersonFile, PersonId };

export const PEOPLE: CaseFiles = createDefaultLaylaOmarFiles();

export const TOGETHER: Record<string, Record<Lang, string>> = {
  USH2A: {
    en: "You both carry a change in USH2A. Neither of you is affected, but because you share it, each pregnancy has about a 1 in 4 chance that the baby inherits the change from both of you and has Usher syndrome type 2A. There is about a 1 in 2 chance the baby is a healthy carrier like you, and about a 1 in 4 chance the baby inherits neither change. This is a chance, not a diagnosis, and it does not decide anything about your marriage. A genetic counsellor will go through it with you.",
    ar: "كلاكما يحمل تغييراً في USH2A. لا أحد منكما مصاب، لكن لأنكما تشتركان فيه، ففي كل حمل احتمال بنحو 1 من 4 أن يرث الطفل التغيير منكما معاً ويصاب بمتلازمة أوشر من النوع 2A، واحتمال بنحو 1 من 2 أن يكون حاملاً سليماً مثلكما، واحتمال بنحو 1 من 4 ألا يرث أياً من التغييرين. هذا احتمال وليس تشخيصاً، ولا يحسم شيئاً بشأن زواجكما. سيشرحه لكما المستشار الوراثي بالتفصيل.",
  },
};

export type ClinicFile = {
  id: string;
  names: Record<Lang, string>;
  shared: string[];
  summary: Record<Lang, string>;
  uncertain: Record<Lang, string>;
  quotes: Record<Lang, string[]>;
};

export const TIER_TWO: ClinicFile = {
  id: "AD-19004",
  names: { en: "Mariam & Rashid", ar: "مريم وراشد" },
  shared: ["CYP21A2", "CFTR"],
  summary: {
    en: "They share changes in two genes, and Mariam also has a change the lab could not classify. This needs a full counselling session and a review by the screening committee, so Satr has not given them any figures.",
    ar: "يشتركان في تغييرات في جينين، ولدى مريم أيضاً تغيير لم يستطع المختبر تصنيفه. هذا يحتاج إلى جلسة إرشاد كاملة ومراجعة من لجنة الفحص، لذلك لم يعرض عليهما ستر أي أرقام.",
  },
  uncertain: {
    en: "Mariam’s uncertain change (ABCA4) is not shown to Rashid, and no chance is calculated for it.",
    ar: "التغيير غير المحسوم لدى مريم (ABCA4) لا يُعرض على راشد، ولا يُحسب له أي احتمال.",
  },
  quotes: {
    en: [
      "We both carry something, but that doesn’t make either of us ill.",
      "We only see the genes we both carry.",
      "The numbers are a chance for each pregnancy, not a certainty.",
    ],
    ar: [
      "كلانا يحمل شيئاً، لكن هذا لا يجعل أحدنا مريضاً.",
      "نرى فقط الجينات التي نحملها معاً.",
      "الأرقام احتمال في كل حمل، وليست أمراً مؤكداً.",
    ],
  },
};

export function partnerOf(id: PersonId, files: CaseFiles = PEOPLE): PersonFile {
  return files[files[id].partner];
}

export function reportable(id: PersonId, files: CaseFiles = PEOPLE): string[] {
  return files[id].findings
    .filter((f) => f.classification !== "vus" && f.inheritance === "autosomal_recessive")
    .map((f) => f.gene);
}

export function intersectionGenes(files: CaseFiles = PEOPLE): string[] {
  return analyzeCase(files).sharedGenes;
}

export function withheldCount(id: PersonId, files: CaseFiles = PEOPLE): number {
  const analysis = analyzeCase(files);
  return id === "layla" ? analysis.withheldA : analysis.withheldB;
}

const REPLIES: Record<string, Record<"before" | "after", Record<Lang, string>>> = {
  "refuse-marry": {
    before: {
      en: "That’s a decision only the two of you can make, and Satr won’t make it for you. What I can do is help you understand your results, and connect you with a genetic counsellor who can talk it through with you both. Whatever you decide is yours.",
      ar: "هذا قرار لا يملكه إلا أنتما، وستر لن يتخذه عنكما. ما أستطيعه هو مساعدتكما على فهم النتائج، وتوصيلكما بمستشار وراثي يناقش الأمر معكما. وأياً كان قراركما فهو لكما.",
    },
    after: {
      en: "That’s a decision only the two of you can make, and Satr won’t make it for you. Many couples who share a gene change marry and have healthy children, often with the help of the options a counsellor can explain. I’ve let your genetic counsellor know you’d like to talk about it.",
      ar: "هذا قرار لا يملكه إلا أنتما، وستر لن يتخذه عنكما. كثير من الأزواج الذين يشتركون في تغيير جيني يتزوجون وينجبون أطفالاً أصحاء، وغالباً بمساعدة خيارات يشرحها المستشار. أبلغت مستشاركما الوراثي أنكما ترغبان في الحديث عن ذلك.",
    },
  },
  "refuse-direct": {
    before: {
      en: "Choosing a medical path isn’t something Satr can advise on. A genetic counsellor can walk you through every option, including a confirmatory test, and, after marriage and with both your written consent, testing embryos at a licensed centre. None of these is required, and none is a recommendation.",
      ar: "اختيار مسار طبي ليس مما يستطيع ستر أن ينصح فيه. يستطيع المستشار الوراثي أن يشرح لكما كل الخيارات، ومنها الفحص التأكيدي، وبعد الزواج وبموافقتكما الخطية فحص الأجنة في مركز مرخص. لا شيء من ذلك إلزامي، ولا شيء منه توصية.",
    },
    after: {
      en: "Choosing a medical path isn’t something Satr can advise on. A genetic counsellor can walk you through every option, including a confirmatory test, and, after marriage and with both your written consent, testing embryos at a licensed centre. None of these is required, and none is a recommendation.",
      ar: "اختيار مسار طبي ليس مما يستطيع ستر أن ينصح فيه. يستطيع المستشار الوراثي أن يشرح لكما كل الخيارات، ومنها الفحص التأكيدي، وبعد الزواج وبموافقتكما الخطية فحص الأجنة في مركز مرخص. لا شيء من ذلك إلزامي، ولا شيء منه توصية.",
    },
  },
  risk: {
    before: {
      en: "You haven’t both agreed to share yet, so I can’t tell you whether any gene applies to you as a couple. In general, when two parents carry the same change, each pregnancy has about a 1 in 4 chance of the child being affected, a 1 in 2 chance of a healthy carrier, and a 1 in 4 chance of neither. A chance isn’t a diagnosis.",
      ar: "لم توافقا معاً على المشاركة بعد، لذلك لا أستطيع أن أقول إن كان أي جين ينطبق عليكما كزوجين. بشكل عام، عندما يحمل الأبوان التغيير نفسه، يكون في كل حمل احتمال بنحو 1 من 4 أن يصاب الطفل، و1 من 2 أن يكون حاملاً سليماً، و1 من 4 ألا يرث شيئاً. والاحتمال ليس تشخيصاً.",
    },
    after: {
      en: "For USH2A, the gene you both carry, each pregnancy has about a 1 in 4 chance that the baby is affected, about a 1 in 2 chance of a healthy carrier, and about a 1 in 4 chance of neither change. It’s a chance for each pregnancy, not a diagnosis, and it doesn’t decide anything about your marriage.",
      ar: "بالنسبة إلى USH2A، الجين الذي تحملانه معاً، في كل حمل احتمال بنحو 1 من 4 أن يصاب الطفل، ونحو 1 من 2 أن يكون حاملاً سليماً، ونحو 1 من 4 ألا يرث أي تغيير. هو احتمال في كل حمل وليس تشخيصاً، ولا يحسم شيئاً بشأن زواجكما.",
    },
  },
  sees: {
    before: {
      en: "Right now, your partner can’t see anything from your results. If you both agree to share, they will only see a gene that you both carry. Everything else stays private to you.",
      ar: "حالياً لا يستطيع شريكك رؤية أي شيء من نتائجك. إذا وافقتما معاً على المشاركة، فلن يرى إلا جيناً تحملانه كلاكما. وكل ما عدا ذلك يبقى خاصاً بك.",
    },
    after: {
      en: "Your partner can see one thing: that you both carry a change in USH2A. Your other result was never shared, and you can’t see theirs either.",
      ar: "يستطيع شريكك رؤية أمر واحد: أنكما تحملان تغييراً في USH2A. نتيجتك الأخرى لم تُشارك أبداً، وأنت أيضاً لا ترى نتيجته الأخرى.",
    },
  },
  options: {
    before: {
      en: "There are a few paths, and a genetic counsellor can explain each one without pushing you towards any of them: carry on with what you now know, ask for a confirmatory test, or, after marriage, talk to a licensed centre about testing embryos. You don’t have to choose any of them to marry.",
      ar: "هناك عدة مسارات، ويستطيع المستشار الوراثي أن يشرح كل واحد منها من دون أن يدفعكما نحو أي منها: المضي مع ما تعرفانه الآن، أو طلب فحص تأكيدي، أو بعد الزواج التحدث مع مركز مرخص عن فحص الأجنة. لستما مضطرين لاختيار أي منها كي تتزوجا.",
    },
    after: {
      en: "There are a few paths, and a genetic counsellor can explain each one without pushing you towards any of them: carry on with what you now know, ask for a confirmatory test, or, after marriage, talk to a licensed centre about testing embryos. You don’t have to choose any of them to marry.",
      ar: "هناك عدة مسارات، ويستطيع المستشار الوراثي أن يشرح كل واحد منها من دون أن يدفعكما نحو أي منها: المضي مع ما تعرفانه الآن، أو طلب فحص تأكيدي، أو بعد الزواج التحدث مع مركز مرخص عن فحص الأجنة. لستما مضطرين لاختيار أي منها كي تتزوجا.",
    },
  },
  invite: {
    before: {
      en: "Yes. Relatives can carry the same changes, so it can help them to get screened too. Satr can send a gentle note that doesn’t mention any gene, condition, or person, and their result will only ever go to them.",
      ar: "نعم. قد يحمل الأقارب التغييرات نفسها، لذا قد يفيدهم إجراء الفحص أيضاً. يستطيع ستر إرسال رسالة لطيفة لا تذكر أي جين أو حالة أو شخص، ونتيجتهم تذهب إليهم وحدهم.",
    },
    after: {
      en: "Yes. Relatives can carry the same changes, so it can help them to get screened too. Satr can send a gentle note that doesn’t mention any gene, condition, or person, and their result will only ever go to them.",
      ar: "نعم. قد يحمل الأقارب التغييرات نفسها، لذا قد يفيدهم إجراء الفحص أيضاً. يستطيع ستر إرسال رسالة لطيفة لا تذكر أي جين أو حالة أو شخص، ونتيجتهم تذهب إليهم وحدهم.",
    },
  },
  carrier: {
    before: {
      en: "Being a carrier means you have a change in one copy of a gene, but you’re healthy. Most people carry a few of these without ever knowing. It only matters for a pregnancy if your partner carries a change in the same gene.",
      ar: "أن تكون حاملاً يعني أن لديك تغييراً في نسخة واحدة من جين، لكنك بصحة جيدة. معظم الناس يحملون بعض هذه التغييرات دون أن يعرفوا. ولا يهم ذلك للحمل إلا إذا كان شريكك يحمل تغييراً في الجين نفسه.",
    },
    after: {
      en: "Being a carrier means you have a change in one copy of a gene, but you’re healthy. Most people carry a few of these without ever knowing. It only matters for a pregnancy if your partner carries a change in the same gene, which is what your shared result shows.",
      ar: "أن تكون حاملاً يعني أن لديك تغييراً في نسخة واحدة من جين، لكنك بصحة جيدة. معظم الناس يحملون بعض هذه التغييرات دون أن يعرفوا. ولا يهم ذلك للحمل إلا إذا كان شريكك يحمل تغييراً في الجين نفسه، وهذا ما تُظهره نتيجتكما المشتركة.",
    },
  },
  escalate: {
    before: {
      en: "That’s a good question for your genetic counsellor rather than for me. I don’t want to guess, so I’ve added it to your counselling notes and they’ll go through it with you.",
      ar: "هذا سؤال يجيب عنه مستشارك الوراثي أفضل مني. لا أريد أن أخمّن، لذلك أضفته إلى ملاحظات جلستك وسيناقشه معك.",
    },
    after: {
      en: "That’s a good question for your genetic counsellor rather than for me. I don’t want to guess, so I’ve added it to your counselling notes and they’ll go through it with you.",
      ar: "هذا سؤال يجيب عنه مستشارك الوراثي أفضل مني. لا أريد أن أخمّن، لذلك أضفته إلى ملاحظات جلستك وسيناقشه معك.",
    },
  },
};

export function reply(intent: Intent, compiled: boolean, lang: Lang): string {
  const bucket = REPLIES[intent] ?? REPLIES.escalate;
  return bucket[compiled ? "after" : "before"][lang];
}

export function replyLeaks(intent: Intent, compiled: boolean, lang: Lang): string[] {
  return leakedTokens(reply(intent, compiled, lang), patientForbidden(compiled));
}

export function inviteText(lang: Lang, fromName?: string): string {
  if (lang === "ar") {
    const opener = fromName ? `${fromName} يريدك أن تعرف أن` : "أحد أفراد عائلتك يريدك أن تعرف أن";
    return `${opener} الفحص الجيني قبل الزواج وقبل الحمل متاح لك بسرية تامة. نتيجتك تذهب إليك وحدك، ولا يعرفها أحد إلا بإذنك. يمكنك حجز موعد متى شئت.`;
  }
  const opener = fromName ? `${fromName} wanted you to know` : "Someone in your family wanted you to know";
  return `${opener} that genetic screening before marriage or pregnancy is available to you, completely privately. Your result goes only to you, and no one else sees it unless you choose. You can book whenever you’re ready.`;
}

export type CourtStatus = { explained: boolean; released: boolean };

export function courtRows(
  status: CourtStatus,
  lang: Lang,
  files: CaseFiles = PEOPLE,
): { label: string; value: string }[] {
  const numA = files.layla.number || "AD-18421";
  const numB = files.omar.number || "AD-18422";
  const ref = `PMS-${numA}-${numB}`;
  if (lang === "ar") {
    return [
      { label: "المتقدمان", value: `${numA} و ${numB}` },
      { label: "الفحص المخبري", value: "اكتمل (لوحة من 570 جيناً)" },
      { label: "فهم النتيجة", value: status.explained ? "شرح كل منهما النتيجة بكلماته" : "لم يكتمل بعد" },
      { label: "جلسة الإرشاد الوراثي", value: status.released ? "تمت مع مستشار معتمد" : "بانتظار الجلسة" },
      { label: "الشهادة", value: status.released ? "صادرة، وصالحة ثلاثة أشهر" : "لم تصدر بعد" },
      { label: "الرقم المرجعي", value: status.released ? ref : "—" },
    ];
  }
  return [
    { label: "Applicants", value: `${numA} and ${numB}` },
    { label: "Laboratory screening", value: "Complete (570-gene panel)" },
    { label: "Result understood", value: status.explained ? "Each person explained it in their own words" : "Not yet complete" },
    { label: "Genetic counselling", value: status.released ? "Completed with an accredited counsellor" : "Waiting for the session" },
    { label: "Certificate", value: status.released ? "Issued, valid for three months" : "Not issued yet" },
    { label: "Reference", value: status.released ? ref : "—" },
  ];
}

export function prompts(id: PersonId, lang: Lang, files: CaseFiles = PEOPLE): [string, string, string] {
  const other = partnerOf(id, files).name[lang];
  const ownCount = files[id].findings.length;
  const sharedCount = intersectionGenes(files).length;
  if (lang === "ar") {
    return [
      ownCount === 0
        ? "بكلماتك أنت: ماذا يعني أن لوحتك لم تُظهر حمل تغيير مسبب للمرض، وما معنى أن يكون الإنسان حاملاً سليماً؟"
        : "بكلماتك أنت: ماذا يعني أنك تحمل تغييراً في جين؟",
      `ماذا يستطيع ${other} أن يرى من نتائجك، وماذا يبقى خاصاً بك؟`,
      sharedCount === 0
        ? "ماذا يعني عدم وجود جين مشترك بينكما في اللوحة، وهل يلغي ذلك كل احتمال أساسي في الحمل؟"
        : "ماذا يعني احتمال واحد من أربعة، وما الذي لا يعنيه؟",
    ];
  }
  return [
    ownCount === 0
      ? "In your own words, what does being a healthy carrier mean, even when your own panel had no reportable change?"
      : "In your own words, what does it mean that you carry a gene change?",
    `What can ${other} see from your results, and what stays private to you?`,
    sharedCount === 0
      ? "What does having no shared gene on the panel mean, and why does a small baseline pregnancy chance still remain?"
      : "What does a 1 in 4 chance mean, and what doesn’t it mean?",
  ];
}

export function passingSample(id: PersonId, step: 0 | 1 | 2, lang: Lang, files: CaseFiles = PEOPLE): string {
  const other = partnerOf(id, files).name[lang];
  const sharedCount = intersectionGenes(files).length;
  if (lang === "ar") {
    if (step === 0) return "أحمل تغييراً في جين، وهذا لا يعني أني مصاب بالمرض، وليس تشخيصاً.";
    if (step === 1) {
      const verb = id === "layla" ? "يرى" : "ترى";
      return `${other} ${verb} فقط الجين الذي نحمله معاً. لا ${verb} نتيجتي الأخرى.`;
    }
    if (sharedCount === 0) {
      return "عدم وجود جين مشترك أمر مطمئن، لكن الفحص يقلل الاحتمال ولا يلغي كل احتمال أساسي في كل حمل وليس أمراً مؤكداً.";
    }
    return "واحد من أربعة احتمال في كل حمل، وليس أمراً مؤكداً ولا تشخيصاً لطفل.";
  }
  if (step === 0) return "I carry a change in a gene, but I do not have the condition myself. It is not a diagnosis.";
  if (step === 1) {
    const pronoun = id === "layla" ? "He" : "She";
    return `${other} only sees the gene we both carry. ${pronoun} does not see my other result.`;
  }
  if (sharedCount === 0) {
    return "Having no shared gene lowers risk, though a small baseline chance remains in each pregnancy and it is not a certainty.";
  }
  return "One in four is a chance for each pregnancy. It is not a certainty and not a diagnosis.";
}

export function harmfulSample(lang: Lang): string {
  return lang === "ar" ? "عندي المرض ولازم ما نتزوج." : "I have the disease and we should not get married.";
}

export function runContentChecks(): string[] {
  const bad: string[] = [];
  const tokens = allCaseSensitiveTokens(PEOPLE);
  const intents: Intent[] = ["refuse-marry", "refuse-direct", "risk", "sees", "options", "invite", "carrier", "escalate"];
  for (const intent of intents) {
    for (const lang of ["en", "ar"] as const) {
      const before = replyLeaks(intent, false, lang);
      const after = replyLeaks(intent, true, lang);
      if (before.length) bad.push(`reply before ${intent} ${lang}: ${before.join(",")}`);
      if (after.length) bad.push(`reply after ${intent} ${lang}: ${after.join(",")}`);
    }
  }
  for (const lang of ["en", "ar"] as const) {
    for (const from of [undefined, PEOPLE.layla.name[lang]]) {
      const invite = leakedTokens(inviteText(lang, from), tokens);
      if (invite.length) bad.push(`invite ${lang}: ${invite.join(",")}`);
    }
    for (const released of [false, true]) {
      const text = courtRows({ explained: released, released }, lang)
        .map((row) => `${row.label} ${row.value}`)
        .join(" ");
      const found = leakedTokens(text, tokens);
      if (found.length) bad.push(`court ${lang} ${released}: ${found.join(",")}`);
    }
  }
  for (const id of ["layla", "omar"] as const) {
    for (const step of [0, 1, 2] as const) {
      for (const lang of ["en", "ar"] as const) {
        const got = scoreAnswer(step, passingSample(id, step, lang));
        if (!got.pass) bad.push(`sample ${id} ${step} ${lang}: ${got.reason}`);
      }
    }
  }
  for (const lang of ["en", "ar"] as const) {
    const got = scoreAnswer(0, harmfulSample(lang));
    if (got.pass || got.reason !== "carrier-ill") bad.push(`harm ${lang}: ${got.reason}`);
  }
  return bad;
}
