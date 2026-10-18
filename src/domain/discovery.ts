// Deterministic event discovery: hard filters first, then a transparent score.
// The LLM never decides what's eligible; it can only help phrase the result.

import { AREAS, type Category, type CommunityEvent } from "../events/seattle.js";

export interface Area { lat: number; lng: number; label: string }

export interface Profile {
  interests: Category[];
  /** Neighborhoods they hang out in. Distance is measured from the closest one. */
  areas?: Area[];
  /** Legacy single area; used when `areas` is empty. */
  home?: Area;
  maxBudget?: number;
  maxDistanceKm?: number;
  /** When they're usually free. Empty = any time. */
  when: ("weekday_mornings" | "weekday_evenings" | "weekends")[];
  beginnerOnly?: boolean;
}

export interface Pick {
  event: CommunityEvent;
  distanceKm?: number;
  score: number;
  reasons: string[]; // shown to the user; built only from their own profile + public event fields
}

const toRad = (d: number) => (d * Math.PI) / 180;
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371, dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Local weekday (0=Sun) and hour in Pacific time. */
function localParts(iso: string, tz = "America/Los_Angeles") {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(new Date(iso));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.find((x) => x.type === "weekday")!.value);
  return { wd, hour: +p.find((x) => x.type === "hour")!.value };
}

export function areasOf(p: Profile): Area[] {
  return p.areas?.length ? p.areas : p.home ? [p.home] : [];
}

/** Closest of the person's areas to a point. */
export function nearestArea(p: Profile, pt: { lat: number; lng: number }): { km: number; area: Area } | undefined {
  let best: { km: number; area: Area } | undefined;
  for (const area of areasOf(p)) {
    const km = distanceKm(area, pt);
    if (!best || km < best.km) best = { km, area };
  }
  return best;
}

export function slotOf(iso: string): Profile["when"][number] | "weekday_daytime" {
  const { wd, hour } = localParts(iso);
  if (wd === 0 || wd === 6) return "weekends";
  if (hour < 10) return "weekday_mornings";
  if (hour >= 17) return "weekday_evenings";
  return "weekday_daytime";
}

export function rankEvents(events: CommunityEvent[], profile: Profile, now: Date, opts: { limit?: number; excludeIds?: Set<string> } = {}): Pick[] {
  const picks: Pick[] = [];
  for (const ev of events) {
    // ---- hard filters
    if (Date.parse(ev.start) <= now.getTime()) continue;
    if (Date.parse(ev.start) > now.getTime() + 8 * 864e5) continue; // this week only
    if (opts.excludeIds?.has(ev.id)) continue;
    if (ev.going >= ev.capacity) continue;
    if (profile.maxBudget !== undefined && ev.cost > profile.maxBudget) continue;
    if (profile.beginnerOnly && !ev.beginnerFriendly) continue;
    const slot = slotOf(ev.start);
    if (profile.when.length && !profile.when.includes(slot as Profile["when"][number])) continue;
    const near = nearestArea(profile, ev);
    const dist = near?.km;
    if (dist !== undefined && profile.maxDistanceKm !== undefined && dist > profile.maxDistanceKm) continue;

    // ---- score (higher is better)
    const reasons: string[] = [];
    let score = 0;
    if (profile.interests.includes(ev.category)) { score += 3; reasons.push(`you're into ${ev.category}`); }
    if (dist !== undefined) {
      score += Math.max(0, 2 - dist / 4); // full credit nearby, fades by ~8 km
      if (dist < 3) reasons.push(`${dist.toFixed(1)} km from ${near!.area.label}`);
    }
    if (ev.cost === 0) { score += 0.5; reasons.push("free"); }
    if (ev.beginnerFriendly) { score += 0.5; reasons.push("beginner-friendly"); }
    if (ev.recurring) { score += 0.5; reasons.push(`happens ${ev.recurring}, easy to become a regular`); }
    const days = (Date.parse(ev.start) - now.getTime()) / 864e5;
    score += Math.max(0, 1 - days / 7) * 0.5; // slight nudge toward sooner
    picks.push({ event: ev, distanceKm: dist, score: Math.round(score * 100) / 100, reasons });
  }

  picks.sort((a, b) => b.score - a.score || Date.parse(a.event.start) - Date.parse(b.event.start) || a.event.id.localeCompare(b.event.id));
  // Variety: at most two picks per category in the digest.
  const perCat = new Map<string, number>();
  const out: Pick[] = [];
  for (const p of picks) {
    const n = perCat.get(p.event.category) ?? 0;
    if (n >= 2) continue;
    perCat.set(p.event.category, n + 1);
    out.push(p);
    if (out.length === (opts.limit ?? 5)) break;
  }
  return out;
}

// ---------------------------------------------------------------- onboarding answers

const CATEGORY_WORDS: [Category, RegExp][] = [
  ["cafe", /\b(cafe|caf[eé]s?|coffee|matcha|tea|pop[- ]?ups?)\b/],
  ["sports", /\b(sports?|pickleball|basketball|volleyball|run(ning)?|climb(ing)?|soccer|tennis)\b/],
  ["swim", /\b(swim(ming)?|pool|plunge)\b/],
  ["outdoors", /\b(outdoors?|hik(e|es|ing)|nature|kayak|paddle|bike|biking|kites?)\b/],
  ["music", /\b(music|open mic|concerts?|jam|guitar)\b/],
  ["food", /\b(food|eat(ing)?|cook(ing)?|dumplings?|ramen|food trucks?)\b/],
  ["art", /\b(art|sketch|draw(ing)?|paint(ing)?|craft)\b/],
  ["wellness", /\b(yoga|wellness|sauna|meditat(e|ion))\b/],
  ["community", /\b(community|volunteer(ing)?|board games?|games|meet people)\b/],
];

export function parseInterests(text: string): Category[] {
  const t = text.toLowerCase();
  return CATEGORY_WORDS.filter(([, re]) => re.test(t)).map(([c]) => c);
}

/** Every neighborhood mentioned, in the order written ("ballard and cap hill" → two areas). */
export function parseAreas(text: string): Area[] {
  let t = " " + text.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ") + " ";
  t = t.replace(/ cap hill /g, " capitol hill ");
  const found: { at: number; area: Area }[] = [];
  for (const key of Object.keys(AREAS).sort((a, b) => b.length - a.length)) {
    const at = t.indexOf(` ${key} `);
    if (at < 0) continue;
    t = t.slice(0, at) + " ".repeat(key.length + 1) + t.slice(at + key.length + 1); // don't re-match inside a longer name
    const area = AREAS[key]!;
    if (!found.some((f) => f.area.label === area.label)) found.push({ at, area });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.area);
}

export function parseArea(text: string): Area | undefined {
  return parseAreas(text)[0];
}

export function parseWhen(text: string): Profile["when"] {
  const t = text.toLowerCase();
  if (/\b(any|anytime|whenever|all)\b/.test(t)) return [];
  const out: Profile["when"] = [];
  if (/weekend|saturday|sunday/.test(t)) out.push("weekends");
  if (/evening|night|after (work|class)/.test(t)) out.push("weekday_evenings");
  if (/morning/.test(t)) out.push("weekday_mornings");
  return out;
}

export function parseBudget(text: string): number | undefined {
  const m = text.match(/\$\s?(\d+)/) ?? text.match(/\b(\d+)\s*(dollars|bucks)\b/i);
  if (m) return +m[1]!;
  if (/\bfree\b/i.test(text)) return 0;
  return undefined;
}
