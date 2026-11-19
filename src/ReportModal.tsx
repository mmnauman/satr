import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ChangeEvent, type DragEvent } from "react";
import {
  defaultReportParser,
  SAMPLE_REPORT_FILES,
  sanitizeScreeningNumber,
} from "./adapters/reportParser";
import { createPersonFile, type PersonFile, type PersonId } from "./domain/case";
import {
  buildFinding,
  CATALOG_GENES,
  GENE_CATALOG,
  normalizeGeneSymbol,
  type Finding,
  type InheritanceMode,
  type Lang,
  type VariantClassification,
} from "./domain/genes";
import { ease } from "./fx";
import { Icon } from "./visuals";

type ModalCopy = {
  kicker: string;
  title: string;
  lead: string;
  tabBuilder: string;
  tabUpload: string;
  tabSamples: string;
  nameEn: string;
  nameAr: string;
  fileNo: string;
  currentFindings: string;
  clearAll: string;
  noFindings: string;
  addFromPanel: string;
  customGene: string;
  customAdd: string;
  classPathogenic: string;
  classLikely: string;
  classVus: string;
  inhRecessive: string;
  inhXLinked: string;
  inhDominant: string;
  dropTitle: string;
  dropSub: string;
  chooseFile: string;
  pasteLabel: string;
  parsePaste: string;
  samplesLead: string;
  useSample: string;
  downloadSample: string;
  privacyNote: string;
  cancel: string;
  apply: string;
};

const COPY: Record<Lang, ModalCopy> = {
  en: {
    kicker: "Genetic screening report",
    title: "Enter or upload a sample genetic report",
    lead: "Update this person’s carrier report from a JSON, CSV, VCF, or text lab file, or pick genes directly. Private match, Ask Satr, explain-it-back, and the counsellor summary update from these findings.",
    tabBuilder: "Select genes",
    tabUpload: "Upload or paste file",
    tabSamples: "Sample lab files",
    nameEn: "Name (English)",
    nameAr: "Name (Arabic)",
    fileNo: "Screening ID",
    currentFindings: "Findings in this report",
    clearAll: "Set as clear panel (0 findings)",
    noFindings: "No reportable carrier changes in this report (clear 570-gene screen).",
    addFromPanel: "Quick-add from the Abu Dhabi carrier panel",
    customGene: "Or enter another gene symbol (e.g. LAMA2)",
    customAdd: "Add gene",
    classPathogenic: "Pathogenic",
    classLikely: "Likely pathogenic",
    classVus: "Uncertain (VUS)",
    inhRecessive: "Autosomal recessive",
    inhXLinked: "X-linked",
    inhDominant: "Autosomal dominant",
    dropTitle: "Drop a .json, .csv, .vcf, or .txt report here",
    dropSub: "Benign variants and polygenic scores are filtered out automatically.",
    chooseFile: "Choose report file",
    pasteLabel: "Or paste structured JSON / CSV / VCF / lab lines",
    parsePaste: "Read pasted text",
    samplesLead: "Load a sample lab report directly, or download it to test file upload.",
    useSample: "Load report",
    downloadSample: "Download",
    privacyNote: "Uncertain (VUS) findings are never included in couple risk numbers, and non-shared genes stay private unless both partners carry the same reportable gene and agree to share.",
    cancel: "Cancel",
    apply: "Save report to case",
  },
  ar: {
    kicker: "تقرير الفحص الجيني",
    title: "أدخل أو ارفع تقرير فحص جيني نموذجي",
    lead: "حدّث تقرير هذا الشخص من ملف مختبر بصيغة JSON أو CSV أو VCF أو نص، أو اختر الجينات مباشرة. تتحدث المطابقة الخاصة، واسأل ستر، والشرح بكلماتك، وملخص المستشار تلقائياً.",
    tabBuilder: "اختيار الجينات",
    tabUpload: "رفع ملف أو لصق نص",
    tabSamples: "ملفات مختبر نموذجية",
    nameEn: "الاسم (بالإنجليزية)",
    nameAr: "الاسم (بالعربية)",
    fileNo: "رقم ملف الفحص",
    currentFindings: "النتائج في هذا التقرير",
    clearAll: "تعيين كلوحة سليمة (0 متغيرات)",
    noFindings: "لا توجد تغييرات حاملة معتبرة في هذا التقرير (لوحة من 570 جيناً بلا متغيرات مسببة).",
    addFromPanel: "إضافة سريعة من لوحة الفحص في أبوظبي",
    customGene: "أو أدخل رمز جين آخر (مثل LAMA2)",
    customAdd: "إضافة الجين",
    classPathogenic: "مسبب للمرض (Pathogenic)",
    classLikely: "مرجح الإمراض (Likely pathogenic)",
    classVus: "غير محسوم الأهمية (VUS)",
    inhRecessive: "جسدي متنحٍ",
    inhXLinked: "مرتبط بالكروموسوم X",
    inhDominant: "جسدي سائد",
    dropTitle: "أفلت ملف تقرير بصيغة .json أو .csv أو .vcf أو .txt هنا",
    dropSub: "تُستبعد المتغيرات الحميدة ودرجات المخاطر متعددة الجينات تلقائياً.",
    chooseFile: "اختر ملف التقرير",
    pasteLabel: "أو الصق نص التقرير بصيغة JSON أو CSV أو VCF",
    parsePaste: "قراءة النص الملصق",
    samplesLead: "حمّل تقرير مختبر نموذجياً مباشرة، أو نزّله لتجربة رفع الملفات.",
    useSample: "استخدام التقرير",
    downloadSample: "تنزيل",
    privacyNote: "لا تدخل المتغيرات غير المحسومة (VUS) أبداً في حساب احتمال الزوجين، وتبقى الجينات غير المشتركة خاصة بصاحبها.",
    cancel: "إلغاء",
    apply: "حفظ التقرير في الحالة",
  },
};

