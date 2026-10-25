---
name: satr
description: Full project context for Satr, our hackathon entry for Abu Dhabi's consanguinity and inherited-disease-risk challenge. Load it before any work in this repository, including features, copy, design, demo flow, commits and pitch prep, so changes stay consistent with the brief, the privacy rules, the writing voice and the team rules.
---

# Satr (ستر): project context

Satr is a React web app that helps couples in Abu Dhabi understand their premarital or preconception genetic screening privately. Each person reads their own result. If both agree, a private set intersection reveals only the genes they both carry. Each person explains the result in their own words before counselling, and the marriage court and relatives receive only what they need. The name means "covering" or "discretion" in Arabic.

We are competing for a **$50,000 hackathon prize**. Every change should make the demo more convincing against the brief below.

## Team rules (non-negotiable)

1. **Never mention AI anywhere.** No "Co-Authored-By", no "Generated with", and no mention of Claude, Cursor, ChatGPT or "AI" in commit messages, PR descriptions, README, code comments, UI copy or class names. Write all of it as plain, human-authored work.
2. **Commit as yourself.** Set your own `user.name` and `user.email` in the repo-local git config (`git config user.name "…"`). Never commit under someone else's identity.
3. **Ask before pushing or publishing.** The remote is `https://github.com/mmnauman/satr.git` (branch `main`).
4. Run `npm run check` and `npm run build` before committing. Both must pass.

## The challenge brief

> How might we help individuals, families and health systems identify, understand and reduce inherited disease risks associated with consanguinity through innovative, culturally appropriate and privacy-preserving technologies?

Abu Dhabi already runs population genomics and mandatory premarital genetic screening (570 genes). The unmet need is private, culturally and linguistically appropriate communication that links screening to counselling and care, protects genetic data, and never exposes one family member's information to another without permission. Consanguineous marriage is a respected practice, so the product must support informed choice and never judge or coerce.

**The six scored outcomes.** Tie every feature to one of these:

| # | Outcome | Where Satr shows it |
|---|---|---|
| 1 | Risk explanation: carrier vs diagnosis, couple risk, uncertainty, non-stigmatizing | Phone "My result" and "Together" screens, the 1-in-4 simulator, simple view, Listen buttons |
| 2 | Informed, values-sensitive choices, no coercion | Unranked "What would you like to talk about?" options; the assistant refuses "should we marry?" |
| 3 | Escalation to accredited genetics professionals; clear boundary between education, decision support and clinical advice | Counsellor desk: Tier 1 is closed by a counsellor, Tier 2 is referred to the committee; questions the assistant passes on |
| 4 | Privacy-preserving family workflows: consent, role-based access, minimization, audit | Two-person consent, private match, the "Who can see what" ledger, activity log, anonymous family invite, gene-free court certificate |
| 5 | Traceable linkage: screening → counselling → confirmatory test → reproductive genomics | Booking from the phone, counsellor record, certificate, referral funnel |
| 6 | Measurable comprehension, uptake, time to referral, privacy and equity across language and literacy, never counting cancelled marriages as success | Health-system view: first-try understanding by region, language and simple view |

Programme figures used in the UI (from the original sources; re-verify before presenting): 570 genes; 2,428 couples screened by March 2025; 92%+ share no disease-causing change; about 10 genetic counsellors in the UAE in 2023. Health-system KPIs (74%, 91%, 4 days, 0) are **illustrative pilot figures** and must stay labelled that way.

## The synthetic case

All people and results are fictional.
- **Layla** (AD-18421) carries USH2A and GJB2. **Omar** (AD-18422) carries USH2A and MEFV. They are cousins.
- The only shared gene is **USH2A** (Usher syndrome type 2A): 1 in 4 affected, 1 in 2 carrier, 1 in 4 neither, for each pregnancy.
- Layla must never see MEFV, and Omar must never see GJB2, on any screen or in any assistant answer.
- **Mariam & Rashid** (AD-19004) are the hard case: two shared genes (CYP21A2, CFTR) plus an uncertain ABCA4 change. Software cannot close it, so it is referred to the committee.

## How the app is organised

Vite + React 19 + TypeScript, with `motion` (v12, `motion/react`) for animation. There is no backend; all state lives in a reducer.

