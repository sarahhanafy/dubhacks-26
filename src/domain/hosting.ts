// Anyone can host: turn "HOST potluck sat 6pm cal anderson" (or the app's form) into a community event.

import { AREAS, EVENTS, type Access, type Category, type CommunityEvent } from "../events/seattle.js";
import { parseInterests, parseNeeds } from "./discovery.js";
import { zonedToUtc } from "./request.js";

const TZ = "America/Los_Angeles";
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const EMOJI: Record<Category, string> = { cafe: "☕", sports: "🏃", swim: "🏊", outdoors: "🌿", music: "🎶", food: "🍽️", art: "🎨", wellness: "🧘", community: "🏡" };

/** Named spots people actually say ("cal anderson", "green lake") plus every neighborhood. */
const SPOTS: { key: string; place: string; neighborhood: string; lat: number; lng: number }[] = (() => {
  const out: { key: string; place: string; neighborhood: string; lat: number; lng: number }[] = [];
  for (const ev of EVENTS) {
    const key = ev.place.toLowerCase().replace(/\b(park|courts?|pool|lawn|field|picnic tables|hill|loop|lighthouse|beach|center)\b/g, "").replace(/\s+/g, " ").trim();
    if (key.length > 3 && !out.some((s) => s.key === key)) out.push({ key, place: ev.place, neighborhood: ev.neighborhood, lat: ev.lat, lng: ev.lng });
  }
  for (const [key, a] of Object.entries(AREAS)) out.push({ key, place: `near ${a.label}`, neighborhood: a.label, lat: a.lat, lng: a.lng });
  return out.sort((a, b) => b.key.length - a.key.length);
})();

export interface HostInput {
  title: string;
  start: string; // ISO
  place: string;
  neighborhood: string;
  lat: number;
  lng: number;
  category?: Category;
  potluck?: boolean;
  hostName?: string;
  hostUserId?: string;
  access?: Access[];
}

export function createHostedEvent(i: HostInput): CommunityEvent {
  const potluck = i.potluck ?? /potluck/i.test(i.title);
  const category: Category = potluck ? "food" : i.category ?? parseInterests(i.title)[0] ?? "community";
  const start = Date.parse(i.start);
  return {
    id: "h" + start.toString(36) + Math.random().toString(36).slice(2, 6),
    title: i.title, category, emoji: potluck ? "🥘" : EMOJI[category],
    host: i.hostName ? `${i.hostName}, a neighbor` : "a neighbor", hostedBy: "neighbor", hostUserId: i.hostUserId,
    potluck, bringing: potluck ? [] : undefined,
    neighborhood: i.neighborhood, place: i.place, lat: i.lat, lng: i.lng,
    start: new Date(start).toISOString(), end: new Date(start + 2 * 3600_000).toISOString(),
    cost: 0, capacity: potluck ? 15 : 12, going: 1, beginnerFriendly: true, isSample: false, access: i.access ?? parseNeeds(i.title),
    blurb: potluck
      ? "Bring a dish to share, or just bring yourself. Reply BRING <dish> after joining so we don't end up with six salads."
      : "Hosted by a neighbor through What's Cooking. All levels welcome, just show up.",
  };
}

export type ParsedHost = { ok: true; input: HostInput } | { ok: false; missing: ("what" | "when" | "where")[] };

/** "potluck sat 6pm cal anderson" → HostInput. Missing pieces are reported, never guessed. */
export function parseHostText(raw: string, now: Date, tz = TZ): ParsedHost {
  let t = " " + raw.toLowerCase().replace(/^\s*host\b:?/, "").replace(/[^a-z0-9: ]/g, " ").replace(/\s+/g, " ") + " ";
  const missing: ("what" | "when" | "where")[] = [];

  // where
  const spot = SPOTS.find((s) => t.includes(` ${s.key} `));
  if (spot) t = t.replace(` ${spot.key} `, " ");
  else missing.push("where");

  // when: day + time
  const localDay = (d: Date) => DAYS.indexOf(new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(d).toLowerCase());
  let offset: number | undefined;
  const dm = t.match(/ (today|tonight|tomorrow|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(day|nesday|rsday|urday|sday)? /);
  if (dm) {
    const w = dm[1]!;
    offset = w === "today" || w === "tonight" ? 0 : w === "tomorrow" ? 1 : (DAYS.findIndex((d) => d.startsWith(w.slice(0, 3))) - localDay(now) + 7) % 7;
    t = t.replace(dm[0], " ");
  }
  const tm = t.match(/ (?:at )?(\d{1,2})(?::(\d\d))?\s*(am|pm)? /);
  if (tm) t = t.replace(tm[0], " ");
  if (offset === undefined || !tm) missing.push("when");

  // what
  const title = t.replace(/\b(at|on|in|near|the|this|next)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!title) missing.push("what");
  if (missing.length) return { ok: false, missing };

  let h = +tm![1]!; const ap = tm![3];
  if (ap === "pm" && h < 12) h += 12; else if (ap === "am" && h === 12) h = 0; else if (!ap && h >= 1 && h <= 9) h += 12;
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(now);
  const g = (k: string) => +p.find((x) => x.type === k)!.value;
  const base = new Date(Date.UTC(g("year"), g("month") - 1, g("day") + offset!));
  let start = zonedToUtc(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), h, +(tm![2] ?? 0), tz);
  if (start.getTime() < now.getTime()) start = new Date(start.getTime() + 7 * 864e5); // "sat" means the next one

  const access = parseNeeds(title);
  const pretty = title.replace(/\b(wheelchair|step free|accessible|kid friendly|family friendly|quiet|sensory friendly)\b/g, "").replace(/\s+/g, " ").trim()
    .replace(/\b\w/, (c) => c.toUpperCase());
  return { ok: true, input: { title: pretty, access, start: start.toISOString(), place: spot!.place, neighborhood: spot!.neighborhood, lat: spot!.lat, lng: spot!.lng } };
}
