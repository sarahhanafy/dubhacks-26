// Core records from PRD §6. All instants are stored as ISO-8601 UTC strings.

export type UserId = string;
export type ActivityId = string;
export type Vote = "yes" | "maybe" | "no";
export type GroupPolicy = "everyone" | "flexible";

export interface User {
  id: UserId;
  displayName: string;
  timezone: string; // IANA, e.g. America/Los_Angeles
  optedInAt?: string;
  stoppedAt?: string; // STOP disables all future messages
}

export interface Circle {
  id: string;
  ownerId: UserId;
  memberIds: UserId[];
}

/** A user grants a time interval for one outing, with an expiry (FR3). */
export interface AvailabilityGrant {
  userId: UserId;
  outingId: string;
  start: string;
  end: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface TravelEstimate {
  minutes: number;
  basis: string; // e.g. "fixture: drive estimate"
  estimatedAt: string;
}

/** Private, participant-owned. Never projected into group views (FR6). */
export interface PrivateResponse {
  userId: UserId;
  outingId: string;
  /** Willingness to join this outing at all; separate from availability. */
  willing?: Vote;
  /** Per-activity preference. "yes" is interest, not attendance (FR5). */
  activityVotes: Record<ActivityId, Vote>;
  maxBudget?: number;
  maxTravelMinutes?: number;
  minNoticeMinutes?: number;
  /** Hard needs, e.g. "wheelchair_access", "vegetarian". */
  requiredNeeds: string[];
  /** Must the return trip also fit inside the availability window? */
  needsReturnTravel: boolean;
  /** Keyed by venue id. Missing = unknown travel. */
  travel: Record<string, TravelEstimate>;
  note?: string;
}

export interface Activity {
  id: ActivityId;
  kind: string;
  name: string;
  venueId: string;
  venueName: string;
  area: string;
  durationMinutes: number;
  costPerPerson: number;
  minAttendees: number;
  maxAttendees: number;
  supportedNeeds: string[];
  /** Venue open interval for the day being planned (UTC instants). */
  openFrom?: string;
  openUntil?: string;
  /** Existing events have a fixed start and a source (FR4). */
  existingEvent?: { start: string; sourceUrl: string; verifiedAt: string };
  bookingStatus: "not_required" | "unverified" | "booked";
  isFixture: boolean;
  fitBlurb: string;
}

export interface Outing {
  id: string;
  organizerId: UserId;
  rosterIds: UserId[]; // includes organizer
  policy: GroupPolicy;
  windowStart: string;
  windowEnd: string;
  timezone: string;
}

export interface Candidate {
  id: string; // stable: activityId@startISO
  activity: Activity;
  start: string;
  end: string;
  attendeeIds: UserId[];
  yesVotes: number;
  worstTravelMinutes: number;
  totalTravelMinutes: number;
  /** Earliest moment any attendee must leave. */
  earliestDeparture: string;
  /** Labeled uncertainties (e.g. booking unverified). */
  uncertainties: string[];
  /** Non-sensitive, group-safe explanation (FR9). */
  publicReason: string;
}
