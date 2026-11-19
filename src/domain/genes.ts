export type Lang = "en" | "ar";

export type VariantClassification = "pathogenic" | "likely_pathogenic" | "vus";

export type InheritanceMode = "autosomal_recessive" | "x_linked" | "autosomal_dominant";

export type Finding = {
  gene: string;
  condition: Record<Lang, string>;
  body: Record<Lang, string>;
  simple: Record<Lang, string>;
  classification: VariantClassification;
  inheritance: InheritanceMode;
  variantNote?: string;
};

export type GeneCatalogEntry = {
  gene: string;
  inheritance: InheritanceMode;
  conditionName: Record<Lang, string>;
  conditionLine: Record<Lang, string>;
  aliases: string[];
  summary: Record<Lang, string>;
  ownBody: Record<Lang, string>;
  ownSimple: Record<Lang, string>;
  sharedBody: Record<Lang, string>;
};

function recessiveEntry(params: {
  gene: string;
  conditionEn: string;
  conditionAr: string;
  linkedEn: string;
  linkedAr: string;
  aliases: string[];
  effectEn: string;
  effectAr: string;
  ownBodyOverride?: Record<Lang, string>;
  ownSimpleOverride?: Record<Lang, string>;
  sharedOverride?: Record<Lang, string>;
}): GeneCatalogEntry {
  const {
    gene,
    conditionEn,
    conditionAr,
    linkedEn,
    linkedAr,
    aliases,
    effectEn,
    effectAr,
    ownBodyOverride,
    ownSimpleOverride,
    sharedOverride,
  } = params;
  return {
    gene,
    inheritance: "autosomal_recessive",
    conditionName: { en: conditionEn, ar: conditionAr },
    conditionLine: { en: linkedEn, ar: linkedAr },
    aliases: [gene.toLowerCase(), conditionEn.toLowerCase(), ...aliases.map((a) => a.toLowerCase())],
    summary: {
      en: `${gene} is linked to ${conditionEn} (${effectEn}). In autosomal recessive inheritance, a carrier has one altered copy and one working copy, is usually healthy, and a 1 in 4 pregnancy chance arises only when both parents carry a disease-causing change in ${gene}.`,
      ar: `يرتبط جين ${gene} بـ${conditionAr} (${effectAr}). في الوراثة الجسدية المتنحية يحمل الشخص السليم تغييراً في نسخة واحدة مع نسخة سليمة، ولا يظهر احتمال 1 من 4 في كل حمل إلا إذا كان الأبوان يحملان معاً تغييراً مسبباً للمرض في ${gene}.`,
    },
    ownBody: ownBodyOverride ?? {
      en: `The lab found that you carry a change in ${gene}, a gene linked to ${conditionEn} (${effectEn}). Carrying one altered copy does not mean you have ${conditionEn}, and it is not a diagnosis for you or any future child. Carriers are healthy. This finding stays private to you unless your partner carries a reportable change in ${gene} too and you both agree to share.`,
      ar: `وجد المختبر أنك تحمل تغييراً في جين ${gene} المرتبط بـ${conditionAr} (${effectAr}). حمل نسخة واحدة متغيرة لا يعني أنك مصاب بالحالة، وليس تشخيصاً لك ولا لأي طفل في المستقبل. الحامل شخص سليم. تبقى هذه النتيجة خاصة بك إلا إذا كان شريكك يحمل أيضاً تغييراً معتبراً في ${gene} ووافقتما معاً على المشاركة.`,
    },
    ownSimple: ownSimpleOverride ?? {
      en: `You carry a change in ${gene}. You are healthy. It only matters for a pregnancy if your partner carries a change in ${gene} too.`,
      ar: `تحمل تغييراً في ${gene}. أنت بصحة جيدة. لا يهم ذلك للحمل إلا إذا كان شريكك يحمل تغييراً في ${gene} أيضاً.`,
    },
    sharedBody: sharedOverride ?? {
      en: `You both carry a change in ${gene}. Neither of you is affected, but because you share it, each pregnancy independently has about a 1 in 4 (25%) chance that the baby inherits the change from both of you and has ${conditionEn}. There is about a 1 in 2 (50%) chance the baby is a healthy carrier like you, and about a 1 in 4 (25%) chance the baby inherits neither change. This is a chance for each pregnancy, not a diagnosis, and it does not decide anything about your marriage. A genetic counsellor will go through every option with you.`,
      ar: `كلاكما يحمل تغييراً في ${gene}. لا أحد منكما مصاب، لكن لأنكما تشتركان فيه، ففي كل حمل على حدة احتمال بنحو 1 من 4 (25%) أن يرث الطفل التغيير منكما معاً ويصاب بـ${conditionAr}، واحتمال بنحو 1 من 2 (50%) أن يكون حاملاً سليماً مثلكما، واحتمال بنحو 1 من 4 (25%) ألا يرث أياً من التغييرين. هذا احتمال في كل حمل وليس تشخيصاً، ولا يحسم شيئاً بشأن زواجكما. سيشرح لكما المستشار الوراثي جميع الخيارات.`,
    },
  };
}

