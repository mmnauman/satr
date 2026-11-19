# SATR · demo video script (about 5 minutes)

**Story in one line:** a couple gets a carrier result, and Satr helps them understand it, share it only by consent, and reach a genetic counsellor, while the court and the health system see only what they need.

**What the judges asked for, and where they see it:**
- Typing your own questions → scene 6
- Your own report instead of the fixed case → scene 4
- Explanation, partner sharing and counsellor summary from real inputs → scenes 5 to 10
- Arabic and English, and booking a counsellor → scenes 5 and 9

**Rule for the whole video:** never use "Do this step for me". Everything is clicked live in the real application.

---

## Set-up (10 minutes before recording)

1. Run `npm run dev` and open `http://localhost:5173` in Chrome at **1440 × 900** with **110% zoom**. Turn on cursor highlighting in your recorder.
2. Click **See how Satr works**, then press **Start a fresh demo** once.
3. Have `public/samples/noura-thalassemia-panel.json` ready to upload.
4. Do one full silent rehearsal, then press **Start a fresh demo** again before the real take.
5. Record each scene as its own clip; it's easier to retake one scene than the whole video.

---

## 0:00 – 0:15 · Cold open
**Screen:** overview page hero, "YOUR GENES are YOURS TO SHARE". Let the headline animate in.

**Voice:**
> "In Abu Dhabi, every couple is screened before marriage. The lab gives a result. But what does it mean, who should see it, and what happens next?"

**Caption:** *SATR (ستر), meaning "discretion"*

## 0:15 – 0:40 · The problem
**Screen:** scroll to the four statistics (570 · 2,428 · 92%+ · ~10), then to "A correct result can still cause harm".

**Voice:**
> "570 genes screened. Most couples share nothing at all. But 'carrier' is heard as 'ill', and '1 in 4' as a verdict. Results get shared with the wrong people, and there are about ten genetic counsellors in the country."

## 0:40 – 0:50 · "This is how Satr works"
**Screen:** click **See how Satr works**. The demo hub opens with the gold Demo bar.

**Voice:**
> "This is how Satr works. This is the real application, not a slideshow. I'll be each person in turn."

## 0:50 – 1:20 · Sara brings her own report
**Screen:** Demo bar, **Start your own case**, then **I'm starting**. Type the name **Sara**, choose **Upload my own report** and pick the JSON file. The genes that were read appear. Press **Create private screening session**.

**Voice:**
> "Sara uploads her own lab report. Satr reads it on her device and shows her what it found before anything is saved."

**Screen:** point at the pairing-code ticket, then press **Copy link** under **Invite your partner**.

## 1:20 – 1:40 · Faisal joins privately
**Screen:** Demo bar, **Start your own case**. Paste the invite link in the address bar; the form opens on **My partner sent me a code** with the code filled in. Type **Faisal**, choose the sample **Khalid · HBB + CFTR (CSV)**, and press **Join with pairing code**.

**Voice:**
> "Faisal joins with his own report. Neither of them can see the other's results. Not yet, and maybe never."

## 1:40 – 2:05 · Reading your own result, in your own language
**Screen (as Faisal):** **Open my result**. Press **Simple view**, then **Listen**, then the globe to switch to **العربية** for three seconds, and back.

**Voice:**
> "Each person reads their own result first, in plain Arabic or English, with a simple view and audio. A carrier is healthy. This is not a diagnosis."

## 2:05 – 2:30 · Ask anything, and see the limits
**Screen (as Sara, using the Demo bar):** **Open my result**, then the **Ask** tab. Type:
1. *"Does Faisal carry anything else, like CFTR?"* → Satr won't reveal his private results.
2. *"My family says we must cancel the wedding. Should we?"* → Satr declines and shows **Passed to your counsellor**.

**Voice:**
> "She can ask anything in her own words. Satr answers only from what she is allowed to see, and it never makes a family's decision for them. That goes to a counsellor."

