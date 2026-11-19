import {
  allKnownSensitiveTokens,
  buildFinding,
  CATALOG_GENES,
  GENE_CATALOG,
  normalizeGeneSymbol,
  type Finding,
  type FindingInput,
  type InheritanceMode,
  type Lang,
  type VariantClassification,
} from "../domain/genes.js";

export type ParsedReport = {
  nameEn?: string;
  nameAr?: string;
  number?: string;
  sourceLabel: string;
  findings: Finding[];
  warnings: Record<Lang, string>[];
};

export interface ReportParserAdapter {
  parseText(content: string, fileName?: string): ParsedReport;
}

const KNOWN_SENSITIVE_LOWER = new Set(allKnownSensitiveTokens().map((t) => t.toLowerCase()));

export function sanitizeScreeningNumber(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 18);
  if (!cleaned) return fallback;
  // Never allow a gene symbol inside a screening reference number (which appears on court certificates)
  for (const token of KNOWN_SENSITIVE_LOWER) {
    if (token.length >= 3 && cleaned.toLowerCase().includes(token)) {
      return fallback;
    }
  }
  return cleaned;
}

function parseClassification(raw: string | undefined): VariantClassification | "benign" {
  if (!raw) return "pathogenic";
  const s = raw.toLowerCase().trim().replace(/[_-]+/g, " ");
  if (s.includes("likely benign") || s === "benign" || s === "lb" || s === "b" || s.includes("normal")) {
    return "benign";
  }
  if (s.includes("vus") || s.includes("uncertain") || s.includes("inconclusive") || s.includes("غير محسوم")) {
    return "vus";
  }
  if (s.includes("likely pathogenic") || s === "lp") {
    return "likely_pathogenic";
  }
  return "pathogenic";
}

function parseInheritance(raw: string | undefined, gene: string): InheritanceMode {
  const cat = GENE_CATALOG[normalizeGeneSymbol(gene)];
  if (!raw) return cat?.inheritance ?? "autosomal_recessive";
  const s = raw.toLowerCase().trim().replace(/[_-]+/g, " ");
  if (s.includes("x linked") || s.includes("x-linked") || s === "xl" || s.includes("كروموسوم x")) {
    return "x_linked";
  }
  if (s.includes("dominant") || s === "ad" || s.includes("سائد")) {
    return "autosomal_dominant";
  }
  return "autosomal_recessive";
}

function dedupeFindings(inputs: FindingInput[]): Finding[] {
  const rank: Record<VariantClassification, number> = {
    pathogenic: 3,
    likely_pathogenic: 2,
    vus: 1,
  };
  const byGene = new Map<string, FindingInput>();
  for (const item of inputs) {
    const gene = normalizeGeneSymbol(item.gene);
    if (!gene || gene.length < 2 || gene.length > 14) continue;
    const prev = byGene.get(gene);
    const nextClass = item.classification ?? "pathogenic";
    const prevClass = prev?.classification ?? "pathogenic";
    if (!prev || rank[nextClass] >= rank[prevClass]) {
      byGene.set(gene, { ...item, gene });
    }
  }
  return [...byGene.values()].map(buildFinding);
}

function checkOutOfScope(raw: string): Record<Lang, string>[] {
  const lower = raw.toLowerCase();
  if (lower.includes("polygenic") || lower.includes("prs_score") || lower.includes("lifetime_risk_score")) {
    return [
      {
        en: "Polygenic or lifetime risk scores were ignored. Satr only processes premarital and preconception carrier findings.",
        ar: "تم تجاهل درجات المخاطر المتعددة الجينات أو التوقعات العمرية؛ يعالج ستر فقط نتائج فحص الحامل قبل الزواج وقبل الحمل.",
      },
    ];
  }
  return [];
}