export const GENE_CATALOG: Record<string, GeneCatalogEntry> = {
  USH2A: recessiveEntry({
    gene: "USH2A",
    conditionEn: "Usher syndrome type 2A",
    conditionAr: "متلازمة أوشر من النوع 2A",
    linkedEn: "Linked to Usher syndrome type 2A",
    linkedAr: "مرتبط بمتلازمة أوشر من النوع 2A",
    aliases: ["usher", "أوشر", "اوشر", "usher syndrome"],
    effectEn: "affects hearing from birth and sight over time",
    effectAr: "تؤثر في السمع منذ الولادة وفي البصر مع الوقت",
    ownBodyOverride: {
      en: "The lab found that you carry a change in a gene called USH2A. When a child inherits this change from both parents, it can cause Usher syndrome type 2A, which affects hearing from birth and sight over time. Carrying it does not mean you have the condition, and it is not a diagnosis for any future child. Carriers are healthy. It simply means the change is something you could pass on.",
      ar: "وجد المختبر أنك تحمل تغييراً في جين اسمه USH2A. إذا ورث الطفل هذا التغيير من الأبوين معاً، فقد يسبب متلازمة أوشر من النوع 2A التي تؤثر في السمع منذ الولادة وفي البصر مع الوقت. حملك له لا يعني أنك مصاب بالحالة، وليس تشخيصاً لأي طفل في المستقبل. الحامل شخص سليم، والأمر يعني فقط أن هذا التغيير قد ينتقل منك إلى أطفالك.",
    },
    ownSimpleOverride: {
      en: "You carry a gene change. You are healthy. It only matters if your partner carries the same one.",
      ar: "تحمل تغييراً في جين. أنت بصحة جيدة. لا يهم الأمر إلا إذا كان شريكك يحمل التغيير نفسه.",
    },
    sharedOverride: {
      en: "You both carry a change in USH2A. Neither of you is affected, but because you share it, each pregnancy has about a 1 in 4 chance that the baby inherits the change from both of you and has Usher syndrome type 2A. There is about a 1 in 2 chance the baby is a healthy carrier like you, and about a 1 in 4 chance the baby inherits neither change. This is a chance, not a diagnosis, and it does not decide anything about your marriage. A genetic counsellor will go through it with you.",
      ar: "كلاكما يحمل تغييراً في USH2A. لا أحد منكما مصاب، لكن لأنكما تشتركان فيه، ففي كل حمل احتمال بنحو 1 من 4 أن يرث الطفل التغيير منكما معاً ويصاب بمتلازمة أوشر من النوع 2A، واحتمال بنحو 1 من 2 أن يكون حاملاً سليماً مثلكما، واحتمال بنحو 1 من 4 ألا يرث أياً من التغييرين. هذا احتمال وليس تشخيصاً، ولا يحسم شيئاً بشأن زواجكما. سيشرحه لكما المستشار الوراثي بالتفصيل.",
    },
  }),
  GJB2: recessiveEntry({
    gene: "GJB2",
    conditionEn: "inherited sensorineural hearing loss",
    conditionAr: "ضعف السمع الحسي العصبي الوراثي",
    linkedEn: "Linked to inherited hearing loss",
    linkedAr: "مرتبط بضعف السمع الوراثي",
    aliases: ["hearing loss", "connexin 26", "connexin", "ضعف السمع", "فقدان السمع"],
    effectEn: "affects inner-ear hearing from childhood",
    effectAr: "يؤثر في سمع الأذن الداخلية منذ الطفولة",
    ownBodyOverride: {
      en: "You also carry a change in GJB2, a gene linked to some kinds of inherited hearing loss. You do not have hearing loss because of it. This result stays private to you. It would only ever appear in your shared result if your partner carried a change in the same gene and you had both agreed to share.",
      ar: "تحمل أيضاً تغييراً في GJB2، وهو جين مرتبط ببعض أنواع ضعف السمع الوراثي. هذا لا يعني أنك تعاني ضعف السمع. تبقى هذه النتيجة خاصة بك، ولن تظهر في نتيجتكما المشتركة إلا إذا كان شريكك يحمل تغييراً في الجين نفسه ووافقتما معاً على المشاركة.",
    },
    ownSimpleOverride: {
      en: "You carry a second gene change. You are healthy. This one stays private to you.",
      ar: "تحمل تغييراً ثانياً. أنت بصحة جيدة. هذه النتيجة تبقى خاصة بك.",
    },
  }),
  MEFV: recessiveEntry({
    gene: "MEFV",
    conditionEn: "familial Mediterranean fever",
    conditionAr: "حمى البحر الأبيض المتوسط العائلية",
    linkedEn: "Linked to familial Mediterranean fever",
    linkedAr: "مرتبط بحمى البحر الأبيض المتوسط العائلية",
    aliases: ["mediterranean fever", "fmf", "حمى البحر الأبيض المتوسط", "حمى البحر المتوسط", "حمي البحر"],
    effectEn: "causes recurrent episodes of fever and inflammation when inherited",
    effectAr: "تسبب نوبات متكررة من الحمى والالتهاب عند وراثتها",
    ownBodyOverride: {
      en: "You also carry a change in MEFV, a gene linked to familial Mediterranean fever. Having this change is not the same as having the illness, and a genetic counsellor can explain what this particular change means for you. It stays private to you.",
      ar: "تحمل أيضاً تغييراً في MEFV، وهو جين مرتبط بحمى البحر الأبيض المتوسط العائلية. وجود هذا التغيير ليس كالإصابة بالمرض، ويستطيع المستشار الوراثي أن يشرح لك ما يعنيه هذا التغيير تحديداً. تبقى هذه النتيجة خاصة بك.",
    },
    ownSimpleOverride: {
      en: "You carry a second gene change. A counsellor can tell you what it means for you. It stays private.",
      ar: "تحمل تغييراً ثانياً. يستطيع المستشار أن يشرح لك معناه. يبقى خاصاً بك.",
    },
  }),
  HBB: recessiveEntry({
    gene: "HBB",
    conditionEn: "beta-thalassemia or sickle cell condition",
    conditionAr: "بيتا ثلاسيميا أو أنيميا الخلايا المنجلية",
    linkedEn: "Linked to beta-thalassemia and haemoglobin traits",
    linkedAr: "مرتبط ببيتا ثلاسيميا واعتلالات الهيموغلوبين",
    aliases: ["thalassemia", "thalassaemia", "beta thalassemia", "sickle cell", "ثلاسيميا", "الثلاسيميا", "بيتا ثلاسيميا", "المنجلية", "فقر الدم المنجلي"],
    effectEn: "affects how red blood cells carry oxygen",
    effectAr: "تؤثر في قدرة كريات الدم الحمراء على حمل الأكسجين",
  }),
  HBA1: recessiveEntry({
    gene: "HBA1",
    conditionEn: "alpha-thalassemia",
    conditionAr: "ألفا ثلاسيميا",
    linkedEn: "Linked to alpha-thalassemia",
    linkedAr: "مرتبط بألفا ثلاسيميا",
    aliases: ["alpha thalassemia", "ألفا ثلاسيميا", "الفا ثلاسيميا"],
    effectEn: "affects alpha-globin production in red blood cells",
    effectAr: "تؤثر في إنتاج سلاسل ألفا في كريات الدم الحمراء",
  }),
  HBA2: recessiveEntry({
    gene: "HBA2",
    conditionEn: "alpha-thalassemia",
    conditionAr: "ألفا ثلاسيميا",
    linkedEn: "Linked to alpha-thalassemia",
    linkedAr: "مرتبط بألفا ثلاسيميا",
    aliases: ["alpha thalassemia", "ألفا ثلاسيميا", "الفا ثلاسيميا"],
    effectEn: "affects alpha-globin production in red blood cells",
    effectAr: "تؤثر في إنتاج سلاسل ألفا في كريات الدم الحمراء",
  }),
  SMN1: recessiveEntry({
    gene: "SMN1",
    conditionEn: "spinal muscular atrophy",
    conditionAr: "ضمور العضلات الشوكي",
    linkedEn: "Linked to spinal muscular atrophy (SMA)",
    linkedAr: "مرتبط بضمور العضلات الشوكي (SMA)",
    aliases: ["sma", "spinal muscular atrophy", "ضمور العضلات الشوكي", "ضمور العضلات"],
    effectEn: "affects motor nerves that control muscle strength",
    effectAr: "يؤثر في الأعصاب الحركية المسؤولة عن قوة العضلات",
  }),
  CFTR: recessiveEntry({
    gene: "CFTR",
    conditionEn: "cystic fibrosis",
    conditionAr: "التليف الكيسي",
    linkedEn: "Linked to cystic fibrosis",
    linkedAr: "مرتبط بالتليف الكيسي",
    aliases: ["cystic fibrosis", "التليف الكيسي", "تليف كيسي"],
    effectEn: "affects lungs and digestion",
    effectAr: "يؤثر في الرئتين والجهاز الهضمي",
  }),
  PAH: recessiveEntry({
    gene: "PAH",
    conditionEn: "phenylketonuria (PKU)",
    conditionAr: "بيلة الفينيل كيتون (PKU)",
    linkedEn: "Linked to phenylketonuria (PKU)",
    linkedAr: "مرتبط ببيلة الفينيل كيتون (PKU)",
    aliases: ["pku", "phenylketonuria", "فينيل كيتون", "بيلة الفينيل كيتون"],
    effectEn: "affects how the body breaks down the amino acid phenylalanine, manageable early with diet",
    effectAr: "تؤثر في استقلاب الحمض الأميني فينيل ألانين ويمكن التعامل معها مبكراً بالحمية",
  }),
  CYP21A2: recessiveEntry({
    gene: "CYP21A2",
    conditionEn: "congenital adrenal hyperplasia",
    conditionAr: "فرط تنسج الكظر الخلقي",
    linkedEn: "Linked to congenital adrenal hyperplasia",
    linkedAr: "مرتبط بفرط تنسج الكظر الخلقي",
    aliases: ["cah", "congenital adrenal hyperplasia", "فرط تنسج الكظر", "الغدة الكظرية"],
    effectEn: "affects hormone production by the adrenal glands",
    effectAr: "يؤثر في إفراز هرمونات الغدة الكظرية",
  }),
  ABCA4: recessiveEntry({
    gene: "ABCA4",
    conditionEn: "ABCA4-related retinal condition",
    conditionAr: "اعتلال الشبكية المرتبط بجين ABCA4",
    linkedEn: "Linked to inherited retinal conditions",
    linkedAr: "مرتبط باعتلالات الشبكية الوراثية",
    aliases: ["stargardt", "retinal", "ستارغاردت", "اعتلال الشبكية"],
    effectEn: "affects central vision over time",
    effectAr: "يؤثر في الرؤية المركزية مع مرور الوقت",
  }),
  HEXA: recessiveEntry({
    gene: "HEXA",
    conditionEn: "Tay-Sachs condition",
    conditionAr: "حالة تاي ساكس",
    linkedEn: "Linked to Tay-Sachs condition",
    linkedAr: "مرتبط بحالة تاي ساكس",
    aliases: ["tay-sachs", "tay sachs", "تاي ساكس"],
    effectEn: "affects nerve cells in the brain and spinal cord",
    effectAr: "تؤثر في الخلايا العصبية في الدماغ والحبل الشوكي",
  }),
  GAA: recessiveEntry({
    gene: "GAA",
    conditionEn: "Pompe condition (glycogen storage type II)",
    conditionAr: "حالة بومبي (خزن الغليكوجين من النوع الثاني)",
    linkedEn: "Linked to Pompe condition",
    linkedAr: "مرتبط بحالة بومبي",
    aliases: ["pompe", "glycogen storage", "بومبي"],
    effectEn: "affects muscle and heart glycogen breakdown",
    effectAr: "تؤثر في تفكيك الغليكوجين في العضلات والقلب",
  }),
  SLC26A4: recessiveEntry({
    gene: "SLC26A4",
    conditionEn: "Pendred syndrome and inherited hearing difference",
    conditionAr: "متلازمة بندرد وضعف السمع الوراثي",
    linkedEn: "Linked to Pendred syndrome",
    linkedAr: "مرتبط بمتلازمة بندرد",
    aliases: ["pendred", "بندرد"],
    effectEn: "can affect hearing and thyroid balance",
    effectAr: "قد تؤثر في السمع وتوازن الغدة الدرقية",
  }),
  ATP7B: recessiveEntry({
    gene: "ATP7B",
    conditionEn: "Wilson condition",
    conditionAr: "حالة ويلسون",
    linkedEn: "Linked to Wilson condition",
    linkedAr: "مرتبط بحالة ويلسون",
    aliases: ["wilson", "ويلسون"],
    effectEn: "affects how the body clears copper, treatable when identified early",
    effectAr: "تؤثر في تخلص الجسم من النحاس ويمكن علاجها عند اكتشافها مبكراً",
  }),
  BTD: recessiveEntry({
    gene: "BTD",
    conditionEn: "biotinidase deficiency",
    conditionAr: "نقص إنزيم البيوتينيداز",
    linkedEn: "Linked to biotinidase deficiency",
    linkedAr: "مرتبط بنقص إنزيم البيوتينيداز",
    aliases: ["biotinidase", "البيوتينيداز", "بيوتين"],
    effectEn: "affects biotin recycling, readily treated with oral biotin when detected early",
    effectAr: "يؤثر في تدوير فيتامين البيوتين ويسهل علاجه مبكراً بمكملات البيوتين",
  }),
  ASPA: recessiveEntry({
    gene: "ASPA",
    conditionEn: "Canavan condition",
    conditionAr: "حالة كانافان",
    linkedEn: "Linked to Canavan condition",
    linkedAr: "مرتبط بحالة كانافان",
    aliases: ["canavan", "كانافان"],
    effectEn: "affects white matter development in the nervous system",
    effectAr: "تؤثر في نمو المادة البيضاء في الجهاز العصبي",
  }),
  GALC: recessiveEntry({
    gene: "GALC",
    conditionEn: "Krabbe condition",
    conditionAr: "حالة كرابي",
    linkedEn: "Linked to Krabbe condition",
    linkedAr: "مرتبط بحالة كرابي",
    aliases: ["krabbe", "كرابي"],
    effectEn: "affects protective myelin around nerves",
    effectAr: "تؤثر في غلاف المايلين الواقي للأعصاب",
  }),
  G6PD: {
    gene: "G6PD",
    inheritance: "x_linked",
    conditionName: {
      en: "G6PD deficiency",
      ar: "نقص إنزيم G6PD (التفول)",
    },
    conditionLine: {
      en: "Linked to G6PD deficiency (X-linked)",
      ar: "مرتبط بنقص إنزيم G6PD (مرتبط بالكروموسوم X)",
    },
    aliases: ["g6pd", "favism", "التفول", "نقص انزيم", "نقص إنزيم g6pd"],
    summary: {
      en: "G6PD follows X-linked inheritance rather than the shared-parent autosomal recessive pattern. It can matter both for personal medicine/food triggers (such as fava beans or certain medicines) and for children independently of a partner’s result, so an accredited genetic counsellor explains it directly.",
      ar: "يتبع جين G6PD الوراثة المرتبطة بالكروموسوم X لا النمط الجسدي المتنحي المشترك بين الأبوين. وقد يهم الشخص نفسه تجاه بعض الأطعمة أو الأدوية (كالفول وبعض العقاقير) كما قد يهم الأبناء بغض النظر عن نتيجة الشريك، لذا يشرحه مستشار وراثي معتمد مباشرة.",
    },
    ownBody: {
      en: "The lab found an X-linked change in G6PD, linked to G6PD deficiency. Unlike autosomal recessive findings, X-linked inheritance does not require both partners to carry the same change, and it can also guide everyday precautions with certain medicines or foods. This result stays private to you, and Satr connects you directly with a genetic counsellor to talk through what it means for you and future pregnancies.",
      ar: "وجد المختبر تغييراً مرتبطاً بالكروموسوم X في جين G6PD المرتبط بنقص إنزيم G6PD. بخلاف النتائج الجسدية المتنحية، لا تشترط هذه الوراثة أن يحمل الشريكان التغيير نفسه، كما قد تفيد في احتياطات يومية مع بعض الأدوية أو الأطعمة. تبقى هذه النتيجة خاصة بك، ويوصلك ستر مباشرة بمستشار وراثي لشرح معناها لك وللحمل مستقبلاً.",
    },
    ownSimple: {
      en: "You carry a change in G6PD on the X chromosome. It stays private to you, and a genetic counsellor will explain what it means for you and your family.",
      ar: "تحمل تغييراً في جين G6PD على الكروموسوم X. تبقى النتيجة خاصة بك، وسيشرح لك المستشار الوراثي معناها لك ولأسرتك.",
    },
    sharedBody: {
      en: "G6PD is inherited on the X chromosome, so Satr does not use the 1-in-4 shared recessive calculation for it. A genetic counsellor will walk through the exact chance for sons and daughters with you.",
      ar: "يُورث جين G6PD على الكروموسوم X، لذلك لا يطبّق ستر عليه حساب 1 من 4 الخاص بالوراثة المتنحية المشتركة. سيشرح لكما المستشار الوراثي الاحتمال الدقيق للأبناء والبنات.",
    },
  },
  FMR1: {
    gene: "FMR1",
    inheritance: "x_linked",
    conditionName: {
      en: "FMR1 X-linked inheritance",
      ar: "الوراثة المرتبطة بالكروموسوم X لجين FMR1",
    },
    conditionLine: {
      en: "Linked to FMR1 (X-linked, specialist review)",
      ar: "مرتبط بجين FMR1 (مرتبط بـ X ويحتاج لمراجعة مختص)",
    },
    aliases: ["fmr1", "fragile x", "كروموسوم x الهش"],
    summary: {
      en: "FMR1 is an X-linked gene where exact repeat size determines potential chance in future generations independently of a partner’s carrier panel. An accredited genetic counsellor reviews the lab sizing with you.",
      ar: "جين FMR1 مرتبط بالكروموسوم X ويعتمد أثره على التفاصيل المخبرية الدقيقة بغض النظر عن فحص الشريك، لذا يراجعه معك مستشار وراثي معتمد.",
    },
    ownBody: {
      en: "The lab reported an X-linked finding in FMR1. Because X-linked findings depend on specific laboratory details rather than whether both partners share the gene, this stays private to you and is routed directly to an accredited genetic counsellor.",
      ar: "أفاد المختبر بوجود نتيجة مرتبطة بالكروموسوم X في جين FMR1. ولأن تفسيرها يعتمد على التفاصيل المخبرية لا على اشتراك الشريكين في الجين، تبقى خاصة بك وتُحال مباشرة إلى مستشار وراثي معتمد.",
    },
    ownSimple: {
      en: "You have an X-linked finding in FMR1. It stays private to you, and a genetic counsellor will explain the details.",
      ar: "لديك نتيجة مرتبطة بالكروموسوم X في FMR1. تبقى خاصة بك، وسيشرح المستشار الوراثي تفاصيلها.",
    },
    sharedBody: {
      en: "FMR1 follows X-linked inheritance and requires specialist genetic counselling rather than a 1-in-4 couple calculation.",
      ar: "يتبع جين FMR1 الوراثة المرتبطة بالكروموسوم X ويحتاج إلى جلسة إرشاد وراثي متخصصة بدلاً من حساب 1 من 4.",
    },
  },
};

