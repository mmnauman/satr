# Satr gap analysis (after judges' feedback)

## What the judges said

> The prototype is a scripted, presenter-guided simulation… you can only play the preset questions… let users type their own questions and answer them from the couple's own results, with the same consent rules… let users enter or upload their own sample genetic report… so the explanation, partner sharing and counsellor summary update from real inputs. Keep Arabic and English and the booking step.

They praised Masar for being a **working application**: role-based sign-in, a server that keeps each person's data, consent-checked views, report upload, an assistant grounded in the person's own data, a clinic queue and a health-system view fed by real records.

## Where Satr stands today

| Area | Status | Evidence |
|---|---|---|
| Free-text questions on the phone and in the agent view | Done (uncommitted) | `AskScreen` in `Phone.tsx`, `sendQuestion` in `Agent.tsx`, intent engine in `logic.ts` |
| Free-text questions on the overview page | Done in this pass | `LiveAsk` in `Journey.tsx` |
| Upload or enter your own report (JSON, CSV, VCF, text, gene picker) | Done (uncommitted) | `ReportModal.tsx`, `adapters/reportParser.ts` |
| Live pairing with a 6-character code | Works in one browser only | `localBrowserAdapter.ts` (localStorage and BroadcastChannel) |
| Server persistence | Only with a Neon `DATABASE_URL`. Without it, every `/api/cases` call returns 503 and the app falls back to one browser | `api/cases/*.ts` |
| Role-based access for staff | **Missing** | No sign-in. `GET /api/cases/:code?role=counselor` returns both full reports to anyone with the code. `GET /api/cases?role=counselor` lists every case to anyone |
| Participant privacy in the UI | **Leak found** | A participant (Khalid, not yet agreed to share) clicks "Counsellor" in the top bar, and his browser loads Noura's private PAH and CFTR |
| Counsellor sees only what the couple agreed to | **Missing** | Counsellor projection is the full canonical record, with no consent step for the counsellor |
| Links and routing | **Missing** | No URLs per role, no partner invite link. Everything lives in reducer state |
| Running on two phones | **Missing** | No LAN dev script. `vite preview` has no API |
| Counsellor summary, court certificate, system metrics from live cases | Partly done | Desks read `state.files`, and `computeSystemMetrics` aggregates stored cases. These need staff tokens and live refresh |

## Phase 1: make it a working application

1. **A server store that always works.** `/api` uses Neon when `DATABASE_URL` is set, and otherwise a JSON file store in `.data/`. Two phones on the same Wi-Fi can pair. The browser-only adapter stays as the fallback for static hosting.
2. **Role-based sign-in.** Applicants start or join a case. Staff (genetic counsellor, court clerk, health-system analyst) sign in with an access key and get a signed, expiring token. The API enforces the role on every staff read and write.
3. **Consent-scoped counsellor access.** A case reaches the counsellor queue only after the couple books. The counsellor sees the shared result, plus each person's full result only if that person allowed it. Every staff view is written to the activity log that the couple can see.
4. **Routing and invite links.** `#/me`, `#/join/CODE`, `#/staff`, `#/counsellor`, `#/court`, `#/system`, `#/demo` and `#/how`. A partner invite link with copy and share.
5. **Role-aware navigation.** A participant sees only their own screens. Staff see only their desk. The guided demo keeps every view, clearly labelled as simulated.
6. **Checks.** New `npm run check` cases: a participant token cannot read staff views, staff cannot read without a token, the counsellor cannot see an unconsented private gene, and the court record has no gene names.

## Phase 2: UI revision (later)

Editorial poster type and the scroll route (inspired by Delta Cafés and Expedia Route 66) are started on the overview page. The phone, workspace, desks and report window get the same treatment once Phase 1 is solid.

## Status after Phase 1

Done and checked in the browser:

- Server store (Neon or file), staff sign-in with signed tokens, and consent-scoped counsellor access, all enforced on the server.
- Private sign-in links for applicants, partner invite links, and hash routes for every screen.
- Care path after counselling: confirmatory test, reproductive-genomics referral (at the couple's request), committee referral and the counsellor's summary, each with its date. The court never sees any of it.
- Privacy centre: sharing consent, counsellor consent, download my data, remove my report.
- Live health-system figures: first-try understanding, counselling uptake, median days to counselling and to referral, care-path counts, blocked access, and first-try understanding by language and simple view.
- Demo access page: sample couples at five stages, a sign-in link per person, staff sign-in, reset.
- Upload your own report on the start screen.
- A production Node server and a Dockerfile.
- The guided demo uses the same components, and its counselling step now records a confirmatory test and a summary.
