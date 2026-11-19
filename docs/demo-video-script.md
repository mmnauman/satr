# Satr demo video: script and shot list

About 6 minutes. The video follows the same order as the website: the overview page tells the story, then the live app proves it, one person at a time, and the staff desks close the loop. Every step on screen maps to one of the six outcomes in the brief.

All people and results are fictional.

---

## Before you record (5 minutes)

1. Start the app: `npm run dev` (or the production server), and open it in one browser window.
2. Press **See how Satr works**. This opens the demo hub (`#/demo`), the real application loaded with five fictional couples. Press **Start a fresh demo** once, so the server holds only those couples.
3. You present from **one window**. The gold **Demo** bar at the top always says who you are (“You are Noura”) and lets you become anyone else: any person in any couple, any staff role, or a new person.
4. Keep a report file ready to upload, for example `public/samples/noura-thalassemia-panel.json`.
5. Zoom the browser to 110% so text reads well on video. Turn notifications off.

**Open the video with:** *“This is how Satr works.”* Then show the real application, person by person, as below.

**One sentence to remember:** *Satr lets each person read their own result first, compares results only when both agree, explains them in plain Arabic or English, and hands the couple to a genetic counsellor, while the court and the health system see only what they need.*

---

## Scene 1 · The problem and the promise (0:00–0:40) · Outcome 1

**On screen:** the overview page hero.

**Say:**
> Abu Dhabi already screens couples before marriage across 570 genes. The hard part comes after the lab: understanding what “carrier” means, sharing it without exposing anyone, and reaching a genetic counsellor. Satr is built for that moment.

**Do:** type a question into the hero box, for example *“Does carrying a gene mean I am ill?”* and press **Ask**. The page scrolls to the answer.

**Say:**
> You can ask anything in your own words. The answer comes from the couple’s own results, with the same privacy rules as the real app.

**Do:** switch **Asking as** to Omar, then ask *“What else does Layla carry?”*. Point at the privacy check under the answer.

---

## Scene 2 · The whole journey in one scroll (0:40–1:05) · Outcomes 4 and 5

**On screen:** scroll slowly through **One clear route**.

**Say:**
> This is the route every couple takes. Each stop says who can see what. Nothing moves forward without both people agreeing, and most couples take the short road straight to their certificate.

Pause on stop 4 (the fork: most couples share nothing) and on the finish (a certificate that never names a gene).

---

## Scene 3 · Noura starts with her own report (1:05–1:40) · Outcomes 1 and 4

**Demo bar:** choose **Start your own case** (or click **Start with your own report** on the overview page).

**Say:**
> There are four steps: add your report, invite your partner, agree to share, and talk to a counsellor.

**Do:** choose **I’m starting**, set the report to **Upload my own report**, and pick the file. The genes that were read appear before anything is saved. Press **Create private screening session**.

**Say:**
> Noura’s report stays on her side. She gets a private link to come back later, and an invite link for her partner.

**Do:** press **Copy link** under **Invite your partner**.

---

## Scene 4 · Khalid joins from the invite link (1:40–2:00) · Outcome 4

**Demo bar:** choose **Start your own case** again, so you are now a second person. Paste the invite link in the address bar (or choose **My partner sent me a code** and type the code). Choose his report and press **Join with pairing code**.

From now on, switch between the two of them with the **Demo** bar. Both appear under **People you added**.

**Say:**
> Khalid joins with his own report. Neither of them can see the other’s results.

