// Deterministic feasibility + ranking (PRD FR7–FR10).
// The LLM never decides feasibility; this module does.

import type {
  Activity,
  AvailabilityGrant,
  Candidate,
  Outing,
  PrivateResponse,
  User,
  UserId,
} from "./types.js";

const MIN = 60_000;
const ms = (iso: string) => Date.parse(iso);
const iso = (t: number) => new Date(t).toISOString();

export interface MatchInput {
  outing: Outing;
  users: Map<UserId, User>;
  grants: AvailabilityGrant[];
  responses: PrivateResponse[];
  activities: Activity[];
  now: string;
  stepMinutes?: number; // candidate start-time granularity for proposed gatherings
}

export type PersonCheck =
  | { status: "ok"; travelMinutes: number; departure: number }
  | { status: "fail"; reason: string }
  | { status: "unknown"; reason: string };

/** Internal-only: reasons may be sensitive and must never reach a group view. */
export function checkPerson(
  user: User | undefined,
  grant: AvailabilityGrant | undefined,
  resp: PrivateResponse | undefined,
  activity: Activity,
  start: number,
  now: number,
): PersonCheck {
  if (!user || !user.optedInAt || user.stoppedAt) return { status: "fail", reason: "no_consent" };
  if (!grant || grant.revokedAt || ms(grant.expiresAt) <= now) return { status: "fail", reason: "no_valid_grant" };
  if (!resp || resp.willing === undefined) return { status: "unknown", reason: "no_reply" };
  if (resp.willing !== "yes") return { status: "fail", reason: "not_willing" };
  if (resp.activityVotes[activity.id] === "no") return { status: "fail", reason: "passed_activity" };

  if (resp.maxBudget !== undefined && activity.costPerPerson > resp.maxBudget)
    return { status: "fail", reason: "budget" };
  for (const need of resp.requiredNeeds)
    if (!activity.supportedNeeds.includes(need)) return { status: "fail", reason: "need_unmet" };

  const notice = resp.minNoticeMinutes ?? 0;
  if (start - now < notice * MIN) return { status: "fail", reason: "notice" };

  const travel = resp.travel[activity.venueId];
  if (!travel) return { status: "unknown", reason: "travel_unknown" };
  if (resp.maxTravelMinutes !== undefined && travel.minutes > resp.maxTravelMinutes)
    return { status: "fail", reason: "travel_limit" };

  const end = start + activity.durationMinutes * MIN;
  const departure = start - travel.minutes * MIN;
  const back = end + (resp.needsReturnTravel ? travel.minutes * MIN : 0);
  if (departure < ms(grant.start) || back > ms(grant.end)) return { status: "fail", reason: "window" };

  return { status: "ok", travelMinutes: travel.minutes, departure };
}

function startTimes(a: Activity, outing: Outing, step: number): number[] {
  if (a.existingEvent) return [ms(a.existingEvent.start)];
  const out: number[] = [];
  const lo = Math.max(ms(outing.windowStart), a.openFrom ? ms(a.openFrom) : -Infinity);
  const hiEnd = Math.min(ms(outing.windowEnd), a.openUntil ? ms(a.openUntil) : Infinity);
  for (let s = lo; s + a.durationMinutes * MIN <= hiEnd; s += step * MIN) out.push(s);
  return out;
}

function venueOpen(a: Activity, start: number): boolean {
  const end = start + a.durationMinutes * MIN;
  if (a.openFrom && start < ms(a.openFrom)) return false;
  if (a.openUntil && end > ms(a.openUntil)) return false;
  return true;
}

export interface MatchResult {
  options: Candidate[]; // at most 3, ranked
  /** Count of candidates blocked only by unknown facts (internal; no names). */
  unresolvedCount: number;
  noMatch: boolean;
}