| File | What it does |
|---|---|
| `src/store.tsx` | Reducer and state: views (`landing`, `stage`, `counselor`, `court`, `system`), each phone's screen, consent, explain-it-back steps, booking, audit log. `guideStep()` derives the 8-step presenter guide from state. |
| `src/content.ts` | People, findings, shared-result text, assistant replies, invite text, court rows, explain-it-back prompts and samples, plus `runContentChecks()` |
| `src/logic.ts` | Explain-it-back scoring (`scoreAnswer`) and question intent (`interpret`), English and Arabic. Flags harmful readings like "I'm ill" or "we must not marry". |
| `src/loop.ts` | The guardrailed assistant: each answer is planned as permissioned tool calls, and `runAgentChecks()` proves no answer leaks a gene the asker may not see. Tool labels shown to users are friendly ("Checked your shared result"), never internal ids. |
| `src/psi.ts` | Real Diffie–Hellman private set intersection (Mersenne prime 2^127−1, demo-grade). Checked by `runPsiChecks()`. |
| `src/strings.ts` | **All UI copy**, English and Arabic (`ar: Strings` must mirror `en`). Use `t(lang)` and `fill(template, values)`. |
| `src/Landing.tsx` | Landing page: video hero, ticker, count-up stats, pinned cousin-marriage family-tree section, problem cards, pinned phone story, then the playground sections, chat demo, outcome cards and closing call to action |
| `src/Playground.tsx` | Interactive explainers: `MatchPlayground`, `Simulator` (1 in 4), `RoleLens` (live redaction by role), `ChatDemo` |
| `src/Stage.tsx` | Live demo: Layla's and Omar's phones side by side, plus the rail (presenter guide, ledger, private-match panel, activity log). `GuideDock` floats on staff views. |
| `src/Phone.tsx` | The phone app: Home, My result, Together, Explain, Ask, Family screens, simple view, Listen, notification toasts |
| `src/Desks.tsx` | Counsellor desk, court certificate with leak scanner and stamp, health-system dashboard |
| `src/fx.tsx` | Motion helpers: `Reveal`, `SplitWords`, `CountUp`, `VideoBg` (plays only on screen), `Magnetic`, `Spotlight`, `Scramble` |
| `src/visuals.tsx` | Icon set, eight-point-star `Mark`, `Seal`, `FamilyTree`, `RiskPicture` |
| `src/media.ts` | Pexels videos and photos, streamed from the Pexels CDN, each with a poster |
| `src/index.css` / `src/landing.css` | Design tokens and app styles / landing-page styles |
| `scripts/check.ts` | Runs every check (`npm run check`) |

## Privacy invariants (enforced by checks; never break them)

- A phone shows its owner's genes only after they open their own result.
- A partner's gene appears only if it is in the intersection **and** both have consented. Before that, no gene name is shown, because naming it would itself reveal the partner's status.
- The court certificate and the family invitation contain no gene or condition name. The court view scans its own text.
- The assistant never answers "should we marry?" or picks a medical path; it hands the question to a counsellor.
- New copy that mentions genes must pass the leak checks in `content.ts` and `loop.ts`. Add a check whenever you add a disclosure surface.

## Writing voice

The team rejected the earlier copy for sounding robotic and machine-written. Rules:
- Warm, plain, second-person **full sentences that explain why**. No fragments like "Held" or "Couple payload".
- Use one consistent glossary: **your result**, **your shared result**, **genetic counsellor**, **agree to share**, **explain it in your own words**, **screening certificate**, **healthy carrier**.
- Never judge cousin marriage. Say that most cousin couples share nothing, and that a shared change is nobody's fault.
- A chance is never presented as a certainty, and a cancelled marriage is never a success.
- Every string needs a natural Arabic version, not a literal translation. Check right-to-left layout after changes.

## Design system

- **Palette:** night `#0a1f1a`, palm `#0f3d33`, sand `#f5efe3`, gold `#c9973a` / `#e9c983`, mint `#dcece4`, clay `#b4523b` for warnings. The tokens live in `:root` in `index.css`.
- **Type:** Fraunces for display, Figtree for body; IBM Plex Sans Arabic and Noto Naskh Arabic in RTL; JetBrains Mono for gene names.
- **Motifs:** an eight-point-star geometric pattern (`--pattern`), glass cards, film grain, gold glows.
- **Motion:** use the `fx.tsx` helpers and the shared `ease` curve. Animate on scroll or state change, and respect reduced motion.
- **Media:** Pexels, streamed. Credit new photographers in `CREDITS` in `media.ts`. The landing page needs internet; posters cover a slow connection.
- **Breakpoints:** 1220px (rail drops below the phones), 1080/1020px (single-column landing), 820px (one phone at a time with a switcher), 680/640px (phone width).

## Running and demoing

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # logic, content, assistant and PSI checks
npm run build
```

Demo flow: Overview → **Try the live demo** → press **Do this step for me** eight times. The steps are: Layla opens, Omar opens, both agree (private match and notifications), explain it in their own words (try "Try a harmful reading"), counsellor records the session, court issues the certificate, Layla invites her cousin, health-system view. **Start again** resets the case. The globe button switches to Arabic.

## Open ideas

- A preconception path for couples who are already married, as an explicit entry point.
- Offline copies of the stock media if the venue Wi-Fi is weak.
- Code-splitting to cut the ~165 KB gzipped bundle.
- A short pitch script that walks the six outcomes in demo order.
