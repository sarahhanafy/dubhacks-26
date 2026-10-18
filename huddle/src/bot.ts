// Huddle over iMessage: 3 quick questions, then a weekly text of events near you.
// Transport-agnostic so it can be tested with a fake (see sim.ts).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { rankEvents, parseAreas, parseBudget, parseInterests, parseWhen, type Pick, type Profile } from "../../src/domain/discovery.js";
import { EVENTS, type CommunityEvent } from "../../src/events/seattle.js";

export interface Transport { dm(userId: string, text: string): Promise<void> }
export type ProfileParser = (answer: string) => Promise<Partial<Profile>>;

type Step = "interests" | "area" | "when" | "ready";
interface UserState {
  id: string;
  step: Step;
  profile: Profile;
  stopped?: boolean;
  lastList: string[]; // event ids, numbered as last shown
  sent: string[]; // ids already suggested this week
  joined: string[];
  remindedIds: string[];
  lastDigestWeek?: string;
}

const TZ = process.env.HUDDLE_TZ ?? "America/Los_Angeles";
const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o }).format(new Date(iso));
const when = (iso: string) => `${fmt(iso, { weekday: "short" })} ${fmt(iso, { hour: "numeric", minute: "2-digit" })}`;
const longWhen = (iso: string) => `${fmt(iso, { weekday: "long", month: "short", day: "numeric" })}, ${fmt(iso, { hour: "numeric", minute: "2-digit" })}`;
const price = (n: number) => (n === 0 ? "free" : `$${n}`);
const weekKey = (d: Date) => { const s = new Date(d); s.setUTCDate(s.getUTCDate() - s.getUTCDay()); return s.toISOString().slice(0, 10); };

export class HuddleBot {
  users = new Map<string, UserState>();
  events: CommunityEvent[] = structuredClone(EVENTS);

  constructor(
    public transport: Transport,
    public clock: () => Date = () => new Date(),
    public parseProfile?: ProfileParser,
    private storePath?: string,
  ) { this.load(); }

  // ---------------------------------------------------------------- persistence
  private load() {
    if (!this.storePath) return;
    try {
      const data = JSON.parse(readFileSync(this.storePath, "utf8"));
      for (const u of data.users ?? []) this.users.set(u.id, u);
      for (const [id, going] of Object.entries(data.going ?? {})) { const ev = this.events.find((e) => e.id === id); if (ev) ev.going = going as number; }
    } catch { /* first run */ }
  }
  private save() {
    if (!this.storePath) return;
    mkdirSync(this.storePath.replace(/\/[^/]+$/, ""), { recursive: true });
    writeFileSync(this.storePath, JSON.stringify({ users: [...this.users.values()], going: Object.fromEntries(this.events.map((e) => [e.id, e.going])) }, null, 2));
  }

  private say(u: UserState, text: string) { return u.stopped ? Promise.resolve() : this.transport.dm(u.id, text); }

