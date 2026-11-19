import { motion } from "motion/react";
import { useEffect, useState, type FormEvent } from "react";
import { canShare, copyText } from "./copy";
import { hashToRoute, inviteLink, joinCodeFromLocation } from "./routing";
import { defaultReportParser, SAMPLE_REPORT_FILES, type ParsedReport } from "./adapters/reportParser";
import { createPersonFile, otherPersonId, type PersonFile, type PersonId } from "./domain/case";
import { ease, rise, stagger } from "./fx";
import { Phone } from "./Phone";
import { CarePathPanel, PrivacyCentre, SignInLinkPanel } from "./Portal";
import { ReportModal } from "./ReportModal";
import { ActivityLog, Ledger, MatchEngine } from "./Stage";
import { fill, t } from "./strings";
import { useSatr } from "./store";
import { Icon } from "./visuals";

export function Workspace() {
  const {
    state,
    dispatch,
    adapterKind,
    liveSession,
    startLiveCase,
    joinLiveCase,
    leaveLiveCase,
    switchMode,
    switchedFrom,
  } = useSatr();
  const c = t(state.lang);

  const [startNameEn, setStartNameEn] = useState("Noura");
  const [startNameAr, setStartNameAr] = useState("نورة");
  const [startId, setStartId] = useState("AD-20411");
  const [startSampleId, setStartSampleId] = useState(SAMPLE_REPORT_FILES[0].id);

  const [joinCode, setJoinCode] = useState(() => joinCodeFromLocation() ?? "");
  const [joinNameEn, setJoinNameEn] = useState("Khalid");
  const [joinNameAr, setJoinNameAr] = useState("خالد");
  const [joinId, setJoinId] = useState("AD-20412");
  const [joinSampleId, setJoinSampleId] = useState(SAMPLE_REPORT_FILES[1].id);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"screening" | "path" | "privacy">("screening");
  const [path, setPath] = useState<"start" | "join">(() => (joinCodeFromLocation() ? "join" : "start"));
  const [invited, setInvited] = useState(() => Boolean(joinCodeFromLocation()));

  // An invite link pasted while this screen is open still fills in the code.
  useEffect(() => {
    const onHash = () => {
      const code = hashToRoute(window.location.hash)?.joinCode;
      if (!code) return;
      setJoinCode(code);
      setPath("join");
      setInvited(true);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const [reportModalSlot, setReportModalSlot] = useState<PersonId | null>(null);
  const [uploads, setUploads] = useState<Partial<Record<PersonId, ParsedReport & { fileName: string }>>>({});

  const readUpload = async (slot: PersonId, file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const parsed = defaultReportParser.parseText(text, file.name);
    setUploads((prev) => ({ ...prev, [slot]: { ...parsed, fileName: file.name } }));
  };

  const adapterBadge =
    adapterKind === "neon" ? c.adapterNeon : adapterKind === "server" ? c.adapterServer : adapterKind === "local" ? c.adapterLocal : c.adapterSim;

  const buildInitialFile = (
    slot: PersonId,
    nameEn: string,
    nameAr: string,
    screeningId: string,
    sampleId: string,
  ): PersonFile => {
    const own = uploads[slot];
    if (sampleId === "upload" && own) {
      return createPersonFile({
        id: slot,
        nameEn: nameEn.trim() || own.nameEn || "Applicant",
        nameAr: nameAr.trim() || own.nameAr || nameEn.trim(),
        number: screeningId.trim() || own.number,
        joined: true,
        reportSource: `Uploaded · ${own.fileName}`,
        findings: own.findings,
      });
    }
    const sample = SAMPLE_REPORT_FILES.find((s) => s.id === sampleId);
    if (!sample) {
      return createPersonFile({
        id: slot,
        nameEn,
        nameAr: nameAr || nameEn,
        number: screeningId,
        joined: true,
        reportSource: "Clear 570-gene panel",
        findings: [],
      });
    }
    const parsed = defaultReportParser.parseText(sample.content, sample.fileName);
    return createPersonFile({
      id: slot,
      nameEn: nameEn.trim() || parsed.nameEn || "Applicant",
      nameAr: nameAr.trim() || parsed.nameAr || nameEn.trim(),
      number: screeningId.trim() || parsed.number,
      joined: true,
      reportSource: `Sample · ${sample.fileName}`,
      findings: parsed.findings,
    });
  };

  const handleStart = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const file = buildInitialFile("layla", startNameEn, startNameAr, startId, startSampleId);
      await startLiveCase({
        nameEn: file.name.en,
        nameAr: file.name.ar,
        number: file.number,
        file,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create session");
    } finally {
      setBusy(false);
    }
  };

  const cleanCode = joinCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase();

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (cleanCode.length !== 6) {
      setError(c.wsCodeShape);
      return;
    }
    setBusy(true);
    try {
      const file = buildInitialFile("omar", joinNameEn, joinNameAr, joinId, joinSampleId);
      await joinLiveCase({
        pairingCode: cleanCode,
        nameEn: file.name.en,
        nameAr: file.name.ar,
        number: file.number,
        file,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        /already joined/i.test(msg)
          ? c.wsJoinFull
          : /pairing code|not found|no case/i.test(msg)
            ? fill(c.wsJoinNotFound, { code: cleanCode })
            : c.wsJoinFailed,
      );
    } finally {
      setBusy(false);
    }
  };

  const mySlot: PersonId = liveSession?.slot ?? "layla";
  const partnerSlot: PersonId = otherPersonId(mySlot);
  const myFile = state.files[mySlot];
  const partnerFile = state.files[partnerSlot];

  if (!liveSession || !state.pairingCode) {
    return (
      <main className="desk wrap">
        <motion.header className="page-head" variants={stagger} initial="hidden" animate="show">
          <div className="ws-kicker-row">
            <motion.p className="eyebrow" variants={rise}>
              {c.wsKicker}
            </motion.p>
            <span className="adapter-pill">
              <span className="live-dot" aria-hidden="true" />
              {adapterBadge}
            </span>
          </div>
          <motion.h1 variants={rise}>{c.wsTitle}</motion.h1>
          <motion.p className="lead" variants={rise}>
            {c.wsLead}
          </motion.p>
        </motion.header>

        <ol className="ws-steps" aria-label={c.wsStepsLabel}>
          {[c.wsStep1, c.wsStep2, c.wsStep3, c.wsStep4].map((label, i) => (
            <li key={label}>
              <span>{i + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        {invited && (
          <p className="feedback feedback-good">
            <Icon name="link" size={16} />
            {c.wsInvitedBanner}
          </p>
        )}
        {invited && switchedFrom && (
          <p className="feedback feedback-warn">
            <Icon name="info" size={16} />
            {fill(c.joinSwitchedNotice, { name: switchedFrom[state.lang] })}
          </p>
        )}

        <div className="ws-choose" role="radiogroup" aria-label={c.wsChooseLabel}>
          <button type="button" role="radio" aria-checked={path === "start"} className={path === "start" ? "ws-choice is-on" : "ws-choice"} onClick={() => { setPath("start"); setError(null); }}>
            <span className="card-icon"><Icon name="dna" size={20} /></span>
            <strong>{c.wsChooseStartT}</strong>
            <span className="muted small">{c.wsChooseStartB}</span>
          </button>
          <button type="button" role="radio" aria-checked={path === "join"} className={path === "join" ? "ws-choice is-on" : "ws-choice"} onClick={() => { setPath("join"); setError(null); }}>
            <span className="card-icon card-icon-gold"><Icon name="link" size={20} /></span>
            <strong>{c.wsChooseJoinT}</strong>
            <span className="muted small">{c.wsChooseJoinB}</span>
          </button>
        </div>

        <div className="ws-onboard-grid ws-onboard-single">
          {path === "start" && (
          <motion.form
            className="panel-light ws-card"
            onSubmit={handleStart}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            <div className="ws-card-head">
              <span className="card-icon">
                <Icon name="dna" size={20} />
              </span>
              <div>
                <h2>{c.wsStartTitle}</h2>
                <p className="muted small">{c.wsStartSub}</p>
              </div>
            </div>

            <div className="field-grid-2">
              <label className="field">
                <span>{c.wsYourName}</span>
                <input
                  required
                  value={startNameEn}
                  onChange={(e) => setStartNameEn(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{c.wsYourNameAr}</span>
                <input
                  dir="rtl"
                  value={startNameAr}
                  onChange={(e) => setStartNameAr(e.target.value)}
                />
              </label>
            </div>

            <div className="field-grid-2">
              <label className="field">
                <span>{c.wsScreeningId}</span>
                <input value={startId} onChange={(e) => setStartId(e.target.value)} />
              </label>
              <label className="field">
                <span>{state.lang === "ar" ? "التقرير الأولي" : "Starting sample report"}</span>
                <select value={startSampleId} onChange={(e) => setStartSampleId(e.target.value)}>
                  <option value="upload">{c.wsUploadOwn}</option>
                  {SAMPLE_REPORT_FILES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title[state.lang]}
                    </option>
                  ))}
                  <option value="blank">
                    {state.lang === "ar" ? "لوحة فارغة (أرفع ملفاً لاحقاً)" : "Empty panel (upload file next)"}
                  </option>
                </select>
              </label>
            </div>
            {startSampleId === "upload" && (
              <UploadField
                lang={state.lang}
                parsed={uploads.layla}
                onFile={(f) => void readUpload("layla", f)}
              />
            )}

            {error && (
              <p className="feedback feedback-warn" role="alert">
                <Icon name="info" size={16} />
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy || (startSampleId === "upload" && !uploads.layla?.findings)}>
              <Icon name="shieldCheck" size={16} />
              {c.wsCreateBtn}
            </button>
          </motion.form>
          )}

          {path === "join" && (

          <motion.form
            className="panel-light ws-card"
            onSubmit={handleJoin}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08, ease }}
          >
            <div className="ws-card-head">
              <span className="card-icon card-icon-gold">
                <Icon name="link" size={20} />
              </span>
              <div>
                <h2>{c.wsJoinTitle}</h2>
                <p className="muted small">{c.wsJoinSub}</p>
              </div>
            </div>

            <label className="field">
              <span>{c.wsPairingCode}</span>
              <input
                required
                maxLength={10}
                className="code-input"
                placeholder="K7M2P9"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
            </label>

            <div className="field-grid-2">
              <label className="field">
                <span>{c.wsYourName}</span>
                <input
                  required
                  value={joinNameEn}
                  onChange={(e) => setJoinNameEn(e.target.value)}
                />
              </label>
              <label className="field">
                <span>{c.wsYourNameAr}</span>
                <input
                  dir="rtl"
                  value={joinNameAr}
                  onChange={(e) => setJoinNameAr(e.target.value)}
                />
              </label>
            </div>

            <div className="field-grid-2">
              <label className="field">
                <span>{c.wsScreeningId}</span>
                <input value={joinId} onChange={(e) => setJoinId(e.target.value)} />
              </label>
              <label className="field">
                <span>{state.lang === "ar" ? "التقرير الأولي" : "Starting sample report"}</span>
                <select value={joinSampleId} onChange={(e) => setJoinSampleId(e.target.value)}>
                  <option value="upload">{c.wsUploadOwn}</option>
                  {SAMPLE_REPORT_FILES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title[state.lang]}
                    </option>
                  ))}
                  <option value="blank">
                    {state.lang === "ar" ? "لوحة فارغة (أرفع ملفاً لاحقاً)" : "Empty panel (upload file next)"}
                  </option>
                </select>
              </label>
            </div>
            {joinSampleId === "upload" && (
              <UploadField
                lang={state.lang}
                parsed={uploads.omar}
                onFile={(f) => void readUpload("omar", f)}
              />
            )}

            {error && (
              <p className="feedback feedback-warn" role="alert">
                <Icon name="info" size={16} />
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy || (joinSampleId === "upload" && !uploads.omar?.findings)}>
              <Icon name="together" size={16} />
              {c.wsJoinBtn}
            </button>
          </motion.form>
          )}
        </div>

        <section className="panel-light ws-switch-banner">
          <div>
            <strong>{c.posterDemo}</strong>
            <p className="muted small">
              {c.hubCouplesB}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            onClick={() => switchMode("live", "access")}
          >
            <Icon name="play" size={14} />
            {c.posterDemo}
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="desk wrap">
      <section className="ws-session-bar">
        <div className="ws-session-meta">
          <span className="adapter-pill">
            <span className="live-dot" aria-hidden="true" />
            {adapterBadge}
          </span>
          <div>
            <p className="eyebrow">{c.wsActiveSession}</p>
            <h2 className="ws-session-title">
              {myFile.name[state.lang]} <span className="muted small">({myFile.number})</span>
            </h2>
          </div>
        </div>

        <div className="ws-pairing-box">
          <span className="muted small">{c.wsPairingCode}</span>
          <code className="pairing-code-pill">{state.pairingCode}</code>
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            onClick={async () => {
              const ok = await copyText(state.pairingCode ?? "");
              setCopied(ok);
              if (ok) window.setTimeout(() => setCopied(false), 1800);
            }}
          >
            <Icon name={copied ? "check" : "copy"} size={14} />
            {copied ? c.wsCopied : c.wsCopyCode}
          </button>
        </div>

        <div className="ws-session-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setReportModalSlot(mySlot)}
          >
            <Icon name="upload" size={14} />
            {c.uploadReport}
          </button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={leaveLiveCase}>
            <Icon name="refresh" size={14} />
            {c.wsLeave}
          </button>
        </div>
      </section>

      <div className="ws-partner-banner">
        {partnerFile.joined ? (
          <p className="feedback feedback-good">
            <Icon name="together" size={16} />
            {fill(c.wsPartnerJoined, { name: `${partnerFile.name[state.lang]} (${partnerFile.number})` })}
          </p>
        ) : (
          <div className="ws-waiting-partner">
            <p className="muted small">
              <Icon name="clock" size={15} />{" "}
              {fill(c.wsPartnerWaiting, { code: state.pairingCode })}
            </p>
          </div>
        )}
      </div>

      {!partnerFile.joined && state.pairingCode && (
        <section className="panel-light ws-invite">
          <div>
            <h3 className="panel-title-dark">
              <Icon name="link" size={17} />
              {c.inviteLinkT}
            </h3>
            <p className="muted small">{c.inviteLinkB}</p>
          </div>
          <input
            className="ws-invite-link"
            readOnly
            value={inviteLink(state.pairingCode)}
            aria-label={c.inviteLinkT}
            onFocus={(e) => e.currentTarget.select()}
            onClick={(e) => e.currentTarget.select()}
          />
          {linkCopied === false && (
            <p className="feedback feedback-warn" role="status">
              <Icon name="info" size={16} />
              {c.inviteCopyFailed}
            </p>
          )}
          <div className="ws-invite-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={async () => {
                const ok = await copyText(inviteLink(state.pairingCode ?? ""));
                setLinkCopied(ok);
                if (ok) window.setTimeout(() => setLinkCopied(null), 2200);
              }}
            >
              <Icon name={linkCopied ? "check" : "copy"} size={14} />
              {linkCopied ? c.inviteCopied : c.inviteCopy}
            </button>
            <a
              className="btn btn-quiet btn-sm"
              href={`https://wa.me/?text=${encodeURIComponent(`${fill(c.inviteMessage, { name: myFile.name[state.lang] })} ${inviteLink(state.pairingCode)}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="chat" size={14} />
              {c.inviteWhatsApp}
            </a>
            {canShare() && (
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() =>
                  void navigator
                    .share({ title: c.brand, text: fill(c.inviteMessage, { name: myFile.name[state.lang] }), url: inviteLink(state.pairingCode ?? "") })
                    .catch(() => undefined)
                }
              >
                <Icon name="send" size={14} />
                {c.inviteShare}
              </button>
            )}
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={() => window.open(inviteLink(state.pairingCode ?? ""), "_blank", "noopener")}
            >
              <Icon name="plus" size={14} />
              {c.wsSimulatePartner}
            </button>
          </div>
        </section>
      )}

      <SignInLinkPanel />

      <div className="portal-tabs" role="tablist">
        {(
          [
            ["screening", c.portalTabScreening, "dna"],
            ["path", c.portalTabPath, "arrowRight"],
            ["privacy", c.portalTabPrivacy, "shield"],
          ] as const
        ).map(([key, label, icon]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? "is-on" : ""} onClick={() => setTab(key)}>
            <Icon name={icon} size={15} className={icon === "arrowRight" ? "flip-rtl" : undefined} />
            {label}
          </button>
        ))}
      </div>

      {tab === "path" && <CarePathPanel me={mySlot} />}
      {tab === "privacy" && <PrivacyCentre me={mySlot} />}

      <div className="ws-live-grid" hidden={tab !== "screening"}>
        <div className="ws-phone-column">
          <Phone id={mySlot} onEditReport={() => setReportModalSlot(mySlot)} />
        </div>

        <div className="ws-side-column">
          <section className="panel-light">
            <div className="builder-bar">
              <h3 className="panel-title-dark">
                <Icon name="file" size={17} />
                {fill(c.editReportA, { name: myFile.name[state.lang] })}
              </h3>
              <button
                type="button"
                className="btn btn-quiet btn-sm"
                onClick={() => setReportModalSlot(mySlot)}
              >
                <Icon name="upload" size={14} />
                {c.uploadReport}
              </button>
            </div>
            <p className="muted small">
              {myFile.reportSource ?? "Live screening report"} ·{" "}
              {myFile.findings.length === 0
                ? c.clearCardT
                : `${myFile.findings.length} ${state.lang === "ar" ? "نتائج" : "findings"}`}
            </p>
            <div className="ws-quick-links">
              <button
                type="button"
                className="chip"
                onClick={() => dispatch({ type: "view", view: "agent" })}
              >
                <Icon name="chat" size={14} />
                {c.navAgent}
              </button>
            </div>
          </section>

          <MatchEngine light />
          <Ledger light />
          <ActivityLog light />
        </div>
      </div>

      {reportModalSlot && (
        <ReportModal
          open
          personId={reportModalSlot}
          currentFile={state.files[reportModalSlot]}
          lang={state.lang}
          onClose={() => setReportModalSlot(null)}
          onApply={(updated) => dispatch({ type: "setReport", id: reportModalSlot, file: updated })}
        />
      )}
    </main>
  );
}

/** Pick a report file on the start screen; it is read on this device and shown before anything is sent. */
function UploadField({
  lang,
  parsed,
  onFile,
}: {
  lang: "en" | "ar";
  parsed?: ParsedReport & { fileName: string };
  onFile: (file: File | undefined) => void;
}) {
  const c = t(lang);
  return (
    <div className="upload-field">
      <label className="upload-drop">
        <input type="file" accept=".json,.csv,.tsv,.vcf,.txt" onChange={(e) => onFile(e.target.files?.[0])} />
        <Icon name="upload" size={18} />
        <span>
          <strong>{parsed ? parsed.fileName : c.wsUploadPick}</strong>
          <span className="muted small">{c.wsUploadHint}</span>
        </span>
      </label>
      {parsed && (
        <p className="small">
          {parsed.findings.length === 0 ? c.wsUploadNone : fill(c.wsUploadFound, { n: parsed.findings.length })}{" "}
          {parsed.findings.map((f) => (
            <code key={f.gene} className="upload-gene">
              {f.gene}
            </code>
          ))}
        </p>
      )}
      {parsed?.warnings.map((w, i) => (
        <p key={i} className="muted small">
          {w[lang]}
        </p>
      ))}
    </div>
  );
}
