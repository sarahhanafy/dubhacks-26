// Labeled demo fixtures (PRD §1 "Recommended demo defaults").
// Sunday Oct 18 2026, 2–6 PM America/Los_Angeles (PDT = UTC-7) → 21:00Z–01:00Z.

import type { Activity, AvailabilityGrant, Outing, PrivateResponse, User } from "../domain/types.js";

export const TZ = "America/Los_Angeles";
export const NOW = "2026-10-18T17:00:00.000Z"; // Sun 10 AM PT
const OPTED_IN = "2026-10-17T22:00:00.000Z";
const EST = "2026-10-18T16:00:00.000Z";

export const users: User[] = [
  { id: "sarah", displayName: "Sarah", timezone: TZ, optedInAt: OPTED_IN },
  { id: "amir", displayName: "Amir", timezone: TZ, optedInAt: OPTED_IN },
  { id: "jenna", displayName: "Jenna", timezone: TZ, optedInAt: OPTED_IN },
  { id: "kai", displayName: "Kai", timezone: TZ, optedInAt: OPTED_IN },
];

export const activities: Activity[] = [
  {
    id: "pickleball", kind: "sport", name: "Pickleball doubles", venueId: "v_courts",
    venueName: "Sample Park Courts", area: "Green Lake", durationMinutes: 90, costPerPerson: 0,
    minAttendees: 4, maxAttendees: 4, supportedNeeds: [],
    openFrom: "2026-10-18T15:00:00.000Z", openUntil: "2026-10-19T02:00:00.000Z",
    bookingStatus: "unverified", isFixture: true, fitBlurb: "Active, free, and needs exactly four.",
  },
  {
    id: "walk", kind: "outdoors", name: "Lake loop walk", venueId: "v_lake",
    venueName: "Sample Lake Trailhead", area: "Green Lake", durationMinutes: 60, costPerPerson: 0,
    minAttendees: 2, maxAttendees: 8, supportedNeeds: ["wheelchair_access"],
    bookingStatus: "not_required", isFixture: true, fitBlurb: "Easy, free, and flexible on headcount.",
  },
  {
    id: "pho", kind: "meal", name: "Pho lunch", venueId: "v_pho",
    venueName: "Sample Pho House", area: "U District", durationMinutes: 75, costPerPerson: 14,
    minAttendees: 2, maxAttendees: 6, supportedNeeds: ["vegetarian", "wheelchair_access"],
    openFrom: "2026-10-18T18:00:00.000Z", openUntil: "2026-10-19T04:00:00.000Z",
    bookingStatus: "not_required", isFixture: true, fitBlurb: "Sit-down meal near campus.",
  },
];

export const outing: Outing = {
  id: "o1", organizerId: "sarah", rosterIds: ["sarah", "amir", "jenna", "kai"],
  policy: "flexible",
  windowStart: "2026-10-18T21:00:00.000Z", windowEnd: "2026-10-19T01:00:00.000Z", timezone: TZ,
};

export const grants: AvailabilityGrant[] = users.map((u) => ({
  userId: u.id, outingId: "o1",
  start: "2026-10-18T21:00:00.000Z", end: "2026-10-19T01:00:00.000Z",
  expiresAt: "2026-10-19T01:00:00.000Z",
}));

const t = (minutes: number) => ({ minutes, basis: "fixture estimate", estimatedAt: EST });

export const responses: PrivateResponse[] = [
  { userId: "sarah", outingId: "o1", willing: "yes", activityVotes: { pickleball: "yes", walk: "yes", pho: "maybe" },
    requiredNeeds: [], needsReturnTravel: false, maxTravelMinutes: 30,
    travel: { v_courts: t(15), v_lake: t(15), v_pho: t(20) } },
  { userId: "amir", outingId: "o1", willing: "yes", activityVotes: { pickleball: "yes", walk: "maybe", pho: "yes" },
    requiredNeeds: [], needsReturnTravel: true,
    travel: { v_courts: t(20), v_lake: t(20), v_pho: t(10) } },
  { userId: "jenna", outingId: "o1", willing: "yes", activityVotes: { pickleball: "yes", walk: "yes", pho: "yes" },
    requiredNeeds: [], needsReturnTravel: false,
    travel: { v_courts: t(25), v_lake: t(25), v_pho: t(15) } },
  // Kai's private budget cap rules out the $14 meal — must never be named publicly.
  { userId: "kai", outingId: "o1", willing: "yes", activityVotes: { pickleball: "yes", walk: "yes", pho: "yes" },
    requiredNeeds: [], needsReturnTravel: false, maxBudget: 10, note: "tight on money this week",
    travel: { v_courts: t(10), v_lake: t(10), v_pho: t(10) } },
];