function parseJsonReport(content: string, sourceLabel: string): ParsedReport {
  const warnings = checkOutOfScope(content);
  const data = JSON.parse(content) as Record<string, unknown>;

  // FHIR-lite DiagnosticReport or Bundle support
  if (data.resourceType === "DiagnosticReport" || data.resourceType === "Bundle") {
    const subject = (data.subject as Record<string, unknown> | undefined) ?? {};
    const nameEn = typeof subject.display === "string" ? subject.display : undefined;
    const number = typeof data.id === "string" ? data.id : undefined;
    const entries: unknown[] = Array.isArray(data.observations)
      ? data.observations
      : Array.isArray(data.entry)
        ? data.entry
        : [];
    const inputs: FindingInput[] = [];
    for (const rawEntry of entries) {
      const obs = ((rawEntry as Record<string, unknown>)?.resource ?? rawEntry) as Record<string, unknown>;
      if (!obs || typeof obs !== "object") continue;
      const gene = String(obs.gene ?? obs.geneSymbol ?? obs.code ?? "");
      const cls = parseClassification(typeof obs.classification === "string" ? obs.classification : typeof obs.clinicalSignificance === "string" ? obs.clinicalSignificance : undefined);
      if (cls === "benign") continue;
      const inh = parseInheritance(typeof obs.inheritance === "string" ? obs.inheritance : undefined, gene);
      if (gene) {
        inputs.push({
          gene,
          classification: cls,
          inheritance: inh,
          conditionEn: typeof obs.condition === "string" ? obs.condition : undefined,
        });
      }
    }
    return { nameEn, number, sourceLabel, findings: dedupeFindings(inputs), warnings };
  }

  let nameEn: string | undefined;
  let nameAr: string | undefined;
  if (typeof data.name === "string") {
    nameEn = data.name;
  } else if (data.name && typeof data.name === "object") {
    const n = data.name as Record<string, unknown>;
    if (typeof n.en === "string") nameEn = n.en;
    if (typeof n.ar === "string") nameAr = n.ar;
  }
  if (typeof data.patientName === "string") nameEn = nameEn ?? data.patientName;
  const number = typeof data.number === "string" ? data.number : typeof data.screeningId === "string" ? data.screeningId : undefined;

  const rawList = Array.isArray(data.findings)
    ? data.findings
    : Array.isArray(data.variants)
      ? data.variants
      : Array.isArray(data.genes)
        ? data.genes
        : [];

  const inputs: FindingInput[] = [];
  for (const item of rawList) {
    if (typeof item === "string") {
      inputs.push({ gene: item, classification: "pathogenic" });
    } else if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      const gene = String(rec.gene ?? rec.symbol ?? "");
      const cls = parseClassification(typeof rec.classification === "string" ? rec.classification : typeof rec.significance === "string" ? rec.significance : undefined);
      if (cls === "benign") continue;
      const inh = parseInheritance(typeof rec.inheritance === "string" ? rec.inheritance : undefined, gene);
      inputs.push({
        gene,
        classification: cls,
        inheritance: inh,
        conditionEn: typeof rec.condition === "string" ? rec.condition : typeof rec.conditionEn === "string" ? rec.conditionEn : undefined,
        conditionAr: typeof rec.conditionAr === "string" ? rec.conditionAr : undefined,
        variantNote: typeof rec.variant === "string" ? rec.variant : undefined,
      });
    }
  }

  return { nameEn, nameAr, number, sourceLabel, findings: dedupeFindings(inputs), warnings };
}

function parseVcfReport(content: string, sourceLabel: string): ParsedReport {
  const warnings = checkOutOfScope(content);
  const lines = content.split(/\r?\n/);
  let nameEn: string | undefined;
  const inputs: FindingInput[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("##")) continue;
    if (line.startsWith("#CHROM")) {
      const cols = line.split(/\t|\s+/);
      if (cols[9]) nameEn = cols[9];
      continue;
    }
    const cols = line.split("\t");
    const info = cols[7] ?? line;
    const geneMatch = /(?:GENE|SYMBOL)=([A-Za-z0-9-]+)/i.exec(info);
    if (!geneMatch) continue;
    const gene = geneMatch[1];
    const sigMatch = /CLNSIG=([^;\s]+)/i.exec(info);
    const cls = parseClassification(sigMatch?.[1]);
    if (cls === "benign") continue;
    const inhMatch = /INH=([^;\s]+)/i.exec(info);
    inputs.push({
      gene,
      classification: cls,
      inheritance: parseInheritance(inhMatch?.[1], gene),
    });
  }

  return { nameEn, sourceLabel, findings: dedupeFindings(inputs), warnings };
}

