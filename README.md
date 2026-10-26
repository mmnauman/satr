# Satr · ستر

**Satr** (Arabic for *covering* / *discretion*) is a bilingual web app that helps couples in Abu Dhabi understand premarital or preconception genetic screening **privately**, then connect that understanding to counselling, the marriage court, relatives and the health system — without exposing one person’s genes to another without consent.

> Fictional people and results. Prototype only — not a government service and not medical advice.

---

# 1. Project explanation

## The challenge we are answering

> How might we help individuals, families and health systems identify, understand and reduce inherited disease risks associated with consanguinity through innovative, culturally appropriate and privacy-preserving technologies?

Abu Dhabi already has population genomics and premarital genetic screening. Screening alone is not enough. People still need to **understand** a carrier or couple-level result, reach **qualified counselling**, make **informed choices that fit their values**, and do all of that without **exposing one family member’s genetics to another** without permission. Consanguineous marriage is a respected practice — so the solution must support informed choice, not judgement or coercion.

**Satr’s answer:** a bilingual (English / Arabic) privacy-first journey from *result → understanding → counselling → court / family / health system*, where each role sees only what they need.

## How our presented solution solves the challenge

Satr does not replace the screening programme. It closes the **result-to-decision** gap the brief describes — comprehension, counselling escalation, values-sensitive choice, privacy across families, care linkage and measurable access — with one coherent product you can walk in the live demo.

### Challenge gap → what Satr does

| Challenge need | Gap today | How Satr solves it |
| --- | --- | --- |
| **Understand inherited risk** | Carrier / couple results are probabilistic and easy to misread (“I’m sick”, “we must not marry”) | Plain-language *My result* and *Together* screens; 1-in-4 chance picture; simple view and Listen; explain-it-back that flags harmful readings |
| **Respect culture & choice** | Tools that judge cousin marriage or push one reproductive path get rejected and cause harm | Non-directive copy; unranked “What would you like to talk about?” options; Ask **refuses** “Should we marry?” and never ranks clinical paths |
| **Reach genetics professionals** | Too few counsellors; software must not give clinical advice | Clear tiers: education and decision support in-app; clinical advice only via counsellor desk; Tier 2 → committee; Ask hands off high-impact questions |
| **Protect family privacy** | Shared biology means one result can imply another’s status | Own result only until consent; Diffie–Hellman **private set intersection** reveals only genes **both** carry; ledger + audit log; gene-free court certificate; anonymous relative invite |
| **Link screening to care** | People drop off between result, counselling and services | Traceable path: book counsellor → session record → screening certificate → referral funnel (shown end-to-end in the demo) |
| **Prove it works equitably** | Success must not be “marriages cancelled” | Health-system view tracks comprehension, uptake, time to referral and equity by language / literacy — never cancelled marriages |

### How each desired outcome is met

| # | Desired outcome (from the brief) | How Satr meets it in the presented solution |
| --- | --- | --- |
| 1 | **Risk explanation** — carrier vs diagnosis, couple risk, uncertainty, non-stigmatizing language | Each partner opens their own panel first. After both agree, *Together* explains the shared finding (e.g. USH2A) as a **chance per pregnancy**, with a visual 1-in-4 picture, residual uncertainty, and “healthy carrier” framing — never “defective” or “incompatible couple”. |
| 2 | **Informed, values-sensitive choices** — access without directing or coercing | Options for what to discuss next are listed neutrally. Ask Satr answers factual, permissioned questions only. Questions like “Should we get married?” are **passed to a genetic counsellor**, so the product never decides for the couple or the family. |
| 3 | **Qualified human counselling** — escalate complex findings; keep education ≠ clinical advice | Soft cases can be closed on the counsellor desk (Tier 1). Ambiguous / multi-gene cases (e.g. Mariam & Rashid) are referred to the committee (Tier 2). Ask’s hand-offs appear on the counsellor queue so humans stay in the loop. |
| 4 | **Privacy-preserving family workflows** — consent, role-based access, minimization, audit | Two explicit consents before any couple match. PSI minimizes disclosure to the intersection only. “Who can see what” and the activity log make access visible. Court gets a certificate **without gene names**. Relatives get a private nudge **without** the index person’s result. |
| 5 | **Safe linkage to services** — screening → counselling → confirmatory / reproductive genomics path | The live demo walks booking from the phone, the counsellor record, the stamped certificate and the onward referral path so nobody is left with a result and no next step. |
| 6 | **Measurable comprehension and access** — understanding, uptake, time to referral, privacy, equity | The health-system view shows illustrative pilot KPIs (first-try understanding, counselling uptake, days to referral) stratified by region, language and simple view — and explicitly **does not** count cancelled marriages as success. |

