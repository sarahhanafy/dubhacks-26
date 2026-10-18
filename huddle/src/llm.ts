// Optional AI help (OpenRouter or Gemini) for onboarding answers (PRD §7: the model interprets; code decides).
// Only the person's own answer is sent. Falls back to rule parsing when unset or on error.

import { AREAS, type Category } from "../../src/events/seattle.js";
import type { Profile } from "../../src/domain/discovery.js";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const CATS: Category[] = ["cafe", "sports", "swim", "outdoors", "music", "food", "art", "wellness", "community"];

const PROMPT = (answer: string) =>
  `Extract preferences from this text message. Only include what the person actually said.\n` +
  `Neighborhood must be one of: ${Object.keys(AREAS).join(", ")} (or null).\n\nMessage: ${JSON.stringify(answer)}`;

function toProfile(out: any): Partial<Profile> {
  const p: Partial<Profile> = {};
  if (Array.isArray(out?.interests) && out.interests.length) p.interests = out.interests.filter((c: string) => CATS.includes(c as Category));
  if (out?.neighborhood && AREAS[String(out.neighborhood).toLowerCase()]) p.home = AREAS[String(out.neighborhood).toLowerCase()];
  if (typeof out?.maxBudgetUsd === "number") p.maxBudget = out.maxBudgetUsd;
  if (Array.isArray(out?.when) && out.when.length) p.when = out.when.filter((w: string) => ["weekday_mornings", "weekday_evenings", "weekends"].includes(w));
  return p;
}

/** OpenRouter (OpenAI-compatible). Set OPENROUTER_API_KEY; optionally OPENROUTER_MODEL. */
async function parseWithOpenRouter(answer: string, key: string): Promise<Partial<Profile>> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}`, "X-Title": "What's Cooking" },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "openrouter/auto",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content:
          `Reply with only a JSON object: {"interests": string[] from [${CATS.join(", ")}], "neighborhood": string|null, ` +
          `"maxBudgetUsd": number|null, "when": string[] from [weekday_mornings, weekday_evenings, weekends]}.` },
        { role: "user", content: PROMPT(answer) },
      ],
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`openrouter ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? "{}";
  return toProfile(JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)));
}

/** Uses OpenRouter if configured, else Gemini, else nothing (the rule parser takes over). */
export async function parseProfileWithAI(answer: string): Promise<Partial<Profile>> {
  try {
    if (process.env.OPENROUTER_API_KEY) return await parseWithOpenRouter(answer, process.env.OPENROUTER_API_KEY);
  } catch (e) {
    console.warn("[whats-cooking] OpenRouter unavailable, trying next option:", (e as Error).message);
  }
  return parseProfileWithGemini(answer);
}

export async function parseProfileWithGemini(answer: string): Promise<Partial<Profile>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return {};
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT(answer) }] }],
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
    return toProfile(JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}"));
  } catch (e) {
    console.warn("[whats-cooking] Gemini unavailable, using rule parser:", (e as Error).message);
    return {};
  }
}
