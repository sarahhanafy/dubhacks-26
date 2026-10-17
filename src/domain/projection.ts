// Public plan projection (PRD §5). Group messages and any LLM drafting
// receive ONLY this object — an explicit allow-list of fields.

import type { Activity, User, UserId } from "./types.js";

export interface PublicPlan {
  version: number;
  activity: string;
  venue: string;
  area: string;
  start: string;
  end: string;
  timezone: string;
  costPerPerson: number;
  bookingStatus: Activity["bookingStatus"];
  attendees: string[]; // display names only
  isSampleData: boolean;
  reason: string;
}

export function toPublicPlan(
  plan: { version: number; activity: Activity; start: string; end: string; attendeeIds: UserId[]; publicReason: string },
  users: Map<UserId, User>,
  timezone: string,
): PublicPlan {
  return {
    version: plan.version,
    activity: plan.activity.name,
    venue: plan.activity.venueName,
    area: plan.activity.area,
    start: plan.start,
    end: plan.end,
    timezone,
    costPerPerson: plan.activity.costPerPerson,
    bookingStatus: plan.activity.bookingStatus,
    attendees: plan.attendeeIds.map((id) => users.get(id)?.displayName ?? "Someone"),
    isSampleData: plan.activity.isFixture,
    reason: plan.publicReason,
  };
}

export function formatLocal(isoStr: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoStr));
}

export function renderPlanText(p: PublicPlan): string {
  const sample = p.isSampleData ? " (sample data)" : "";
  return [
    `Plan v${p.version}: ${p.activity} at ${p.venue}, ${p.area}${sample}`,
    `${formatLocal(p.start, p.timezone)} – ${formatLocal(p.end, p.timezone)}`,
    `~$${p.costPerPerson}/person · ${p.attendees.join(", ")}`,
    p.reason,
  ].join("\n");
}