### Solution principles (what we refuse to do)

- We do **not** treat consanguinity as a problem to eliminate; we treat inherited **risk** as something to explain and manage with care.
- We do **not** let one partner’s non-shared genes appear on the other’s phone, in Ask answers, on the certificate or on a family invite.
- We do **not** let software issue a personal clinical recommendation or a marriage decision.
- We do **not** measure success by marriages avoided — only by understanding, access, privacy and timely referral.

### Who the solution serves

| Who | What they get from Satr |
| --- | --- |
| **Each partner** | Opens only their own result, in plain English or Arabic; optional simple view and Listen |
| **The couple (both agree)** | A private match that reveals **only genes both carry** — never the rest of either panel |
| **Ask Satr** | Answers from permissioned lookups; marriage / clinical questions are handed to a counsellor |
| **Genetic counsellor** | Desk with Tier 1 (can close) vs Tier 2 (refer to committee), plus questions Ask passed on |
| **Marriage court** | A screening certificate with **no gene or condition names**, checked by an on-screen leak scan |
| **Relatives** | An anonymous nudge to get screened — no index person’s result unless they choose to share |
| **Health system** | Illustrative KPIs: comprehension, uptake, time to referral, equity by language / literacy — never “marriages avoided” |

## Demo story (synthetic case)

All names and results are invented for the hackathon demo.

| Person | ID | Carries |
| --- | --- | --- |
| **Layla** | AD-18421 | USH2A, GJB2 |
| **Omar** | AD-18422 | USH2A, MEFV |

They are cousins. The only **shared** gene is **USH2A** (Usher syndrome type 2A): for each pregnancy, about **1 in 4** affected, **1 in 2** carrier, **1 in 4** neither.

**Privacy rule:** Layla must never see MEFV; Omar must never see GJB2 — not on a phone, not in Ask, not on a certificate or invite.

A second couple (**Mariam & Rashid**, AD-19004) is the hard case: two shared genes plus an uncertain finding — software cannot close it; it is referred to the committee.

## App surfaces

| View | Purpose |
| --- | --- |
| **Landing** | Problem, privacy story, interactive explainers (private match, 1-in-4 chance, role-based redaction), call to try the live demo |
| **Live demo (Stage)** | Layla’s and Omar’s phones side by side + presenter guide, “Who can see what” ledger, private-match panel, activity log |
| **Counsellor** | Clinical desk for the synthetic cases |
| **Court** | Issue / stamp the gene-free certificate |
| **Health system** | Programme-style dashboard (illustrative pilot figures) |
| **Agent flow** | Animated Ask Satr chatbot example + how Satr supports each role |

### Nine-step presenter guide

1. Layla opens her result  
2. Omar opens his result  
3. Both agree to share → private match + notifications  
4. Explain it in their own words (try a harmful reading to see the flag)  
5. Counsellor records the session  
6. Court issues the certificate  
7. Layla invites a relative  
8. Health-system view  
9. Agent flow (chatbot + role table)

Use **Do this step for me** or drive the phones yourself. **Start again** resets. **العربية** / **English** switches the whole UI (RTL for Arabic).

## Where to see the solution in the demo

| Outcome | Click / screen |
| --- | --- |
| Risk explanation | Phones → *My result* / *Together*; landing 1-in-4 playground |
| Values-sensitive choices | *Together* talk-about list; *Ask* → “Should we get married?” |
| Qualified counselling | Top nav → **Counsellor**; Ask hand-offs on the desk |
| Privacy workflows | Agree-to-share step; rail ledger; **Court**; family invite |
| Linkage to care | Booking on phone → counsellor record → stamped certificate |
| Measurable access | Top nav → **Health system**; then **Agent flow** for the chatbot + role story |

## How privacy is enforced