export function generateProposals(input: MatchInput): MatchResult {
  const { outing, users, grants, responses, activities } = input;
  const now = ms(input.now);
  const step = input.stepMinutes ?? 30;
  const grantFor = (u: UserId) => grants.find((g) => g.userId === u && g.outingId === outing.id);
  const respFor = (u: UserId) => responses.find((r) => r.userId === u && r.outingId === outing.id);

  const candidates: Candidate[] = [];
  let unresolvedCount = 0;

  for (const a of activities) {
    for (const start of startTimes(a, outing, step)) {
      if (!venueOpen(a, start)) continue;
      const checks = new Map<UserId, PersonCheck>();
      for (const u of outing.rosterIds)
        checks.set(u, checkPerson(users.get(u), grantFor(u), respFor(u), a, start, now));

      const org = checks.get(outing.organizerId)!;
      if (org.status !== "ok") {
        if (org.status === "unknown") unresolvedCount++;
        continue;
      }

      let attendees: UserId[];
      if (outing.policy === "everyone") {
        const statuses = [...checks.values()].map((c) => c.status);
        if (statuses.includes("fail")) continue;
        if (statuses.includes("unknown")) { unresolvedCount++; continue; }
        attendees = [...outing.rosterIds];
        if (attendees.length < a.minAttendees || attendees.length > a.maxAttendees) continue;
      } else {
        const others = outing.rosterIds
          .filter((u) => u !== outing.organizerId && checks.get(u)!.status === "ok")
          // deterministic capacity cut: explicit yes voters first, then id
          .sort((x, y) => {
            const vx = respFor(x)?.activityVotes[a.id] === "yes" ? 0 : 1;
            const vy = respFor(y)?.activityVotes[a.id] === "yes" ? 0 : 1;
            return vx - vy || x.localeCompare(y);
          });
        attendees = [outing.organizerId, ...others].slice(0, a.maxAttendees);
        if (attendees.length < a.minAttendees) {
          if (outing.rosterIds.some((u) => checks.get(u)!.status === "unknown")) unresolvedCount++;
          continue;
        }
      }

      const okChecks = attendees.map((u) => checks.get(u) as Extract<PersonCheck, { status: "ok" }>);
      const travels = okChecks.map((c) => c.travelMinutes);
      const yesVotes = attendees.filter((u) => respFor(u)?.activityVotes[a.id] === "yes").length;
      const uncertainties: string[] = [];
      if (a.isFixture) uncertainties.push("Sample venue and travel data (demo fixture)");
      if (a.bookingStatus === "unverified") uncertainties.push("Venue availability not yet verified");

      candidates.push({
        id: `${a.id}@${iso(start)}`,
        activity: a,
        start: iso(start),
        end: iso(start + a.durationMinutes * MIN),
        attendeeIds: attendees,
        yesVotes,
        worstTravelMinutes: Math.max(...travels),
        totalTravelMinutes: travels.reduce((s, t) => s + t, 0),
        earliestDeparture: iso(Math.min(...okChecks.map((c) => c.departure))),
        uncertainties,
        publicReason: `${a.fitBlurb} Fits the group's shared window, budgets, and travel limits.`,
      });
    }
  }

  const ranked = candidates.sort((x, y) => compareCandidates(x, y, outing.policy));
  // Show distinct activities: best slot per activity, top 3 (FR4/FR9).
  const seen = new Set<string>();
  const options: Candidate[] = [];
  for (const c of ranked) {
    if (seen.has(c.activity.id)) continue;
    seen.add(c.activity.id);
    options.push(c);
    if (options.length === 3) break;
  }
  return { options, unresolvedCount, noMatch: options.length === 0 };
}

/** FR9 ordering. Negative = x ranks ahead of y. */
export function compareCandidates(x: Candidate, y: Candidate, policy: Outing["policy"]): number {
  return (
    (policy === "flexible" ? y.attendeeIds.length - x.attendeeIds.length : 0) ||
    y.yesVotes - x.yesVotes ||
    x.worstTravelMinutes - y.worstTravelMinutes ||
    x.totalTravelMinutes - y.totalTravelMinutes ||
    x.activity.costPerPerson - y.activity.costPerPerson ||
    x.id.localeCompare(y.id)
  );
}