function parseDelimitedOrTextReport(content: string, sourceLabel: string): ParsedReport {
  const warnings = checkOutOfScope(content);
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (lines.length === 0) {
    return { sourceLabel, findings: [], warnings };
  }

  const sep = lines[0].includes("\t") ? "\t" : ",";
  const firstCols = lines[0].split(sep).map((c) => c.trim().toLowerCase());
  const hasHeader =
    firstCols.includes("gene") || firstCols.includes("symbol") || firstCols.includes("classification");

  if (hasHeader && lines[0].includes(sep)) {
    const geneIdx = Math.max(firstCols.indexOf("gene"), firstCols.indexOf("symbol"));
    const clsIdx = firstCols.findIndex((c) => c.includes("class") || c.includes("sig"));
    const inhIdx = firstCols.findIndex((c) => c.includes("inher") || c.includes("mode"));
    const condIdx = firstCols.findIndex((c) => c.includes("cond") || c.includes("disease"));
    const nameIdx = firstCols.findIndex((c) => c === "name" || c === "patient");
    const idIdx = firstCols.findIndex((c) => c === "id" || c === "number" || c === "screening_id");

    let nameEn: string | undefined;
    let number: string | undefined;
    const inputs: FindingInput[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
      if (nameIdx >= 0 && cols[nameIdx] && !nameEn) nameEn = cols[nameIdx];
      if (idIdx >= 0 && cols[idIdx] && !number) number = cols[idIdx];
      const gene = cols[geneIdx >= 0 ? geneIdx : 0];
      if (!gene || /^(none|clear|negative|normal|-)$/i.test(gene)) continue;
      const cls = parseClassification(clsIdx >= 0 ? cols[clsIdx] : undefined);
      if (cls === "benign") continue;
      inputs.push({
        gene,
        classification: cls,
        inheritance: parseInheritance(inhIdx >= 0 ? cols[inhIdx] : undefined, gene),
        conditionEn: condIdx >= 0 ? cols[condIdx] : undefined,
      });
    }
    return { nameEn, number, sourceLabel, findings: dedupeFindings(inputs), warnings };
  }

  // Free-text or simple CSV rows without header
  const inputs: FindingInput[] = [];
  let nameEn: string | undefined;
  let number: string | undefined;
  const catalogSet = new Set(CATALOG_GENES);

  for (const line of lines) {
    const nameMatch = /^(?:patient|name|applicant)\s*:\s*(.+)$/i.exec(line);
    if (nameMatch) {
      nameEn = nameMatch[1].trim();
      continue;
    }
    const idMatch = /^(?:id|screening\s*id|number|file)\s*:\s*([A-Za-z0-9-]+)$/i.exec(line);
    if (idMatch) {
      number = idMatch[1].trim();
      continue;
    }
    if (/^(clear|negative|no reportable findings|none)$/i.test(line)) continue;

    if (line.includes(",") || line.includes("\t")) {
      const parts = line.split(/,|\t/).map((p) => p.trim());
      const maybeGene = normalizeGeneSymbol(parts[0] ?? "");
      if (maybeGene && /^[A-Z][A-Z0-9-]{1,11}$/.test(maybeGene)) {
        const cls = parseClassification(parts[1]);
        if (cls !== "benign") {
          inputs.push({
            gene: maybeGene,
            classification: cls,
            inheritance: parseInheritance(parts[2], maybeGene),
            conditionEn: parts[3],
          });
        }
        continue;
      }
    }

    // Token scan on free-text line
    const cls = parseClassification(line);
    if (cls === "benign") continue;
    const inh = parseInheritance(line, "");
    const tokens = line.split(/[^A-Za-z0-9-]+/).filter(Boolean);
    for (const rawTok of tokens) {
      const upper = rawTok.toUpperCase();
      if (catalogSet.has(upper) || (/^[A-Z]{2,6}[0-9][A-Z0-9]*$/.test(upper) && upper !== "TYPE2A")) {
        inputs.push({
          gene: upper,
          classification: cls,
          inheritance: GENE_CATALOG[upper]?.inheritance ?? inh,
        });
      }
    }
  }

  return { nameEn, number, sourceLabel, findings: dedupeFindings(inputs), warnings };
}

export class StructuredReportParser implements ReportParserAdapter {
  parseText(content: string, fileName = "Manual report"): ParsedReport {
    const trimmed = content.trim();
    const lowerName = fileName.toLowerCase();
    if (!trimmed) {
      return { sourceLabel: fileName, findings: [], warnings: [] };
    }
    if (lowerName.endsWith(".json") || trimmed.startsWith("{")) {
      try {
        return parseJsonReport(trimmed, fileName);
      } catch {
        return {
          sourceLabel: fileName,
          findings: [],
          warnings: [
            {
              en: "Could not read JSON structure. Check formatting or try CSV / gene picker.",
              ar: "تعذّرت قراءة بنية ملف JSON. تحقق من التنسيق أو جرّب ملف CSV أو اختيار الجينات.",
            },
          ],
        };
      }
    }
    if (lowerName.endsWith(".vcf") || trimmed.includes("##fileformat=VCF") || trimmed.includes("CLNSIG=")) {
      return parseVcfReport(trimmed, fileName);
    }
    return parseDelimitedOrTextReport(trimmed, fileName);
  }
}