- A phone shows its owner’s genes only after they open their own result.
- A partner’s gene appears only if it is in the **intersection** **and** both have consented. Before that, naming a gene would itself leak status — so no gene name is shown.
- Court certificate and family invitation contain **no** gene or condition name.
- Ask never answers “should we marry?” or picks a medical path; it passes those to a counsellor.
- Automated checks (`npm run check`) cover content leaks, assistant answers and the PSI implementation.

## What’s implemented for real (not mocked)

| Piece | Location | Notes |
| --- | --- | --- |
| Diffie–Hellman private set intersection | `src/psi.ts` | Runs in the browser; demo-grade modulus; production would use a stronger group |
| Guardrailed Ask Satr | `src/loop.ts` | Plans permissioned tool calls; checks that forbidden genes never appear in replies |
| Explain-it-back scoring | `src/logic.ts` | Flags harmful readings in English and Arabic |
| Leak scans | content / court / invite | Certificate and invite text are scanned for gene and condition names |
| All UI copy | `src/strings.ts` | English and Arabic must stay in sync |

## What this hackathon build is (current implementation)

This repository is a **working front-end prototype** that proves the product logic end-to-end with synthetic people (Layla & Omar). It has:

- Dual-phone live demo, nine-step presenter guide, bilingual UI  
- Browser Diffie–Hellman PSI, guardrailed Ask Satr, explain-it-back, leak checks  
- Counsellor / court / health-system / agent-flow views  

It has **no backend, no real patient data, no Malaffi connection**. State lives in the browser. That is enough to show *how* the challenge is solved; a production Satr would sit on Abu Dhabi’s existing health and identity stack as below.

## Prototype tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript |
| Bundler | Vite 8 |
| Motion | `motion` (`motion/react`) |
| State | Client reducer in `src/store.tsx` — **no backend** |
| Styles | `src/index.css`, `src/landing.css` (design tokens: palm / sand / gold) |
| Media | Pexels photos/videos streamed from CDN (`src/media.ts`); posters as fallback |

### Main source map

| File | Role |
| --- | --- |
| `src/store.tsx` | App state, views, guide step derivation |
| `src/content.ts` | People, findings, shared-result and court copy |
| `src/logic.ts` | Intent + explain-it-back scoring |
| `src/loop.ts` | Ask Satr plan / render / leak checks |
| `src/psi.ts` | Private set intersection |
| `src/strings.ts` | All bilingual UI strings |
| `src/Landing.tsx` / `Playground.tsx` | Marketing + interactive explainers |
| `src/Stage.tsx` / `Phone.tsx` | Live dual-phone demo |
| `src/Agent.tsx` | Agent flow + chatbot showcase |
| `src/Desks.tsx` | Counsellor, court, health system |
| `scripts/check.ts` | `npm run check` |

---

# 2. Building a full-fledged Satr (production path)

The challenge is not “another genome sequencer.” Abu Dhabi already has **premarital genetic screening**, the **Emirati Genome Programme**, **Malaffi** (health information exchange), accredited genetics services, and the marriage-court process. A full Satr is the **privacy-preserving communication and care-linkage layer** on top of those assets — so people understand results, reach counsellors, and share the minimum necessary data with partners, relatives and the court.

## How production Satr uses what Abu Dhabi already has

| Abu Dhabi / UAE resource | Role in full Satr |
| --- | --- |
| **Premarital / preconception genetic screening labs** | Source of panel findings (carrier status, variant class). Satr **reads** structured results; it does not reinterpret variants. |
| **Emirati Genome Programme / population genomics** | Long-term context for panel design and residual risk education (programme-approved content only). |
| **Malaffi (Abu Dhabi HIE)** | Exchange layer via **HL7 FHIR**: `DiagnosticReport` / genomics `Observation`, `Consent`, `ServiceRequest`, `Task`, `AuditEvent`. |
| **Department of Health – Abu Dhabi** | Clinical content governance, escalation rules, KPI definitions; hosting and cyber standards. |
| **Accredited genetic counsellors / clinical geneticists** | Only people who give clinical advice; Satr books, triages and documents — never substitutes. |
| **Marriage court / screening certificate process** | Receives a **gene-free** attestation that screening and counselling steps were completed — not full panels. |
| **UAE Pass / national digital identity** (typical pattern) | Strong identity for patients and staff; couples link accounts only with explicit consent. |
| **In-country cloud / data centres** | Health data localization (UAE Federal Law on ICT in health fields, PDPL, DoH cyber standards). |
| **Arabic + English (then other resident languages)** | First-class product languages; content reviewed by clinicians and native speakers. |

