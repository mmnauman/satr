import type { Lang } from "./strings";
import { ALL_GENE_TOKENS, leakedTokens, patientForbidden, scoreAnswer, type Intent } from "./logic";

export type { Lang };

export type PersonId = "layla" | "omar";

export type Finding = {
  gene: string;
  condition: Record<Lang, string>;
  body: Record<Lang, string>;
  simple: Record<Lang, string>;
  classification: "pathogenic" | "likely_pathogenic" | "vus";
};

export type PersonFile = {
  id: PersonId;
  name: Record<Lang, string>;
  initial: Record<Lang, string>;
  partner: PersonId;
  number: string;
  findings: Finding[];
};

const ush2aBody = (you: Record<Lang, string>) => ({
  en: `The lab found that you carry a change in a gene called USH2A. When a child inherits this change from both parents, it can cause Usher syndrome type 2A, which affects hearing from birth and sight over time. ${you.en} Carriers are healthy. It simply means the change is something you could pass on.`,
  ar: `وجد المختبر أنك تحمل تغييراً في جين اسمه USH2A. إذا ورث الطفل هذا التغيير من الأبوين معاً، فقد يسبب متلازمة أوشر من النوع 2A التي تؤثر في السمع منذ الولادة وفي البصر مع الوقت. ${you.ar} الحامل شخص سليم، والأمر يعني فقط أن هذا التغيير قد ينتقل منك إلى أطفالك.`,
});

const ush2aSimple = {
  en: "You carry a gene change. You are healthy. It only matters if your partner carries the same one.",
  ar: "تحمل تغييراً في جين. أنت بصحة جيدة. لا يهم الأمر إلا إذا كان شريكك يحمل التغيير نفسه.",
};

const ush2aCondition = { en: "Linked to Usher syndrome type 2A", ar: "مرتبط بمتلازمة أوشر من النوع 2A" };

