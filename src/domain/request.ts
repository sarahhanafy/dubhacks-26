// Turns a free-text outing request into concrete, timezone-correct fields (PRD FR1).
// This deterministic parser is the fallback; an LLM may fill the same shape first.

export interface ParsedRequest {
  windowStart?: string; // UTC ISO
  windowEnd?: string;
  maxBudget?: number;
  vibe?: "active" | "food" | "chill" | "any";
  dateLabel?: string; // echoed back to the user, e.g. "Sun, Oct 18, 2:00 – 6:00 PM"
  missing: ("day" | "time")[];
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Offset (minutes) of `tz` from UTC at a given instant. */
function tzOffsetMinutes(tz: string, at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return (asUtc - at.getTime()) / 60000;
}

/** Wall-clock time in `tz` → UTC instant. */
export function zonedToUtc(y: number, m: number, d: number, h: number, min: number, tz: string): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, h, min));
  const off = tzOffsetMinutes(tz, guess);
  const first = new Date(guess.getTime() - off * 60000);
  const off2 = tzOffsetMinutes(tz, first); // correct across DST edges
  return off2 === off ? first : new Date(guess.getTime() - off2 * 60000);
}

function localYMD(at: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "numeric", day: "numeric", weekday: "long" })
    .formatToParts(at);
  const g = (t: string) => p.find((x) => x.type === t)!.value;
  return { y: +g("year"), m: +g("month"), d: +g("day"), dow: DAYS.indexOf(g("weekday").toLowerCase()) };
}

function to24(h: number, ampm: string | undefined, fallbackPm: boolean) {
  if (ampm === "am") return h === 12 ? 0 : h;
  if (ampm === "pm") return h === 12 ? 12 : h + 12;
  // No am/pm: hangouts are usually afternoon/evening, so 1–11 read as PM unless clearly morning.
  return fallbackPm && h >= 1 && h <= 11 ? h + 12 : h;
}

export function parseRequest(text: string, now: Date, tz: string): ParsedRequest {
  const t = text.toLowerCase();
  const out: ParsedRequest = { missing: [] };

  // ---- day
  const today = localYMD(now, tz);
  let offsetDays: number | undefined;
  if (/\btoday\b|\btonight\b/.test(t)) offsetDays = 0;
  else if (/\btomorrow\b/.test(t)) offsetDays = 1;
  else {
    const m = t.match(/\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|rsday|urday|sday)?\b/);
    if (m) {
      const idx = DAYS.findIndex((d) => d.startsWith(m[1]!.slice(0, 3)));
      offsetDays = (idx - today.dow + 7) % 7;
    }
  }

  // ---- time window, e.g. "2 to 6", "2-6pm", "10am–1pm"
  const w = t.match(/\b(\d{1,2})(?::(\d\d))?\s*(am|pm)?\s*(?:to|-|–|until|till)\s*(\d{1,2})(?::(\d\d))?\s*(am|pm)?\b/);

  if (offsetDays === undefined) out.missing.push("day");
  if (!w) out.missing.push("time");

  if (offsetDays !== undefined && w) {
    const base = new Date(Date.UTC(today.y, today.m - 1, today.d + offsetDays));
    const [y, mo, d] = [base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate()];
    const endAmPm = w[6] as string | undefined;
    const startAmPm = (w[3] as string | undefined) ?? (endAmPm === "pm" && +w[1]! < +w[4]! ? "pm" : undefined);
    const sh = to24(+w[1]!, startAmPm, true), eh = to24(+w[4]!, endAmPm, true);
    const start = zonedToUtc(y, mo, d, sh, +(w[2] ?? 0), tz);
    let end = zonedToUtc(y, mo, d, eh, +(w[5] ?? 0), tz);
    if (end <= start) end = new Date(end.getTime() + 24 * 3600_000);
    out.windowStart = start.toISOString();
    out.windowEnd = end.toISOString();
    const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(start);
    const hm = (x: Date) => new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(x);
    out.dateLabel = `${day}, ${hm(start)} – ${hm(end)}`;
  }

  // ---- budget
  const money = t.match(/\$\s?(\d+)/) ?? t.match(/\b(\d+)\s*(?:dollars|bucks)\b/);
  if (money) out.maxBudget = +money[1]!;
  else if (/\bfree\b(?!\s+(?:sun|mon|tue|wed|thu|fri|sat|today|tomorrow|from|\d))/.test(t)) out.maxBudget = 0;

  // ---- vibe
  if (/\b(active|sports?|run|running|walk|hike|play|pickleball|basketball|outside|outdoors)\b/.test(t)) out.vibe = "active";
  else if (/\b(food|eat|lunch|dinner|brunch|coffee|boba|pho|snacks?)\b/.test(t)) out.vibe = "food";
  else if (/\b(chill|relax|hang|study)\b/.test(t)) out.vibe = "chill";
  else out.vibe = "any";
  return out;
}

/** A friend's private reply: "yes", "yes $10", "maybe", "pass", "yes until 5". */
export interface FriendReply { willing?: "yes" | "maybe" | "no"; maxBudget?: number; untilHour?: number }

export function parseFriendReply(text: string): FriendReply {
  const t = text.toLowerCase().trim();
  const r: FriendReply = {};
  if (/^(y|yes|yeah|yep|down|in|i'?m in|sure|ok|okay)\b/.test(t)) r.willing = "yes";
  else if (/^(maybe|idk|possibly|might)\b/.test(t)) r.willing = "maybe";
  else if (/^(n|no|nope|pass|can'?t|cant|not)\b/.test(t)) r.willing = "no";
  const money = t.match(/\$\s?(\d+)/); if (money) r.maxBudget = +money[1]!;
  const until = t.match(/\b(?:until|till|by)\s+(\d{1,2})\s*(am|pm)?/);
  if (until) r.untilHour = to24(+until[1]!, until[2], true);
  return r;
}