## End-to-end production architecture

```text
┌─────────────┐   UAE Pass    ┌──────────────────┐   FHIR    ┌─────────────┐
│ Citizen app │──────────────▶│ Satr API (UAE)   │◀─────────▶│ Malaffi HIE │
│ (web / PWA) │               │ consent · match  │           │ labs / EHR  │
└─────────────┘               │ booking · audit  │           └─────────────┘
                              └────────┬─────────┘
           ┌───────────────────────────┼───────────────────────────┐
           ▼                           ▼                           ▼
   ┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
   │ Counsellor    │         │ Court / cert    │         │ Programme KPIs  │
   │ workbench     │         │ (minimised)     │         │ (de-identified) │
   └───────────────┘         └─────────────────┘         └─────────────────┘
           │
           ▼
   Private match service (PSI / secure enclave) — returns ONLY shared-gene ids
```

### Technology stack a full build would need

| Layer | Technologies / approaches |
| --- | --- |
| **Clients** | React (or native) citizen app + counsellor / court / admin workbenches; Arabic RTL; offline-tolerant education packs for weak venues |
| **API & services** | UAE-hosted APIs (e.g. Node/Java/.NET): accounts, consent, results projection, booking, certificates, notifications |
| **Identity & access** | UAE Pass (or equivalent) + role-based access (patient, partner, counsellor, court clerk, programme admin); least privilege |
| **Interoperability** | HL7 FHIR R4 (+ genomics profiles) to Malaffi and lab/EHR systems; versioned clinician-approved content store |
| **Couple privacy match** | Production **private set intersection** or secure enclave / MPC so full panels never leave each vault; output = intersection gene ids only after dual consent |
| **Risk numerics** | **Deterministic** Mendelian calculators (not machine-learned scores); VUS never presented as risk |
| **Ask Satr (production)** | Answers grounded only in approved content + the asker’s permitted data; intent routing; automatic hand-off to counsellor for marriage / reproductive / ambiguous questions; leak tests in CI |
| **Consent & audit** | FHIR `Consent` records (purpose, recipient, data item, revocable); immutable `AuditEvent` log visible to the citizen |
| **Notifications** | SMS / app push / WhatsApp Business with **no gene names** in the message body |
| **Data platform** | Encrypted at rest/in transit; pseudonymized analytics warehouse; k-anonymity on public dashboards |
| **Ops & compliance** | DoH HICS-aligned hosting, penetration tests, break-glass clinician access fully audited, DPIA / PDPL documentation |

### Care pathway Satr would run in production

1. Lab posts screening result into Malaffi → citizen notified (“your result is ready”) with no detail in the push.  
2. Citizen opens **own** result in Satr (education + residual risk).  
3. Optional: both partners consent → private match → shared-result education + explain-it-back.  
4. Escalation rules book / queue an accredited counsellor (at-risk couple, VUS, X-linked, distress, “what should we do?”).  
5. Counsellor closes Tier 1 or refers Tier 2; optional confirmatory / reproductive-genomics `ServiceRequest`.  
6. Court receives minimised certificate; relatives may receive anonymous cascade invites.  
7. Programme dashboards measure comprehension, uptake, time-to-referral and equity — **never** cancelled marriages.

### Phased rollout (realistic)

| Phase | Scope |
| --- | --- |
| **0 — This prototype** | UX, privacy rules, PSI demo, Ask guardrails, role desks (this repo) |
| **1 — Pilot** | UAE hosting, UAE Pass, synthetic + limited real cohorts, counsellor workbench, FHIR read of reports, consent + audit |
| **2 — Programme** | Production PSI/enclave match, court certificate API, cascade invites, KPI warehouse, multi-language |
| **3 — Scale** | Deeper Malaffi write-back, reproductive-genomics referral tracking, equity monitoring across regions and literacy |