export const PEOPLE: Record<PersonId, PersonFile> = {
  layla: {
    id: "layla",
    name: { en: "Layla", ar: "ليلى" },
    initial: { en: "L", ar: "ل" },
    partner: "omar",
    number: "AD-18421",
    findings: [
      {
        gene: "USH2A",
        classification: "pathogenic",
        condition: ush2aCondition,
        simple: ush2aSimple,
        body: ush2aBody({
          en: "Carrying it does not mean you have the condition, and it is not a diagnosis for any future child.",
          ar: "حملك له لا يعني أنك مصابة بالحالة، وليس تشخيصاً لأي طفل في المستقبل.",
        }),
      },
      {
        gene: "GJB2",
        classification: "pathogenic",
        condition: { en: "Linked to inherited hearing loss", ar: "مرتبط بضعف السمع الوراثي" },
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
    findings: [
      {
        gene: "USH2A",
        classification: "pathogenic",
        condition: ush2aCondition,
        simple: ush2aSimple,
        body: ush2aBody({
          en: "Carrying it does not mean you have the condition, and it is not a diagnosis for any future child.",
          ar: "حملك له لا يعني أنك مصاب بالحالة، وليس تشخيصاً لأي طفل في المستقبل.",
        }),
      },
      {
        gene: "MEFV",
        classification: "pathogenic",
        condition: { en: "Linked to familial Mediterranean fever", ar: "مرتبط بحمى البحر الأبيض المتوسط العائلية" },
        simple: {
          en: "You carry a second gene change. A counsellor can tell you what it means for you. It stays private.",
          ar: "تحمل تغييراً ثانياً. يستطيع المستشار أن يشرح لك معناه. يبقى خاصاً بك.",
        },
        body: {
          en: "You also carry a change in MEFV, a gene linked to familial Mediterranean fever. Having this change is not the same as having the illness, and a genetic counsellor can explain what this particular change means for you. It stays private to you.",
          ar: "تحمل أيضاً تغييراً في MEFV، وهو جين مرتبط بحمى البحر الأبيض المتوسط العائلية. وجود هذا التغيير ليس كالإصابة بالمرض، ويستطيع المستشار الوراثي أن يشرح لك ما يعنيه هذا التغيير تحديداً. تبقى هذه النتيجة خاصة بك.",
        },
      },
    ],
  },
};

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

export function partnerOf(id: PersonId): PersonFile {
  return PEOPLE[PEOPLE[id].partner];
}

export function reportable(id: PersonId): string[] {
  return PEOPLE[id].findings.filter((f) => f.classification !== "vus").map((f) => f.gene);
}

export function intersectionGenes(): string[] {
  const layla = new Set(reportable("layla"));
  return reportable("omar").filter((gene) => layla.has(gene));
}

export function withheldCount(id: PersonId): number {
  const shared = new Set(intersectionGenes());
  return PEOPLE[id].findings.filter((f) => !shared.has(f.gene)).length;
}

const REPLIES: Record<Intent, Record<"before" | "after", Record<Lang, string>>> = {
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
  return REPLIES[intent][compiled ? "after" : "before"][lang];
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

export function courtRows(status: CourtStatus, lang: Lang): { label: string; value: string }[] {
  if (lang === "ar") {
    return [
      { label: "المتقدمان", value: "AD-18421 و AD-18422" },
      { label: "الفحص المخبري", value: "اكتمل (لوحة من 570 جيناً)" },
      { label: "فهم النتيجة", value: status.explained ? "شرح كل منهما النتيجة بكلماته" : "لم يكتمل بعد" },
      { label: "جلسة الإرشاد الوراثي", value: status.released ? "تمت مع مستشار معتمد" : "بانتظار الجلسة" },
      { label: "الشهادة", value: status.released ? "صادرة، وصالحة ثلاثة أشهر" : "لم تصدر بعد" },
      { label: "الرقم المرجعي", value: status.released ? "PMS-AD-18421-18422" : "—" },
    ];
  }
  return [
    { label: "Applicants", value: "AD-18421 and AD-18422" },
    { label: "Laboratory screening", value: "Complete (570-gene panel)" },
    { label: "Result understood", value: status.explained ? "Each person explained it in their own words" : "Not yet complete" },
    { label: "Genetic counselling", value: status.released ? "Completed with an accredited counsellor" : "Waiting for the session" },
    { label: "Certificate", value: status.released ? "Issued, valid for three months" : "Not issued yet" },
    { label: "Reference", value: status.released ? "PMS-AD-18421-18422" : "—" },
  ];
}

export function prompts(id: PersonId, lang: Lang): [string, string, string] {
  const other = partnerOf(id).name[lang];
  if (lang === "ar") {
    return [
      "بكلماتك أنت: ماذا يعني أنك تحمل تغييراً في جين؟",
      `ماذا يستطيع ${other} أن يرى من نتائجك، وماذا يبقى خاصاً بك؟`,
      "ماذا يعني احتمال واحد من أربعة، وما الذي لا يعنيه؟",
    ];
  }
  return [
    "In your own words, what does it mean that you carry a gene change?",
    `What can ${other} see from your results, and what stays private to you?`,
    "What does a 1 in 4 chance mean, and what doesn’t it mean?",
  ];
}

export function passingSample(id: PersonId, step: 0 | 1 | 2, lang: Lang): string {
  const other = partnerOf(id).name[lang];
  if (lang === "ar") {
    if (step === 0) return "أحمل تغييراً في جين، وهذا لا يعني أني مصاب بالمرض، وليس تشخيصاً.";
    if (step === 1) {
      const verb = id === "layla" ? "يرى" : "ترى";
      return `${other} ${verb} فقط الجين الذي نحمله معاً. لا ${verb} نتيجتي الأخرى.`;
    }
    return "واحد من أربعة احتمال في كل حمل، وليس أمراً مؤكداً ولا تشخيصاً لطفل.";
  }
  if (step === 0) return "I carry a change in a gene, but I do not have the condition myself. It is not a diagnosis.";
  if (step === 1) {
    const pronoun = id === "layla" ? "He" : "She";
    return `${other} only sees the gene we both carry. ${pronoun} does not see my other result.`;
  }
  return "One in four is a chance for each pregnancy. It is not a certainty and not a diagnosis.";
}

export function harmfulSample(lang: Lang): string {
  return lang === "ar" ? "عندي المرض ولازم ما نتزوج." : "I have the disease and we should not get married.";
}

export function runContentChecks(): string[] {
  const bad: string[] = [];
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
      const invite = leakedTokens(inviteText(lang, from), ALL_GENE_TOKENS);
      if (invite.length) bad.push(`invite ${lang}: ${invite.join(",")}`);
    }
    for (const released of [false, true]) {
      const text = courtRows({ explained: released, released }, lang)
        .map((row) => `${row.label} ${row.value}`)
        .join(" ");
      const found = leakedTokens(text, ALL_GENE_TOKENS);
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
