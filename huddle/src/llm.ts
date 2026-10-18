// Optional Gemini help for onboarding answers (PRD §7: the model interprets; code decides).
// Only the person's own answer is sent. Falls back to rule parsing when unset or on error.

import { AREAS, type Category } from "../../src/events/seattle.js";
import type { Profile } from "../../src/domain/discovery.js";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const CATS: Category[] = ["cafe", "sports", "swim", "outdoors", "music", "food", "art", "wellness", "community"];

export async function parseProfileWithGemini(answer: string): Promise<Partial<Profile>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return {};
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text:
          `Extract preferences from this text message. Only include what the person actually said.\n` +
          `Neighborhood must be one of: ${Object.keys(AREAS).join(", ")} (or null).\n\nMessage: ${JSON.stringify(answer)}` }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              interests: { type: "ARRAY", items: { type: "STRING", enum: CATS } },
              neighborhood: { type: "STRING", nullable: true },
              maxBudgetUsd: { type: "NUMBER", nullable: true },
              when: { type: "ARRAY", items: { type: "STRING", enum: ["weekday_mornings", "weekday_evenings", "weekends"] } },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const out = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");
    const p: Partial<Profile> = {};
    if (Array.isArray(out.interests) && out.interests.length) p.interests = out.interests.filter((c: string) => CATS.includes(c as Category));
    if (out.neighborhood && AREAS[out.neighborhood.toLowerCase()]) p.home = AREAS[out.neighborhood.toLowerCase()];
    if (typeof out.maxBudgetUsd === "number") p.maxBudget = out.maxBudgetUsd;
    if (Array.isArray(out.when) && out.when.length) p.when = out.when;
    return p;
  } catch (e) {
    console.warn("[huddle] Gemini unavailable, using rule parser:", (e as Error).message);
    return {};
  }
}