export const CATALOG_GENES = Object.keys(GENE_CATALOG);

export function normalizeGeneSymbol(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
}

export function lookupGeneCatalog(symbolOrQuery: string): GeneCatalogEntry | undefined {
  const clean = normalizeGeneSymbol(symbolOrQuery);
  if (clean && GENE_CATALOG[clean]) return GENE_CATALOG[clean];
  const lower = symbolOrQuery.toLowerCase().trim();
  if (!lower) return undefined;
  return Object.values(GENE_CATALOG).find((entry) =>
    entry.aliases.some((alias) => alias.length >= 3 && lower.includes(alias)),
  );
}

export function findMentionedGeneInText(rawText: string, extraGenes: string[] = []): string | undefined {
  const upperTokens = rawText.toUpperCase().split(/[^A-Z0-9-]+/).filter(Boolean);
  const candidates = new Set([...CATALOG_GENES, ...extraGenes.map(normalizeGeneSymbol)]);
  for (const tok of upperTokens) {
    if (candidates.has(tok)) return tok;
  }
  const byAlias = lookupGeneCatalog(rawText);
  return byAlias?.gene;
}

export type FindingInput = {
  gene: string;
  classification?: VariantClassification;
  inheritance?: InheritanceMode;
  conditionEn?: string;
  conditionAr?: string;
  variantNote?: string;
};