export type ReportModalProps = {
  open: boolean;
  personId: PersonId;
  currentFile: PersonFile;
  lang: Lang;
  onClose: () => void;
  onApply: (updated: PersonFile) => void;
};

export function ReportModal({ open, personId, currentFile, lang, onClose, onApply }: ReportModalProps) {
  const m = COPY[lang];
  const [tab, setTab] = useState<"builder" | "upload" | "samples">("builder");
  const [nameEn, setNameEn] = useState(currentFile.name.en);
  const [nameAr, setNameAr] = useState(currentFile.name.ar);
  const [number, setNumber] = useState(currentFile.number);
  const [sourceLabel, setSourceLabel] = useState(currentFile.reportSource ?? "Manual entry");
  const [findings, setFindings] = useState<Finding[]>(currentFile.findings);
  const [customSymbol, setCustomSymbol] = useState("");
  const [pasted, setPasted] = useState("");
  const [warnings, setWarnings] = useState<Record<Lang, string>[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNameEn(currentFile.name.en);
    setNameAr(currentFile.name.ar);
    setNumber(currentFile.number);
    setSourceLabel(currentFile.reportSource ?? "Manual entry");
    setFindings(currentFile.findings);
    setWarnings([]);
  }, [open, currentFile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const applyParsedText = (content: string, fileName: string) => {
    const parsed = defaultReportParser.parseText(content, fileName);
    if (parsed.nameEn) {
      setNameEn(parsed.nameEn);
      if (!parsed.nameAr) setNameAr(parsed.nameEn);
    }
    if (parsed.nameAr) setNameAr(parsed.nameAr);
    if (parsed.number) {
      setNumber(sanitizeScreeningNumber(parsed.number, currentFile.number));
    }
    setSourceLabel(`Uploaded · ${parsed.sourceLabel}`);
    setFindings(parsed.findings);
    setWarnings(parsed.warnings);
    setTab("builder");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await file.text();
    applyParsedText(content, file.name);
  };

  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0]);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void handleFile(event.dataTransfer.files?.[0]);
  };

  const toggleCatalogGene = (gene: string) => {
    const exists = findings.some((f) => f.gene === gene);
    setSourceLabel("Custom report builder");
    if (exists) {
      setFindings(findings.filter((f) => f.gene !== gene));
    } else {
      setFindings([...findings, buildFinding({ gene, classification: "pathogenic" })]);
    }
  };

  const addCustomGene = () => {
    const clean = normalizeGeneSymbol(customSymbol);
    if (!clean || clean.length < 2) return;
    if (!findings.some((f) => f.gene === clean)) {
      setFindings([...findings, buildFinding({ gene: clean, classification: "pathogenic" })]);
      setSourceLabel("Custom report builder");
    }
    setCustomSymbol("");
  };

  const updateFindingMeta = (
    gene: string,
    classification: VariantClassification,
    inheritance: InheritanceMode,
  ) => {
    setSourceLabel("Custom report builder");
    setFindings(
      findings.map((f) =>
        f.gene === gene ? buildFinding({ gene, classification, inheritance }) : f,
      ),
    );
  };

  const handleSave = () => {
    const fallbackNo = personId === "layla" ? "AD-18421" : "AD-18422";
    const safeNo = sanitizeScreeningNumber(number, fallbackNo);
    const updated = createPersonFile({
      id: personId,
      nameEn: nameEn.trim() || currentFile.name.en,
      nameAr: nameAr.trim() || nameEn.trim() || currentFile.name.ar,
      number: safeNo,
      joined: true,
      reportSource: sourceLabel,
      findings,
    });
    onApply(updated);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={m.title}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="modal-sheet"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease }}
          >
            <header className="modal-head">
              <div>
                <p className="eyebrow">{m.kicker}</p>
                <h2>{m.title}</h2>
                <p className="muted small">{m.lead}</p>
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label={m.cancel}>
                <Icon name="x" size={18} />
              </button>
            </header>

            <div className="modal-tabs" role="tablist">
              {(
                [
                  ["builder", m.tabBuilder, "dna"],
                  ["upload", m.tabUpload, "upload"],
                  ["samples", m.tabSamples, "file"],
                ] as const
              ).map(([id, label, icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={tab === id ? "modal-tab is-on" : "modal-tab"}
                  onClick={() => setTab(id)}
                >
                  <Icon name={icon} size={15} />
                  {label}
                </button>
              ))}
            </div>

            <div className="modal-body">
              {warnings.length > 0 && (
                <div className="feedback feedback-warn">
                  <Icon name="info" size={16} />
                  <span>{warnings.map((w) => w[lang]).join(" ")}</span>
                </div>
              )}

              {tab === "builder" && (
                <div className="builder-stack">
                  <div className="field-grid-3">
                    <label className="field">
                      <span>{m.nameEn}</span>
                      <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
                    </label>
                    <label className="field">
                      <span>{m.nameAr}</span>
                      <input value={nameAr} dir="rtl" onChange={(e) => setNameAr(e.target.value)} />
                    </label>
                    <label className="field">
                      <span>{m.fileNo}</span>
                      <input value={number} onChange={(e) => setNumber(e.target.value)} />
                    </label>
                  </div>

                  <div className="builder-section">
                    <div className="builder-bar">
                      <h3>{m.currentFindings}</h3>
                      {findings.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-quiet btn-sm"
                          onClick={() => {
                            setFindings([]);
                            setSourceLabel("Clear panel · 0 findings");
                          }}
                        >
                          {m.clearAll}
                        </button>
                      )}
                    </div>

                    {findings.length === 0 ? (
                      <p className="empty-findings">
                        <Icon name="shieldCheck" size={16} />
                        {m.noFindings}
                      </p>
                    ) : (
                      <ul className="finding-editor-list">
                        {findings.map((f) => (
                          <li key={f.gene} className="finding-editor-row">
                            <div className="finding-editor-main">
                              <strong className="mono-gene">{f.gene}</strong>
                              <span className="muted small">{f.condition[lang]}</span>
                            </div>
                            <div className="finding-editor-controls">
                              <select
                                aria-label={`${f.gene} classification`}
                                value={f.classification}
                                onChange={(e) =>
                                  updateFindingMeta(
                                    f.gene,
                                    e.target.value as VariantClassification,
                                    f.inheritance,
                                  )
                                }
                              >
                                <option value="pathogenic">{m.classPathogenic}</option>
                                <option value="likely_pathogenic">{m.classLikely}</option>
                                <option value="vus">{m.classVus}</option>
                              </select>
                              <select
                                aria-label={`${f.gene} inheritance`}
                                value={f.inheritance}
                                onChange={(e) =>
                                  updateFindingMeta(
                                    f.gene,
                                    f.classification,
                                    e.target.value as InheritanceMode,
                                  )
                                }
                              >
                                <option value="autosomal_recessive">{m.inhRecessive}</option>
                                <option value="x_linked">{m.inhXLinked}</option>
                                <option value="autosomal_dominant">{m.inhDominant}</option>
                              </select>
                              <button
                                type="button"
                                className="icon-btn"
                                onClick={() => setFindings(findings.filter((item) => item.gene !== f.gene))}
                                aria-label={`Remove ${f.gene}`}
                              >
                                <Icon name="x" size={15} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="builder-section">
                    <h3>{m.addFromPanel}</h3>
                    <div className="gene-Catalog-pills">
                      {CATALOG_GENES.map((gene) => {
                        const selected = findings.some((f) => f.gene === gene);
                        const entry = GENE_CATALOG[gene];
                        return (
                          <button
                            key={gene}
                            type="button"
                            className={selected ? "gene-pill is-on" : "gene-pill"}
                            onClick={() => toggleCatalogGene(gene)}
                            title={entry.conditionName[lang]}
                          >
                            <span className="mono-gene">{gene}</span>
                            <span className="gene-pill-sub">{entry.conditionName[lang]}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="custom-gene-row">
                      <input
                        value={customSymbol}
                        onChange={(e) => setCustomSymbol(e.target.value)}
                        placeholder={m.customGene}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomGene();
                          }
                        }}
                      />
                      <button type="button" className="btn btn-quiet btn-sm" onClick={addCustomGene}>
                        <Icon name="plus" size={14} />
                        {m.customAdd}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {tab === "upload" && (
                <div className="upload-stack">
                  <div
                    className={dragging ? "dropzone is-drag" : "dropzone"}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                  >
                    <Icon name="upload" size={26} />
                    <p>
                      <strong>{m.dropTitle}</strong>
                    </p>
                    <p className="muted small">{m.dropSub}</p>
                    <label className="btn btn-primary btn-sm upload-btn">
                      <Icon name="file" size={15} />
                      {m.chooseFile}
                      <input
                        type="file"
                        accept=".json,.csv,.tsv,.vcf,.txt"
                        onChange={onFileInput}
                        hidden
                      />
                    </label>
                  </div>

                  <div className="paste-box">
                    <label className="field">
                      <span>{m.pasteLabel}</span>
                      <textarea
                        rows={5}
                        value={pasted}
                        onChange={(e) => setPasted(e.target.value)}
                        placeholder={'{\n  "name": "Noura",\n  "screeningId": "AD-20411",\n  "findings": [{ "gene": "HBB", "classification": "pathogenic" }]\n}'}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      disabled={!pasted.trim()}
                      onClick={() => applyParsedText(pasted, "Pasted text")}
                    >
                      {m.parsePaste}
                    </button>
                  </div>
                </div>
              )}

              {tab === "samples" && (
                <div className="samples-stack">
                  <p className="muted small">{m.samplesLead}</p>
                  <ul className="sample-file-list">
                    {SAMPLE_REPORT_FILES.map((sample) => (
                      <li key={sample.id} className="sample-file-card">
                        <div>
                          <strong>{sample.title[lang]}</strong>
                          <p className="muted small">{sample.subtitle[lang]}</p>
                        </div>
                        <div className="sample-file-actions">
                          <a
                            className="btn btn-quiet btn-sm"
                            href={sample.path}
                            download={sample.fileName}
                          >
                            <Icon name="download" size={14} />
                            {m.downloadSample}
                          </a>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => applyParsedText(sample.content, sample.fileName)}
                          >
                            {m.useSample}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="modal-privacy-note">
                <Icon name="lock" size={14} />
                {m.privacyNote}
              </p>
            </div>

            <footer className="modal-foot">
              <button type="button" className="btn btn-quiet" onClick={onClose}>
                {m.cancel}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSave}>
                <Icon name="check" size={16} />
                {m.apply}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