## 2:30 – 2:50 · Consent, then a private match
**Screen:** as Sara, **Together** → **Yes, I agree to share**. Switch to Faisal and do the same. The toast "Private match complete" appears, and the screen shows **HBB** only.

**Voice:**
> "Nothing is compared until both agree. Then a private match reveals only the gene they both carry. Sara's other finding and Faisal's other finding never leave their owners."

## 2:50 – 3:10 · Explain it back
**Screen (as Sara):** **Explain** → **Try a harmful reading** → **Check my answer**. Satr corrects it gently. Then type a correct answer in her own words. Finish the remaining questions for both of them (use **Show me an example** for speed).

**Voice:**
> "Before counselling, each person explains the result back. Misreadings like 'I'm ill' or 'we must not marry' are caught here, not at home."

## 3:10 – 3:25 · Booking, with privacy in her hands
**Screen (as Sara):** **Book counselling**, pick a slot, tick **Let my genetic counsellor see my full result**. Open **Privacy and my data** for two seconds and point at the activity log.

**Voice:**
> "She books a counsellor, chooses exactly what the counsellor may see, and can download or remove her data at any time. Every view is logged where she can see it."

## 3:25 – 4:00 · The genetic counsellor
**Screen:** Demo bar → **Genetic counsellor**. Open **Sara & Faisal**. Point at:
- the shared gene, and Sara's full result (she agreed);
- Faisal's other findings missing (he didn't agree);
- both people's own words, and the wedding question Satr passed on.

Press **Record counselling session** → **Arrange a confirmatory test**, write one line in the summary box, then **Share summary with the couple**.

**Screen:** Demo bar → Sara → **Care path**. Each step is listed with its date.

**Voice:**
> "The counsellor starts where Satr left off: what the couple understood, and what they asked. From result to counselling to a confirmatory test, every step is traceable, and the couple sees it too."

## 4:00 – 4:10 · When software must step back
**Screen:** Demo bar → **Genetic counsellor**, open **Mariam & Rashid**.

**Voice:**
> "Two shared genes and an uncertain finding. Satr gives no figure. This goes to the screening committee."

## 4:10 – 4:30 · The marriage court
**Screen:** Demo bar → **Marriage court clerk**. Show the register figures, search "Sara", open the certificate, and point at the scanner showing **0**. Press **Register certificate**.

**Voice:**
> "The court sees process steps only. Its own scanner confirms not a single gene or condition name, and the registration appears in the couple's own log."

## 4:30 – 4:50 · The health system
**Screen:** Demo bar → **Health-system analyst**.

**Voice:**
> "And the health system measures what matters, from real cases: understanding on the first try, counselling uptake, days to care, fairness across Arabic, English and simple view, and every blocked attempt to open someone else's file. Never a name, and never a cancelled marriage counted as success."

## 4:50 – 5:10 · Close
**Screen:** back to the overview page, then scroll the **route** quickly to the finish card, and end on the closing call to action.

**Voice:**
> "Satr. Understand your result. Share it only by consent. Reach the right counsellor. In Arabic and English, and without judging anyone's choices."

**End card:** *SATR · ستر · Private, plain-language premarital genetic screening*

---

## What makes it award-worthy

1. **Prove it's live.** Type questions on camera, upload a real file, and switch people with the Demo bar. Never use the presenter guide. This answers the judges' main criticism directly.
2. **Linger on the three privacy moments:** the private match revealing only HBB, the counsellor not seeing Faisal's other findings, and the court scanner showing 0. Pause and let the viewer read.
3. **Say the outcome, then show it.** Each voice line names what the brief asks for (explanation, consent, counselling, linkage, measurement) just before it appears on screen.
4. **Show Arabic.** Even three seconds of the full right-to-left interface lands strongly with this panel.
5. **Keep a human pace.** Slow cursor, one click at a time, 1–2 seconds of stillness after every result appears.
6. **Add captions** in English, with Arabic subtitles if you can, and keep background music low and calm.
7. **Check the figures** (570 genes, 2,428 couples by March 2025, 92%+, about 10 counsellors) against your sources before you publish.