export function buildFinding(input: FindingInput): Finding {
  const gene = normalizeGeneSymbol(input.gene) || "PANEL-GENE";
  const catalog = GENE_CATALOG[gene];
  const classification: VariantClassification = input.classification ?? "pathogenic";
  const inheritance: InheritanceMode = input.inheritance ?? catalog?.inheritance ?? "autosomal_recessive";

  const conditionEn = input.conditionEn?.trim() || catalog?.conditionLine.en || `Linked to ${gene}-related inherited condition`;
  const conditionAr = input.conditionAr?.trim() || catalog?.conditionLine.ar || `مرتبط بحالة وراثية متعلقة بجين ${gene}`;

  if (classification === "vus") {
    const condNameEn = catalog?.conditionName.en ?? `${gene}-related condition`;
    const condNameAr = catalog?.conditionName.ar ?? `الحالة المرتبطة بجين ${gene}`;
    return {
      gene,
      classification: "vus",
      inheritance,
      variantNote: input.variantNote,
      condition: {
        en: `${conditionEn} · Variant of uncertain significance`,
        ar: `${conditionAr} · تغيير غير محسوم الأهمية`,
      },
      body: {
        en: `The lab noted a variant of uncertain significance (VUS) in ${gene} (${condNameEn}). Uncertain means current medical evidence cannot classify this change as disease-causing or harmless. It is never treated as a confirmed risk or a diagnosis, it is excluded from couple risk figures, it stays private to you, and a genetic counsellor reviews it with you.`,
        ar: `رصد المختبر تغييراً غير محسوم الأهمية (VUS) في جين ${gene} (${condNameAr}). غير محسوم يعني أن الأدلة الطبية الحالية لا تصنفه مسبباً للمرض ولا طبيعياً. لا يُعامل أبداً كخطر مؤكد أو تشخيص، ولا يدخل في حسابات الزوجين، ويبقى خاصاً بك ويراجعه معك المستشار الوراثي.`,
      },
      simple: {
        en: `The lab found an uncertain change in ${gene}. It is not a diagnosis or a confirmed risk. It stays private, and a genetic counsellor will review it.`,
        ar: `وجد المختبر تغييراً غير محسوم في ${gene}. ليس تشخيصاً ولا خطراً مؤكداً. يبقى خاصاً بك وسيراجعه المستشار الوراثي.`,
      },
    };
  }

  if (inheritance === "autosomal_dominant") {
    return {
      gene,
      classification,
      inheritance: "autosomal_dominant",
      variantNote: input.variantNote,
      condition: {
        en: `${conditionEn} · Specialist counselling`,
        ar: `${conditionAr} · إرشاد وراثي متخصص`,
      },
      body: {
        en: `The lab reported a change in ${gene} that follows autosomal dominant inheritance. Unlike recessive carrier findings, this can be relevant to your own healthcare as well as future pregnancies regardless of your partner’s panel. It stays private to you, and Satr routes you directly to an accredited genetic counsellor.`,
        ar: `أفاد المختبر بوجود تغيير في جين ${gene} يتبع الوراثة الجسدية السائدة. بخلاف نتائج الحمل المتنحي، قد يهم هذا التغيير صحتك الشخصية إضافة إلى الحمل مستقبلاً بغض النظر عن فحص الشريك. يبقى خاصاً بك ويوصلك ستر مباشرة بمستشار وراثي معتمد.`,
      },
      simple: {
        en: `You have a finding in ${gene} that needs specialist review. It stays private to you, and a genetic counsellor will explain it.`,
        ar: `لديك نتيجة في ${gene} تحتاج إلى مراجعة مختص. تبقى خاصة بك وسيشرحها لك المستشار الوراثي.`,
      },
    };
  }

  if (catalog) {
    return {
      gene,
      classification,
      inheritance: catalog.inheritance,
      variantNote: input.variantNote,
      condition: catalog.conditionLine,
      body: catalog.ownBody,
      simple: catalog.ownSimple,
    };
  }

  if (inheritance === "x_linked") {
    return {
      gene,
      classification,
      inheritance: "x_linked",
      variantNote: input.variantNote,
      condition: { en: `${conditionEn} (X-linked)`, ar: `${conditionAr} (مرتبط بالكروموسوم X)` },
      body: {
        en: `The lab found an X-linked change in ${gene}. Because X-linked inheritance works differently from shared autosomal recessive genes, this result stays private to you and an accredited genetic counsellor will explain what it means for you and future pregnancies.`,
        ar: `وجد المختبر تغييراً مرتبطاً بالكروموسوم X في جين ${gene}. ولأن هذه الوراثة تختلف عن الجينات المتنحية المشتركة، تبقى النتيجة خاصة بك وسيشرح لك مستشار وراثي معتمد معناها لك وللحمل مستقبلاً.`,
      },
      simple: {
        en: `You carry an X-linked change in ${gene}. It stays private, and a genetic counsellor will explain it.`,
        ar: `تحمل تغييراً مرتبطاً بالكروموسوم X في ${gene}. يبقى خاصاً بك وسيشرحه المستشار الوراثي.`,
      },
    };
  }

  const fallback = recessiveEntry({
    gene,
    conditionEn: input.conditionEn?.trim() || `${gene}-related inherited condition`,
    conditionAr: input.conditionAr?.trim() || `الحالة الوراثية المرتبطة بجين ${gene}`,
    linkedEn: conditionEn,
    linkedAr: conditionAr,
    aliases: [gene],
    effectEn: "an autosomal recessive condition on the screening panel",
    effectAr: "حالة جسدية متنحية ضمن لوحة الفحص",
  });

  return {
    gene,
    classification,
    inheritance: "autosomal_recessive",
    variantNote: input.variantNote,
    condition: fallback.conditionLine,
    body: fallback.ownBody,
    simple: fallback.ownSimple,
  };
}