export const defaultReportParser = new StructuredReportParser();

export type SampleReportSpec = {
  id: string;
  fileName: string;
  path: string;
  title: Record<Lang, string>;
  subtitle: Record<Lang, string>;
  content: string;
};

export const SAMPLE_REPORT_FILES: SampleReportSpec[] = [
  {
    id: "noura-hbb-json",
    fileName: "noura-thalassemia-panel.json",
    path: "/samples/noura-thalassemia-panel.json",
    title: { en: "Noura · HBB + PAH (JSON)", ar: "نورة · HBB + PAH (ملف JSON)" },
    subtitle: {
      en: "Beta-thalassemia carrier + private PKU carrier",
      ar: "حاملة لبيتا ثلاسيميا مع حمل خاص لجين PKU",
    },
    content: JSON.stringify(
      {
        name: { en: "Noura", ar: "نورة" },
        screeningId: "AD-20411",
        panel: "Abu Dhabi 570-gene carrier panel",
        findings: [
          { gene: "HBB", classification: "pathogenic", inheritance: "autosomal_recessive" },
          { gene: "PAH", classification: "pathogenic", inheritance: "autosomal_recessive" },
        ],
      },
      null,
      2,
    ),
  },
  {
    id: "khalid-hbb-csv",
    fileName: "khalid-thalassemia-panel.csv",
    path: "/samples/khalid-thalassemia-panel.csv",
    title: { en: "Khalid · HBB + CFTR (CSV)", ar: "خالد · HBB + CFTR (ملف CSV)" },
    subtitle: {
      en: "Shares HBB with Noura; CFTR stays private",
      ar: "يشترك في HBB مع نورة؛ ويبقى CFTR خاصاً",
    },
    content: [
      "name,id,gene,classification,inheritance",
      "Khalid,AD-20412,HBB,pathogenic,autosomal_recessive",
      "Khalid,AD-20412,CFTR,likely_pathogenic,autosomal_recessive",
    ].join("\n"),
  },
  {
    id: "amina-sma-vcf",
    fileName: "amina-carrier-panel.vcf",
    path: "/samples/amina-carrier-panel.vcf",
    title: { en: "Amina · SMN1 carrier (VCF)", ar: "أمينة · حاملة SMN1 (ملف VCF)" },
    subtitle: {
      en: "Includes 1 pathogenic SMN1 variant + 1 benign variant filtered out",
      ar: "يحوي متغيراً مسبباً في SMN1 ومتغيراً حميداً يُستبعد تلقائياً",
    },
    content: [
      "##fileformat=VCFv4.2",
      "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\tAmina",
      "5\t70924941\t.\tC\tT\t99\tPASS\tGENE=SMN1;CLNSIG=Pathogenic;INH=autosomal_recessive\tGT\t0/1",
      "7\t117559590\t.\tG\tA\t99\tPASS\tGENE=CFTR;CLNSIG=Benign;INH=autosomal_recessive\tGT\t0/1",
    ].join("\n"),
  },
  {
    id: "hessa-g6pd-fhir",
    fileName: "hessa-xlinked-g6pd.json",
    path: "/samples/hessa-xlinked-g6pd.json",
    title: { en: "Hessa · G6PD X-linked (FHIR JSON)", ar: "حصة · G6PD المرتبط بـ X (FHIR)" },
    subtitle: {
      en: "X-linked finding routed directly to a genetic counsellor",
      ar: "نتيجة مرتبطة بالكروموسوم X تُحال مباشرة للمستشار الوراثي",
    },
    content: JSON.stringify(
      {
        resourceType: "DiagnosticReport",
        id: "AD-22310",
        subject: { display: "Hessa" },
        observations: [
          {
            gene: "G6PD",
            clinicalSignificance: "Pathogenic",
            inheritance: "x_linked",
          },
        ],
      },
      null,
      2,
    ),
  },
  {
    id: "clear-panel-json",
    fileName: "zayed-no-shared-panel.json",
    path: "/samples/zayed-no-shared-panel.json",
    title: { en: "Zayed · Clear 570-gene panel (JSON)", ar: "زايد · لوحة سليمة بلا متغيرات (JSON)" },
    subtitle: {
      en: "0 reportable carrier changes (demonstrates residual risk education)",
      ar: "صفر متغيرات حاملة معتبرة (يعرض شرح الاحتمال الأساسي المتبقي)",
    },
    content: JSON.stringify(
      {
        name: { en: "Zayed", ar: "زايد" },
        screeningId: "AD-21902",
        findings: [],
      },
      null,
      2,
    ),
  },
];
