import type { IncomingMessage, ServerResponse } from "node:http";
import { readJsonBody, sendJson } from "./_lib/db";

/**
 * Optional grounded synthesis endpoint:
 * Receives ONLY already-redacted tool observations for the viewer (never the partner's private report).
 * When SATR_SYNTHESIS_KEY / SATR_SYNTHESIS_URL are not set, returns { enabled: false } so the client
 * uses Satr's deterministic catalog phrasing immediately.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const endpoint = process.env.SATR_SYNTHESIS_URL?.trim();
  const apiKey = process.env.SATR_SYNTHESIS_KEY?.trim();
  const model = process.env.SATR_SYNTHESIS_MODEL?.trim();

  if (!endpoint || !apiKey || !model) {
    sendJson(res, 200, { enabled: false });
    return;
  }

  try {
    const body = await readJsonBody<{
      question?: string;
      permittedObservationsEn?: string[];
      permittedObservationsAr?: string[];
      baselineEn?: string;
      baselineAr?: string;
    }>(req);

    const prompt = [
      "Rewrite the approved genetic screening explanation in warm, plain, non-directive second-person language.",
      "Rules: (1) Use ONLY the permitted observations below; never invent genes, percentages, or clinical recommendations.",
      "(2) Distinguish carrier status from illness/diagnosis and state that chances apply per pregnancy.",
      "(3) Never judge consanguinity and never advise for or against marriage.",
      'Return JSON: {"speechEn": "...", "speechAr": "..."}',
      `User question: ${body.question ?? ""}`,
      `Permitted observations (EN): ${(body.permittedObservationsEn ?? []).join(" | ")}`,
      `Approved baseline (EN): ${body.baselineEn ?? ""}`,
      `Approved baseline (AR): ${body.baselineAr ?? ""}`,
    ].join("\n");

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!upstream.ok) {
      sendJson(res, 200, { enabled: false });
      return;
    }

    const completion = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const rawContent = completion.choices?.[0]?.message?.content;
    if (!rawContent) {
      sendJson(res, 200, { enabled: false });
      return;
    }
    const parsed = JSON.parse(rawContent) as { speechEn?: string; speechAr?: string };
    sendJson(res, 200, {
      enabled: true,
      speechEn: parsed.speechEn,
      speechAr: parsed.speechAr,
    });
  } catch {
    sendJson(res, 200, { enabled: false });
  }
}