export function sharedGeneExplanation(gene: string, lang: Lang, fallbackCondition?: string): string {
  const clean = normalizeGeneSymbol(gene);
  const catalog = GENE_CATALOG[clean];
  if (catalog) return catalog.sharedBody[lang];
  const cond = fallbackCondition || (lang === "ar" ? `الحالة المرتبطة بجين ${clean}` : `the condition linked to ${clean}`);
  if (lang === "ar") {
    return `كلاكما يحمل تغييراً في ${clean}. لا أحد منكما مصاب، لكن لأنكما تشتركان فيه، ففي كل حمل على حدة احتمال بنحو 1 من 4 أن يرث الطفل التغيير منكما معاً ويصاب بـ${cond}، واحتمال بنحو 1 من 2 أن يكون حاملاً سليماً مثلكما، واحتمال بنحو 1 من 4 ألا يرث أياً من التغييرين. هذا احتمال في كل حمل وليس تشخيصاً، ولا يحسم شيئاً بشأن زواجكما. سيشرحه لكما المستشار الوراثي.`;
  }
  return `You both carry a change in ${clean}. Neither of you is affected, but because you share it, each pregnancy independently has about a 1 in 4 chance that the baby inherits the change from both of you and has ${cond}. There is about a 1 in 2 chance the baby is a healthy carrier like you, and about a 1 in 4 chance the baby inherits neither change. This is a chance, not a diagnosis, and it does not decide anything about your marriage. A genetic counsellor will go through it with you.`;
}

export function allKnownSensitiveTokens(extraGenes: string[] = [], extraConditions: string[] = []): string[] {
  const set = new Set<string>();
  for (const entry of Object.values(GENE_CATALOG)) {
    set.add(entry.gene);
    for (const alias of entry.aliases) {
      if (alias.length >= 4) set.add(alias);
    }
  }
  for (const g of extraGenes) {
    const clean = normalizeGeneSymbol(g);
    if (clean.length >= 2) set.add(clean);
  }
  for (const cond of extraConditions) {
    const trimmed = cond.trim();
    if (trimmed.length >= 5) set.add(trimmed);
  }
  // Ensure historical short tokens checked by existing tests are always present
  for (const legacy of ["USH2A", "GJB2", "MEFV", "CYP21A2", "CFTR", "ABCA4", "HBB", "SMN1", "G6PD", "PAH", "Usher", "أوشر", "اوشر"]) {
    set.add(legacy);
  }
  return [...set];
}
