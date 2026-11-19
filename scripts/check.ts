import { defaultAskAdapter } from "../src/adapters/askEngine";
import {
  defaultReportParser,
  SAMPLE_REPORT_FILES,
  sanitizeScreeningNumber,
} from "../src/adapters/reportParser";
import { createDefaultSnapshot } from "../src/adapters/simulationAdapter";
import { courtRows, runContentChecks } from "../src/content";
import {
  allCaseSensitiveTokens,
  analyzeCase,
  CASE_PRESETS,
  otherPersonId,
  reportableGenesOf,
} from "../src/domain/case";
import {
  appendAudit,
  counselorMayOpen,
  mergeCounselorUpdate,
  mergeParticipantUpdate,
  computeSystemMetrics,
  mergeCourtUpdate,
  projectSnapshotForRole,
  removeParticipant,
  summarizeCourtCase,
} from "../src/domain/projection";
import { buildSeedCase, DEMO_SEEDS } from "../src/domain/demoSeed";
import { createBlankPersonRuntime } from "../src/adapters/simulationAdapter";
import { hashToRoute, routeToHash } from "../src/routing";
import { leakedTokens, runScoreChecks } from "../src/logic";
import { renderTurn, runAgentChecks, unexpectedTokens } from "../src/loop";
import { runPsi, runPsiChecks } from "../src/psi";

