# Satr · ستر

Satr helps couples in Abu Dhabi understand their premarital genetic screening together, without giving up their privacy. Each person reads their own result. If both agree, a private set intersection reveals only the genes they both carry. They explain it in their own words, and a genetic counsellor, the marriage court and the family each receive only what they need.

Built for the challenge: *help individuals, families and health systems identify, understand and reduce inherited disease risks associated with consanguinity, through culturally appropriate, privacy-preserving technology.*

## Run it

```bash
npm install
npm run dev
```

Open the app, read the overview, then choose **Try the live demo**. In the demo, Layla's and Omar's phones sit side by side. The **Presenter guide** on the right is a table of all nine steps, and it stays put while the other panels scroll. Press **Do this step for me** for each one, or tap the phones yourself. The top bar switches to the counsellor, court, health-system and agent-flow views. You can also switch everything to Arabic from the top bar.

## How it maps to the six outcomes

| Outcome | Where to see it |
| --- | --- |
| 1. Risk explanation | *My result* and *Together* on each phone: plain-language results, the 1-in-4 picture, simple view and audio |
| 2. Values-sensitive choices | *Together* → “What would you like to talk about?”; ask the assistant “Should we get married?” |
| 3. Qualified human counselling | Counsellor view: Tier 1 case closed by a counsellor, Tier 2 referred to the committee, questions the assistant passed on |
| 4. Privacy-preserving family workflows | Two-person consent, the private match panel, the “Who can see what” ledger, the activity log, the anonymous family invitation |
| 5. Safe linkage to services | Booking from the phone, the counsellor's record, the certificate to the court, the referral funnel |
| 6. Measurable comprehension and access | Health-system view: first-try understanding by region, language and simple view; never counts cancelled marriages |

## What's real

- **Private set intersection** (`src/psi.ts`): genuine Diffie–Hellman PSI running in the browser. The modulus is chosen for the demo; production would use an elliptic-curve group.
- **Guardrailed assistant** (`src/loop.ts`): every answer is planned as permissioned tool calls, and an automated check proves no reply can leak a gene the asker isn't allowed to see.
- **Explain-it-back scoring** (`src/logic.ts`): flags harmful readings such as “I'm ill” or “we must not marry”, in English and Arabic.
- **Leak checks**: the court certificate and the family invitation are scanned for every gene and condition name.

```bash
npm run check   # logic, content, assistant and PSI checks
npm run build
```

Fictional people and invented results. Not a government service and not medical advice.

## Media

Photos and videos come from Pexels (free under the Pexels license) and stream from the Pexels CDN, so the landing page needs an internet connection; each video has a poster image as a fallback. The sources are listed in `src/media.ts`. Illustrations, icons and animations are original.