  // ---------------------------------------------------------------- inbound
  async handle(fromId: string, raw: string): Promise<void> {
    const text = raw.trim(), up = text.toUpperCase();
    let u = this.users.get(fromId);

    // Texting us first is the opt-in (PRD §5: only message people who initiated contact).
    if (!u) {
      u = { id: fromId, step: "interests", profile: { interests: [], when: [] }, lastList: [], sent: [], joined: [], remindedIds: [] };
      this.users.set(fromId, u);
      this.save();
      return this.say(u,
        "hey! I'm Huddle 👋 every week I'll text you a few things happening near you, like pop-up cafes, open courts, swims and hikes, so it's easy to show up and meet people.\n\n" +
        "3 quick questions. first: what are you into? (e.g. pickleball, coffee pop-ups, hiking, yoga)\n\nReply STOP anytime.");
    }
    if (up === "STOP") { u.stopped = true; this.save(); return this.transport.dm(u.id, "you're unsubscribed. text START to come back."); }
    if (up === "START") { u.stopped = false; this.save(); return this.say(u, "welcome back! text EVENTS for this week's picks."); }
    if (u.stopped) return;
    if (up === "HELP") return this.say(u, this.help());
    if (up === "PREFS" || up === "RESET") { u.step = "interests"; this.save(); return this.say(u, "let's redo it. what are you into?"); }

    if (u.step !== "ready") return this.onboard(u, text);

    if (/^(EVENTS|WEEK|THIS WEEK|DIGEST)$/.test(up)) return this.digest(u, true);
    if (up === "MORE") return this.digest(u, false);
    if (up === "MY" || up === "MY PLANS" || up === "PLANS") return this.myPlans(u);
    const join = up.match(/^(?:JOIN|GO|RSVP|IN)?\s*#?(\d{1,2})$/);
    if (join) return this.join(u, +join[1]! - 1);
    const info = up.match(/^(?:INFO|DETAILS|MORE ON|\?)\s*#?(\d{1,2})$/);
    if (info) return this.info(u, +info[1]! - 1);
    const leave = up.match(/^(?:LEAVE|CANCEL|DROP)\s*#?(\d{1,2})?$/);
    if (leave) return this.leave(u, leave[1] ? +leave[1] - 1 : undefined);

    // Anything else: treat as a mood ("something chill tonight") and search with it.
    const extra = parseInterests(text);
    if (extra.length) return this.digest(u, true, extra);
    return this.say(u, this.help());
  }

  // ---------------------------------------------------------------- onboarding
  private async onboard(u: UserState, text: string) {
    const llm = this.parseProfile ? await this.parseProfile(text).catch(() => ({} as Partial<Profile>)) : {};
    if (u.step === "interests") {
      const interests = llm.interests?.length ? llm.interests : parseInterests(text);
      if (!interests.length) return this.say(u, "tell me a couple things you'd actually go to, like pickleball, coffee, hiking, swimming, music or volunteering.");
      u.profile.interests = interests;
      u.step = "area";
      this.save();
      return this.say(u, `love that: ${interests.join(", ")}. which neighborhoods are you usually around? list as many as you like (e.g. Capitol Hill, U District, Ballard, Bellevue)`);
    }
    if (u.step === "area") {
      const parsed = parseAreas(text);
      const areas = parsed.length ? parsed : llm.home ? [llm.home] : [];
      if (!areas.length) return this.say(u, "I didn't catch that one. try Seattle-area neighborhoods like Fremont, Queen Anne, U District or Bellevue (you can list a few).");
      u.profile.areas = areas;
      u.profile.home = areas[0];
      u.profile.maxDistanceKm = 8;
      u.step = "when";
      this.save();
      return this.say(u, `got it: ${areas.map((a) => a.label).join(", ")}. last one: when are you usually free, and any budget? (e.g. "weekends and weeknights, under $15")`);
    }
    if (u.step === "when") {
      u.profile.when = llm.when ?? parseWhen(text);
      u.profile.maxBudget = llm.maxBudget ?? parseBudget(text);
      u.step = "ready";
      this.save();
      await this.say(u, "you're all set ✨ I'll text you every Sunday morning. here's what's happening this week:");
      return this.digest(u, true);
    }
  }

  // ---------------------------------------------------------------- digest
  picksFor(u: UserState, fresh: boolean, boost: CommunityEvent["category"][] = []): Pick[] {
    const profile = { ...u.profile, interests: boost.length ? boost : u.profile.interests }; // a mood text overrides saved interests
    return rankEvents(this.events, profile, this.clock(), { limit: 5, excludeIds: new Set(fresh ? u.joined : [...u.sent, ...u.joined]) });
  }

  async digest(u: UserState, fresh: boolean, boost: CommunityEvent["category"][] = []) {
    const picks = this.picksFor(u, fresh, boost);
    if (!picks.length) return this.say(u, fresh
      ? "nothing matches this week with your settings. text PREFS to widen them."
      : "that's everything for this week! text EVENTS to see your top picks again.");
    u.lastList = picks.map((p) => p.event.id);
    u.sent = [...new Set([...(fresh ? [] : u.sent), ...u.lastList])];
    u.lastDigestWeek = weekKey(this.clock());
    this.save();
    const lines = picks.map((p, i) =>
      `${i + 1}. ${p.event.emoji} ${p.event.title}\n   ${when(p.event.start)} · ${p.event.neighborhood} · ${price(p.event.cost)} · ${p.event.going} going`);
    return this.say(u,
      `🗓 your week near ${(u.profile.areas?.length ? u.profile.areas : u.profile.home ? [u.profile.home] : []).map((a) => a.label).join(" + ") || "you"} (sample events)\n\n${lines.join("\n\n")}\n\n` +
      `reply a number to join (like 1), INFO 2 for details, or MORE.`);
  }

  private pickFromList(u: UserState, i: number) {
    const id = u.lastList[i];
    return id ? this.events.find((e) => e.id === id) : undefined;
  }

  private async info(u: UserState, i: number) {
    const ev = this.pickFromList(u, i);
    if (!ev) return this.say(u, "that number isn't on your list. text EVENTS to see it again.");
    return this.say(u,
      `${ev.emoji} ${ev.title}\n${longWhen(ev.start)} – ${fmt(ev.end, { hour: "numeric", minute: "2-digit" })}\n📍 ${ev.place}, ${ev.neighborhood}\n` +
      `${price(ev.cost)} · ${ev.going}/${ev.capacity} going${ev.beginnerFriendly ? " · beginner-friendly" : ""}${ev.recurring ? ` · ${ev.recurring}` : ""}\n\n` +
      `${ev.blurb}\nhosted by ${ev.host} (sample)\n\nreply ${i + 1} to join.`);
  }

  private async join(u: UserState, i: number) {
    const ev = this.pickFromList(u, i);
    if (!ev) return this.say(u, "that number isn't on your list. text EVENTS to see this week's picks.");
    if (u.joined.includes(ev.id)) return this.say(u, `you're already in for ${ev.title}!`);
    if (ev.going >= ev.capacity) return this.say(u, `${ev.title} just filled up 😭 text MORE for other options.`);
    ev.going += 1;
    u.joined.push(ev.id);
    this.save();
    const others = ev.going - 1;
    return this.say(u,
      `you're in! ${ev.emoji} ${ev.title}\n${longWhen(ev.start)} · ${ev.place}\n` +
      `${others} other${others === 1 ? "" : "s"} going${ev.beginnerFriendly ? ", and it's beginner-friendly" : ""}. I'll text you a reminder before it starts.\n` +
      (ev.recurring ? `\nit happens ${ev.recurring}, so come a few times and you'll be a regular.` : "") +
      `\n\nwant to bring someone? just forward this text.`);
  }

  private async leave(u: UserState, i?: number) {
    const id = i === undefined ? u.joined[u.joined.length - 1] : u.lastList[i];
    if (!id || !u.joined.includes(id)) return this.say(u, "you're not signed up for that one. text MY to see your plans.");
    const ev = this.events.find((e) => e.id === id)!;
    u.joined = u.joined.filter((x) => x !== id);
    ev.going = Math.max(0, ev.going - 1);
    this.save();
    return this.say(u, `no problem, you're off the list for ${ev.title}.`);
  }

  private async myPlans(u: UserState) {
    const mine = u.joined.map((id) => this.events.find((e) => e.id === id)!).filter((e) => Date.parse(e.end) > this.clock().getTime())
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    if (!mine.length) return this.say(u, "nothing on your calendar yet. text EVENTS to find something.");
    return this.say(u, `your plans:\n\n${mine.map((e) => `${e.emoji} ${e.title}, ${when(e.start)} · ${e.place}`).join("\n")}\n\ntext LEAVE if plans change.`);
  }

  help() {
    return "EVENTS: this week's picks · MORE: more picks · 1, 2, 3…: join · INFO 2: details · MY: your plans · LEAVE: drop out · PREFS: change interests · STOP: unsubscribe\n\nor just text a mood, like \"something outdoorsy\".";
  }

  // ---------------------------------------------------------------- scheduled
  /** Call every minute: Sunday-morning digests and reminders 2 hours before joined events. */
  async tick(): Promise<void> {
    const now = this.clock();
    const local = { wd: fmt(now.toISOString(), { weekday: "short" }), hour: +fmt(now.toISOString(), { hour: "numeric", hourCycle: "h23" }) };
    for (const u of this.users.values()) {
      if (u.stopped || u.step !== "ready") continue;
      if (local.wd === "Sun" && local.hour >= 9 && u.lastDigestWeek !== weekKey(now)) {
        await this.say(u, "good morning ☀️ here's your week:");
        await this.digest(u, true);
      }
      for (const id of u.joined) {
        const ev = this.events.find((e) => e.id === id)!;
        const until = Date.parse(ev.start) - now.getTime();
        if (until > 0 && until <= 2 * 3600_000 && !u.remindedIds.includes(id)) {
          u.remindedIds.push(id);
          this.save();
          await this.say(u, `reminder: ${ev.emoji} ${ev.title} starts at ${fmt(ev.start, { hour: "numeric", minute: "2-digit" })} · ${ev.place}. ${ev.going - 1} others are going. have fun!`);
        }
      }
    }
  }
}