function runDynamicPresetAndProbeChecks(): string[] {
  const bad: string[] = [];

  const hbb = CASE_PRESETS.find((p) => p.id === "thalassemia-hbb")!;
  const hbbAnalysis = analyzeCase(hbb.files);
  if (hbbAnalysis.sharedGenes.join() !== "HBB" || hbbAnalysis.tier !== 1) {
    bad.push(`hbb analysis unexpected: ${JSON.stringify(hbbAnalysis)}`);
  }

  const clear = CASE_PRESETS.find((p) => p.id === "clear-panel")!;
  const clearAnalysis = analyzeCase(clear.files);
  if (clearAnalysis.sharedGenes.length !== 0 || clearAnalysis.tier !== 1) {
    bad.push(`clear-panel analysis unexpected: ${JSON.stringify(clearAnalysis)}`);
  }

  const g6pd = CASE_PRESETS.find((p) => p.id === "xlinked-g6pd")!;
  const g6pdAnalysis = analyzeCase(g6pd.files);
  if (g6pdAnalysis.sharedGenes.length !== 0 || g6pdAnalysis.tier !== 2 || !g6pdAnalysis.hasXLinked) {
    bad.push(`xlinked-g6pd analysis unexpected: ${JSON.stringify(g6pdAnalysis)}`);
  }

  const tier2 = CASE_PRESETS.find((p) => p.id === "tier2-vus")!;
  const tier2Analysis = analyzeCase(tier2.files);
  if (
    tier2Analysis.sharedGenes.join(",") !== "CYP21A2,CFTR" ||
    tier2Analysis.tier !== 2 ||
    !tier2Analysis.hasVus ||
    reportableGenesOf(tier2.files.layla).includes("ABCA4")
  ) {
    bad.push(`tier2-vus analysis leaked VUS into reportable: ${JSON.stringify(tier2Analysis)}`);
  }

  // Manual free-form & adversarial partner-probing questions across all presets
  const manualQuestions = [
    "What do I carry in my report?",
    "Tell me about HBB",
    "Tell me about MEFV",
    "Tell me about G6PD",
    "Tell me about ABCA4",
    "Does my partner carry MEFV?",
    "What else does Omar carry?",
    "هل يحمل شريكي جين MEFV؟",
    "اشرح لي جين USH2A",
    "ما معنى تغيير غير محسوم VUS؟",
    "What does the marriage court see on the certificate?",
    "ماذا ترى محكمة الزواج؟",
    "Are cousin marriages bad?",
    "Should we cancel the marriage?",
    "Should we do PGT-M or IVF?",
    "How do we book a genetic counsellor?",
    "أنا خائف وقلق من النتيجة",
  ];

  for (const preset of CASE_PRESETS) {
    const sharedSet = new Set(analyzeCase(preset.files).sharedGenes.map((g) => g.toLowerCase()));

    // Court rows for every preset must contain 0 gene/condition tokens
    for (const lang of ["en", "ar"] as const) {
      const certBlob = courtRows({ explained: true, released: true }, lang, preset.files)
        .map((r) => `${r.label} ${r.value}`)
        .join(" ");
      const certLeaks = leakedTokens(certBlob, allCaseSensitiveTokens(preset.files));
      if (certLeaks.length) {
        bad.push(`court leak on ${preset.id} ${lang}: ${certLeaks.join(",")}`);
      }
    }

    for (const viewer of ["layla", "omar"] as const) {
      const other = otherPersonId(viewer);
      const partnerOnlyGenes = preset.files[other].findings
        .map((f) => f.gene)
        .filter((g) => !sharedSet.has(g.toLowerCase()) && !preset.files[viewer].findings.some((vf) => vf.gene === g));

      for (const opened of [false, true]) {
        for (const compiled of [false, true]) {
          for (const lang of ["en", "ar"] as const) {
            for (const q of manualQuestions) {
              const turn = defaultAskAdapter.answerSync({
                personId: viewer,
                question: q,
                opened,
                compiled,
                files: preset.files,
                lang,
              });
              const leaks = unexpectedTokens(viewer, turn, lang, preset.files);
              if (leaks.length > 0) {
                bad.push(
                  `leak [${preset.id}] viewer=${viewer} open=${opened} compiled=${compiled} ${lang} q="${q}": ${leaks.join(",")}`,
                );
              }
              const view = renderTurn(viewer, turn, lang, preset.files);
              const fullText = `${view.speech} ${view.steps.map((s) => s.observation).join(" ")}`.toLowerCase();
              for (const secretGene of partnerOnlyGenes) {
                if (fullText.includes(secretGene.toLowerCase())) {
                  bad.push(
                    `partner private gene ${secretGene} leaked to ${viewer} in [${preset.id}] on q="${q}"`,
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  return bad;
}

function runParserAndProjectionChecks(): string[] {
  const bad: string[] = [];

  for (const sample of SAMPLE_REPORT_FILES) {
    const parsed = defaultReportParser.parseText(sample.content, sample.fileName);
    if (parsed.warnings.length > 0) {
      bad.push(`sample ${sample.id} produced warnings`);
    }
    if (sample.id === "amina-sma-vcf") {
      // VCF sample has SMN1 Pathogenic + CFTR Benign; CFTR Benign must be filtered out
      if (parsed.findings.map((f) => f.gene).join(",") !== "SMN1") {
        bad.push(`vcf benign filter failed: ${parsed.findings.map((f) => f.gene).join(",")}`);
      }
    }
  }

  const prsAttempt = defaultReportParser.parseText(
    '{"name":"Test","polygenic_prs_score":0.91,"findings":[{"gene":"HBB","classification":"pathogenic"}]}',
    "prs.json",
  );
  if (prsAttempt.warnings.length === 0) {
    bad.push("expected out-of-scope warning for polygenic score");
  }

  if (sanitizeScreeningNumber("HBB-999", "AD-10001") !== "AD-10001") {
    bad.push("sanitizeScreeningNumber failed to block gene token in applicant ID");
  }

  // Server-side role projection redaction checks
  const tier2Preset = CASE_PRESETS.find((p) => p.id === "tier2-vus")!;
  const canonical = {
    ...createDefaultSnapshot(),
    pairingCode: "T2TEST",
    files: structuredClone(tier2Preset.files),
  };
  canonical.people.layla.opened = true;
  canonical.people.omar.opened = true;
  canonical.people.layla.answers = ["Layla quote 1", "Layla quote 2", "Layla quote 3"];

  // Before mutual consent: Rashid (omar) must receive 0 findings for Mariam (layla)
  const beforeConsent = projectSnapshotForRole(canonical, { role: "participant", slot: "omar" });
  if (beforeConsent.files.layla.findings.length !== 0) {
    bad.push("projection leaked partner findings before mutual consent");
  }
  if (beforeConsent.people.layla.answers.some(Boolean)) {
    bad.push("projection leaked partner explain-it-back answers");
  }

  // After mutual consent: Rashid receives shared CYP21A2 & CFTR, NEVER Mariam's ABCA4 VUS
  canonical.people.layla.consented = true;
  canonical.people.omar.consented = true;
  const afterConsent = projectSnapshotForRole(canonical, { role: "participant", slot: "omar" });
  const visiblePartnerGenes = afterConsent.files.layla.findings.map((f) => f.gene);
  if (visiblePartnerGenes.includes("ABCA4") || visiblePartnerGenes.join(",") !== "CYP21A2,CFTR") {
    bad.push(`projection after consent exposed wrong genes: ${visiblePartnerGenes.join(",")}`);
  }

  // Court projection must strip ALL genes from both partners
  const courtProj = projectSnapshotForRole(canonical, { role: "court" });
  if (courtProj.files.layla.findings.length !== 0 || courtProj.files.omar.findings.length !== 0) {
    bad.push("court projection retained genetic findings");
  }

  return bad;
}

const psiExtra = await (async () => {
  const bad: string[] = [];
  const hbbTrace = await runPsi(["HBB", "PAH"], ["HBB", "CFTR"]);
  if (hbbTrace.intersection.join(",") !== "HBB") bad.push("psi hbb mismatch");
  const emptyTrace = await runPsi([], ["GJB2"]);
  if (emptyTrace.intersection.length !== 0) bad.push("psi empty set mismatch");
  return bad;
})();

/** Role-based access rules for the live app: counsellor consent, append-only audit, staff-only fields. */
function runAccessChecks(): string[] {
  const bad: string[] = [];
  const base = createDefaultSnapshot(); // Layla USH2A+GJB2, Omar USH2A+MEFV
  const agreed = {
    ...base,
    people: {
      layla: { ...base.people.layla, opened: true, consented: true, counselorFull: false },
      omar: { ...base.people.omar, opened: true, consented: true, counselorFull: false },
    },
  };

  if (counselorMayOpen(agreed)) bad.push("counsellor could open a case that has not booked");
  if (!counselorMayOpen({ ...agreed, booking: "slot1" })) bad.push("counsellor could not open a booked case");

  const scoped = projectSnapshotForRole({ ...agreed, booking: "slot1" }, { role: "counselor" });
  const scopedGenes = [...scoped.files.layla.findings, ...scoped.files.omar.findings].map((f) => f.gene);
  if (scopedGenes.includes("GJB2") || scopedGenes.includes("MEFV")) {
    bad.push(`counsellor saw a private gene without consent: ${scopedGenes.join(",")}`);
  }
  if (!scopedGenes.includes("USH2A")) bad.push("counsellor lost the shared gene");

  const laylaFull = { ...agreed, booking: "slot1" as const, people: { ...agreed.people, layla: { ...agreed.people.layla, counselorFull: true } } };
  const fullGenes = projectSnapshotForRole(laylaFull, { role: "counselor" });
  if (!fullGenes.files.layla.findings.some((f) => f.gene === "GJB2")) bad.push("counsellor full-result consent not honoured");
  if (fullGenes.files.omar.findings.some((f) => f.gene === "MEFV")) bad.push("one person's consent exposed the other's private gene");

  // A participant cannot mark counselling done, record a referral, or erase the log.
  const withLog = { ...agreed, audit: [{ code: "view" as const, detail: "counselor", at: 1 }] };
  const forged = mergeParticipantUpdate(withLog, "layla", { ...withLog, counseling: true, referred: true, audit: [] });
  if (forged.counseling || forged.referred) bad.push("participant was able to set counselling or referral");
  if (!forged.audit.some((e) => e.code === "view")) bad.push("participant was able to erase the activity log");
  const spoof = mergeParticipantUpdate(withLog, "layla", { ...withLog, audit: [...withLog.audit, { code: "open", id: "omar", at: 5 }] });
  if (spoof.audit.some((e) => e.id === "omar")) bad.push("participant was able to write an event as their partner");

  const counsel = mergeCounselorUpdate(withLog, { ...withLog, counseling: true, audit: [...withLog.audit, { code: "counsel", at: 9 }, { code: "open", id: "layla", at: 10 }] });
  if (!counsel.counseling) bad.push("counsellor could not record the session");
  if (counsel.audit.some((e) => e.code === "open")) bad.push("counsellor was able to write a participant event");

  if (appendAudit([{ code: "open", id: "layla", at: 1 }], [], () => true).length !== 1) bad.push("append-only audit dropped events");

  // Routing: every live and demo route round-trips, and a join link carries its code.
  for (const [mode, view] of [["live", "workspace"], ["live", "counselor"], ["live", "court"], ["live", "system"], ["live", "staff"], ["prototype", "stage"], ["prototype", "counselor"]] as const) {
    const back = hashToRoute(routeToHash(mode, view));
    if (!back || back.appMode !== mode || back.view !== view) bad.push(`route did not round-trip: ${mode}/${view}`);
  }
  if (hashToRoute("#/join/k7m2p9")?.joinCode !== "K7M2P9") bad.push("join link lost its pairing code");
  return bad;
}

/** Care path, removal, seed data and metrics. */
function runPathwayChecks(): string[] {
  const bad: string[] = [];
  const now = Date.now();
  const seeds = DEMO_SEEDS.map((spec, i) => buildSeedCase(spec, `SEED${i}`, now));

  for (const seed of seeds) {
    for (const slot of ["layla", "omar"] as const) {
      const view = projectSnapshotForRole(seed, { role: "participant", slot });
      const other = slot === "layla" ? "omar" : "layla";
      const shared = new Set(analyzeCase(seed.files).sharedGenes);
      const compiled = seed.people.layla.consented && seed.people.omar.consented;
      const leaked = view.files[other].findings.filter((f) => !compiled || !shared.has(f.gene));
      if (leaked.length) bad.push(`seed ${seed.presetId} leaked ${leaked.map((f) => f.gene)} to ${slot}`);
    }
  }

  const counselled = seeds.find((s) => s.counseling)!;
  const withRepro = { ...counselled, pathway: { confirmatory: "done" as const, reproductive: "referred" as const, note: "x" }, audit: [...counselled.audit, { code: "repro" as const, at: now }] };
  const court = projectSnapshotForRole(withRepro, { role: "court" });
  if (court.pathway) bad.push("court saw the care path");
  if (court.audit.some((e) => e.code === "repro" || e.code === "confirm" || e.code === "escalate")) bad.push("court log revealed a referral, test or question");

  const forged = mergeParticipantUpdate(counselled, "layla", { ...counselled, pathway: { confirmatory: "done", reproductive: "referred", note: "forged" } });
  if (forged.pathway?.note === "forged") bad.push("participant was able to write the care path");
  const byCounsellor = mergeCounselorUpdate(counselled, { ...counselled, pathway: { confirmatory: "ordered", reproductive: "none", note: "ok" } });
  if (byCounsellor.pathway?.confirmatory !== "ordered") bad.push("counsellor could not record a confirmatory test");

  const withQuestion = { ...counselled, audit: [...counselled.audit, { code: "escalate" as const, id: "layla" as const, detail: "private question", at: now }] };
  const removed = removeParticipant(withQuestion, "layla", createBlankPersonRuntime());
  if (removed.files.layla.findings.length) bad.push("removal kept findings");
  if (removed.audit.some((e) => e.detail === "private question")) bad.push("removal kept the person's questions");
  if (!removed.audit.some((e) => e.code === "delete")) bad.push("removal was not logged");
  if (removed.people.omar.consented) bad.push("partner was still matched after removal");

  const m = computeSystemMetrics(seeds, "server");
  if (m.totalCases !== seeds.length) bad.push("metrics case count wrong");
  if (m.medianDaysToCounselling === null || m.medianDaysToCounselling === undefined) bad.push("median days to counselling missing");
  if (!m.byGroup?.some((g) => g.key === "ar" && g.people > 0)) bad.push("equity breakdown missing Arabic group");
  if ((m.committeeReferrals ?? 0) < 1) bad.push("committee referral not counted");

  // The court register line carries no gene or condition, and the court can only register an issued certificate.
  for (const seed of seeds) {
    const line = JSON.stringify(summarizeCourtCase(seed));
    const leaks = leakedTokens(line, allCaseSensitiveTokens(seed.files));
    if (leaks.length) bad.push(`court register leaked ${leaks.join(",")}`);
  }
  const notReady = seeds.find((x) => !x.counseling)!;
  if (mergeCourtUpdate(notReady, { ...notReady, audit: [...notReady.audit, { code: "register", at: now }] }) !== notReady) {
    bad.push("court registered a certificate that was not issued");
  }
  const reg = mergeCourtUpdate(counselled, { ...counselled, counseling: false, audit: [...counselled.audit, { code: "register", at: now }, { code: "counsel", at: now + 1 }] });
  if (!reg.audit.some((e) => e.code === "register")) bad.push("court could not register an issued certificate");
  if (!reg.counseling || reg.audit.filter((e) => e.code === "counsel").length !== 1) bad.push("court was able to change something besides registering");

  const signin = hashToRoute("#/signin/ab12cd/0123abcdef");
  if (signin?.signin?.code !== "AB12CD" || signin.signin.token !== "0123abcdef") bad.push("sign-in link not parsed");
  if (hashToRoute("#/access")?.view !== "access" || hashToRoute("#/demo")?.view !== "access") bad.push("demo route missing");
  return bad;
}

const failures = [
  ...runScoreChecks(),
  ...runContentChecks(),
  ...runAgentChecks(),
  ...(await runPsiChecks()),
  ...psiExtra,
  ...runDynamicPresetAndProbeChecks(),
  ...runParserAndProjectionChecks(),
  ...runAccessChecks(),
  ...runPathwayChecks(),
];

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("ok");