(If you mistype the code, the page says so and tells you what to do. That's fine to show.)

---

## Scene 5 · Reading your own result, then agreeing to share (2:00–2:50) · Outcomes 1, 2 and 4

**As each of them (switch with the bar):** press **Open my result**.

**Say:**
> Each person reads their own result first, in plain words, with a simple view and a Listen button. A carrier is healthy; this is not a diagnosis.

**Do (as Noura):** open **Ask** and type *“Does Khalid have anything else, like CFTR?”*. The answer never names his private findings.

**Do (as Noura):** type *“My family says we must cancel the wedding. Should we?”*.

**Say:**
> Satr never makes that decision. It hands the question to a genetic counsellor.

**Do:** as Noura, then as Khalid, open **Together** and press **Yes, I agree to share**.

**Say:**
> Only when both agree does a private match run. It reveals only the gene they both carry, HBB. Everything else stays with its owner.

---

## Scene 6 · Explaining it in their own words (2:50–3:20) · Outcomes 1 and 6

**Do (as Noura):** open **Explain**. For the first question, press **Try a harmful reading** and **Check my answer**. Satr gently corrects it. Then type a correct answer in your own words.

**Say:**
> Before counselling, each person explains the result back. Misreadings like “I’m ill” or “we must not marry” are caught here, not at home.

**Optional:** press the globe to switch to **العربية** for a few seconds, to show the whole app in Arabic, then switch back.

Finish the three questions for both of them (use **Show me an example** as Khalid to save time).

---

## Scene 7 · Booking and privacy controls (3:20–3:50) · Outcomes 3, 4 and 5

**Do (as Noura):** press **Book counselling**, pick a slot, and tick **Let my genetic counsellor see my full result**.

**Do (as Noura):** open the **Privacy and my data** tab.

**Say:**
> Noura controls everything: who sees what, every view in her activity log, a download of her own data, and removing her report entirely.

---

## Scene 8 · The genetic counsellor (3:50–4:40) · Outcomes 3 and 5

**Demo bar:** choose **Genetic counsellor**.

**Say:**
> Staff sign in separately. The counsellor only sees couples who booked.

**Do:** open Noura and Khalid. Point out:
- the shared gene HBB, and Noura’s other finding, because she agreed;
- Khalid’s other findings are **not** shown, because he did not agree;
- both people’s own words, and the question Satr passed on.

**Do:** press **Record counselling session**, then **Arrange a confirmatory test**, write a short summary, and press **Share summary with the couple**.

**Demo bar:** switch back to Noura and open **Care path**. The session, the test and the summary are there with their dates.

**Say:**
> From result to counselling to a confirmatory test, every step is traceable, and the couple sees it too.

---

## Scene 9 · The complex case (4:40–5:00) · Outcome 3

**Do:** in the counsellor queue, open **Mariam & Rashid** (loaded from Demo access).

**Say:**
> Two shared genes and an uncertain finding. Software doesn’t close this one. It goes to the screening committee, and Satr gives no figure.

---

## Scene 10 · The court and the health system (5:00–5:40) · Outcomes 4 and 6

**Demo bar:** choose **Marriage court clerk**. The register lists every couple with where they are in the process. Search for Noura, open her certificate, and press **Register certificate**.

**Say:**
> The court sees process steps only. It gets proof that screening and counselling happened, its own scanner confirms there isn’t a single gene or condition name on the certificate, and registering it is written to the couple’s own activity log.

**Demo bar:** choose **Health-system analyst**.

**Say:**
> The health system sees real figures from the cases on the server: first-try understanding, counselling uptake, days from result to counselling and to referral, understanding by language and simple view, and every blocked attempt to open someone else’s file. Never a name or a result, and a cancelled marriage is never counted as success.

---

## Closing (5:40–6:00)

**On screen:** the overview page outcomes section or the closing call to action.

**Say:**
> Satr helps couples understand inherited risk, share it privately, and reach the right genetic counselling, in Arabic and English, without judging anyone’s choices.

---

## How the flow maps to the brief

| Outcome in the brief | Where it is shown |
|---|---|
| 1. Risk explanation | Scenes 1, 5, 6 |
| 2. Informed, values-sensitive choices | Scene 5 (Satr declines the marriage question) |
| 3. Qualified human counselling | Scenes 7, 8, 9 |
| 4. Privacy-preserving family workflows | Scenes 2, 3, 4, 5, 7, 10 |
| 5. Safe linkage to services | Scenes 2, 7, 8 |
| 6. Measurable comprehension and access | Scenes 6, 10 |

## If something goes wrong while recording

- **Wrong pairing code:** the join screen explains what to do. Switch back to Noura with the Demo bar and copy the invite link again.
- **Lost someone:** everyone you added is listed in the Demo bar under **People you added**.
- **Short on time:** skip scenes 3–4 and use the sample couples instead: **Be Noura** and **Be Khalid** (already booked), **Be Layla** (fresh), and **Mariam & Rashid** (referred).
- **Showing both phones at once on a big screen:** open **Side-by-side phones** from the demo hub.