That is how a full-fledged Satr **solves the challenge using Abu Dhabi’s existing screening, exchange and clinical capacity** — without rebuilding genomics from scratch, and without turning software into a judge of marriage.

---

# 3. Run locally

## Requirements

- **Node.js 20+** (LTS recommended)
- **npm** (comes with Node)

Check versions:

```bash
node -v
npm -v
```

## Install and start the development server

```bash
git clone https://github.com/mmnauman/satr.git
cd satr
npm install
npm run dev
```

Then open **http://localhost:5173** in your browser.

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with hot reload (default port **5173**) |
| `npm run check` | Runs logic, content, Ask and PSI automated checks |
| `npm run build` | Typechecks and builds production assets into `dist/` |
| `npm run preview` | Serves the production build locally (default port **4173**) |
| `npm run lint` | Lint with oxlint |

### Suggested local workflow

```bash
npm install
npm run check    # privacy / logic checks
npm run dev      # develop against http://localhost:5173
```

### Walk the demo locally

1. Open the landing page (optional).
2. Click **Try the live demo**.
3. Press **Do this step for me** through all nine guide steps, or use the phones yourself.
4. Use the top nav for **Counsellor**, **Court**, **Health system**, **Agent flow**.
5. Switch language with **العربية** / **English**.
6. **Start again** resets the case.

**Note:** The landing page loads media from the Pexels CDN (needs internet). The live demo logic does not need a backend or API keys.

---

# 4. Deploy and run in production

Satr is a **static** single-page app. There is no Node server in production. You **build** once, then host the `dist/` folder on any static host (HTTPS recommended).

## Build the production bundle

```bash
cd satr
npm install
npm run check      # recommended before you ship
npm run build      # creates ./dist
```

What you get:

- Optimised JS/CSS/assets under **`dist/`**
- Entry file: **`dist/index.html`**

### Try the production build on your machine

```bash
npm run preview
```

Open **http://localhost:4173** — this is the same kind of build you deploy publicly.

## Deploy to a public URL

Pick one host. After deploy, the HTTPS URL of the landing page is your **deployed link** for submission.

### Option A — Vercel (fastest)

1. Push this repo to GitHub (`https://github.com/mmnauman/satr`).
2. Sign in at [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Settings:
   - Framework: **Vite**
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
4. Deploy → you get a URL like `https://satr-xxxx.vercel.app`.

CLI:

```bash
npx vercel        # preview deployment
npx vercel --prod # production deployment
```

### Option B — Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → Import from Git.  
   **Or** run `npm run build` and drag the `dist/` folder onto [Netlify Drop](https://app.netlify.com/drop).
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Deploy → URL like `https://xxxx.netlify.app`.

### Option C — Cloudflare Pages

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → Create → Connect Git.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Deploy.

### Option D — Any static host / your own server

Upload the contents of `dist/` (not the folder name alone — the *files inside* `dist/`) to your web root, e.g.:

```bash
npm run build
# then copy dist/* to your host, for example:
# rsync -avz dist/ user@server:/var/www/satr/
```

Serve with any static file server (nginx, Caddy, Apache, S3 + CloudFront, etc.). Example nginx root:

```nginx
server {
  listen 443 ssl;
  server_name satr.example.com;
  root /var/www/satr;
  index index.html;

  # SPA: unknown paths fall back to index.html
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### GitHub Pages note

If the site is served from a **subpath** (`https://USER.github.io/satr/`), set in `vite.config.ts`:

```ts
export default defineConfig({
  base: '/satr/',
  plugins: [react()],
})
```

Rebuild, then publish `dist/`. For a root custom domain, leave `base` as `'/'` (the default).

## Production checklist

- [ ] `npm run check` passes  
- [ ] `npm run build` succeeds  
- [ ] Public URL opens the landing page over **HTTPS**  
- [ ] **Try the live demo** works end-to-end  
- [ ] Arabic (**العربية**) switches layout to RTL  
- [ ] Agent flow chatbot example plays  

Paste that HTTPS URL as the challenge **deployed link**.

---

## Media and licence

Photos and videos: [Pexels](https://www.pexels.com/license/) (sources in `src/media.ts`). Icons and UI animations are original.

Hackathon prototype for demonstration. Not affiliated with the Department of Health – Abu Dhabi. Not for clinical use.
