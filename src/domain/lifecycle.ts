// Outing lifecycle (PRD FR11–FR14, §6 state table).
// Pure in-memory domain object; persistence + transactions wrap this later.
// Every state change and its outbound jobs happen together in one method call.

import type { Candidate, Outing, User, UserId } from "./types.js";
import { toPublicPlan, renderPlanText } from "./projection.js";

const MIN = 60_000;
const ms = (iso: string) => Date.parse(iso);
const iso = (t: number) => new Date(t).toISOString();

export type OutingState =
  | "draft" | "collecting" | "awaiting_confirmation" | "confirmed"
  | "change_pending" | "completed" | "cancelled" | "expired";

export interface ProposalVersion {
  version: number;
  kind: "initial" | "change";
  plan: Pick<Candidate, "activity" | "start" | "end" | "attendeeIds" | "publicReason" | "earliestDeparture">;
  deadline: string;
  createdAt: string;
}

export interface OutboxJob {
  key: string; // idempotency key
  kind: "private" | "create_group" | "update_group_roster" | "group" | "reminder" | "repeat_prompt";
  to: UserId[];
  text: string;
  dueAt: string;
  version?: number;
  status: "pending" | "sent" | "suppressed" | "cancelled";
}

export type Result =
  | { ok: true; state: OutingState; message?: string }
  | { ok: false; state: OutingState; error: string };

export class OutingLifecycle {
  state: OutingState = "draft";
  versions: ProposalVersion[] = [];
  currentVersion?: number; // the plan in force
  pendingVersion?: number; // awaiting acceptance
  currentInfeasible = false;
  acceptances = new Map<string, { answer: "accept" | "decline"; at: string; shareIdentity: boolean }>();
  repeatInterest = new Map<UserId, boolean>();
  outbox: OutboxJob[] = [];
  private processed = new Map<string, Result>();

  constructor(public outing: Outing, public users: Map<UserId, User>, public responseMinutes = 30) {}

  // ---------- helpers ----------
  private v(n?: number) { return this.versions.find((p) => p.version === n); }
  get current() { return this.v(this.currentVersion); }
  get pending() { return this.v(this.pendingVersion); }
  private consented(u: UserId) { const x = this.users.get(u); return !!x?.optedInAt && !x.stoppedAt; }
  private name(u: UserId) { return this.users.get(u)?.displayName ?? "Someone"; }
  private ok(message?: string): Result { return { ok: true, state: this.state, message }; }
  private err(error: string): Result { return { ok: false, state: this.state, error }; }

  private enqueue(job: Omit<OutboxJob, "status">) {
    if (this.outbox.some((j) => j.key === job.key)) return; // idempotent
    this.outbox.push({ ...job, status: "pending" });
  }
  private cancelJobs(pred: (j: OutboxJob) => boolean) {
    for (const j of this.outbox) if (j.status === "pending" && pred(j)) j.status = "cancelled";
  }
  private planText(p: ProposalVersion) {
    return renderPlanText(toPublicPlan({ version: p.version, ...p.plan }, this.users, this.outing.timezone));
  }
  private scheduleReminder(p: ProposalVersion, now: number) {
    const due = ms(p.plan.start) - 60 * MIN;
    if (due <= now) return; // confirmed inside the hour: omit (FR12)
    this.enqueue({ key: `reminder:${this.outing.id}:v${p.version}`, kind: "reminder", to: p.plan.attendeeIds,
      text: `Reminder: starts in 1 hour.\n${this.planText(p)}`, dueAt: iso(due), version: p.version });
  }

  /** Wraps a command so a repeated commandId has no further side effects. */
  private once(commandId: string, fn: () => Result): Result {
    const prev = this.processed.get(commandId);
    if (prev) return prev;
    const r = fn();
    this.processed.set(commandId, r);
    return r;
  }

  // ---------- commands ----------
  openCollecting(): Result {
    if (this.state !== "draft") return this.err("invalid_transition");
    this.state = "collecting";
    return this.ok();
  }

  /** Organizer selects a candidate → immutable proposal version (FR11). */
  propose(commandId: string, actor: UserId, c: Candidate, now: string): Result {
    return this.once(commandId, () => {
      if (actor !== this.outing.organizerId) return this.err("unauthorized");
      if (this.state !== "collecting") return this.err("invalid_transition");
      const t = ms(now);
      const deadline = Math.min(t + this.responseMinutes * MIN, ms(c.earliestDeparture));
      if (deadline <= t) return this.err("deadline_passed");
      const p: ProposalVersion = {
        version: this.versions.length + 1, kind: "initial", createdAt: now, deadline: iso(deadline),
        plan: { activity: c.activity, start: c.start, end: c.end, attendeeIds: c.attendeeIds,
          publicReason: c.publicReason, earliestDeparture: c.earliestDeparture },
      };
      this.versions.push(p);
      this.pendingVersion = p.version;
      this.state = "awaiting_confirmation";
      for (const u of p.plan.attendeeIds)
        this.enqueue({ key: `confirm:${this.outing.id}:v${p.version}:${u}`, kind: "private", to: [u], dueAt: now,
          version: p.version,
          text: `${this.planText(p)}\nReply "CONFIRM ${p.version}" to join and share your contact with the group, or "PASS".` });
      return this.ok();
    });
  }

  accept(commandId: string, actor: UserId, version: number, shareIdentity: boolean, now: string): Result {
    return this.once(commandId, () => {
      const p = this.pending;
      if (!p || version !== p.version) return this.err("stale_version");
      if (!["awaiting_confirmation", "change_pending"].includes(this.state)) return this.err("invalid_transition");
      if (!p.plan.attendeeIds.includes(actor)) return this.err("not_invited");
      if (!this.consented(actor)) return this.err("no_consent");
      if (ms(now) > ms(p.deadline)) return this.err("deadline_passed");
      if (!shareIdentity) return this.err("identity_consent_required");
      const key = `${version}:${actor}`;
      if (this.acceptances.has(key)) return this.ok("already_recorded");
      this.acceptances.set(key, { answer: "accept", at: now, shareIdentity });
      const all = p.plan.attendeeIds.every((u) => this.acceptances.get(`${version}:${u}`)?.answer === "accept");
      if (all) this.applyVersion(p, ms(now));
      return this.ok(all ? "confirmed" : "waiting_on_others");
    });
  }

  decline(commandId: string, actor: UserId, version: number, now: string): Result {
    return this.once(commandId, () => {
      const p = this.pending;
      if (!p || version !== p.version) return this.err("stale_version");
      if (!p.plan.attendeeIds.includes(actor)) return this.err("not_invited");
      this.acceptances.set(`${version}:${actor}`, { answer: "decline", at: now, shareIdentity: false });
      this.dropPending();
      // Organizer is told only that the plan didn't go through — never who passed.
      this.enqueue({ key: `declined:${this.outing.id}:v${version}`, kind: "private", to: [this.outing.organizerId],
        dueAt: now, text: `Plan v${version} didn't get everyone's yes. Want to try another option or time?` });
      return this.ok();
    });
  }

  /** Time passes: expire stale proposals. */
  tick(now: string): void {
    const p = this.pending;
    if (p && ms(now) > ms(p.deadline)) this.dropPending();
  }

  private dropPending() {
    const p = this.pending;
    if (!p) return;
    this.cancelJobs((j) => j.version === p.version && j.kind === "private");
    this.pendingVersion = undefined;
    if (p.kind === "initial") this.state = "collecting";
    else this.state = this.currentInfeasible ? "change_pending" : "confirmed"; // old plan stays in force
  }

  private applyVersion(p: ProposalVersion, now: number) {
    const prev = this.current;
    this.currentVersion = p.version;
    this.pendingVersion = undefined;
    this.currentInfeasible = false;
    this.state = "confirmed";
    this.cancelJobs((j) => j.kind === "reminder"); // obsolete reminders
    if (!prev) {
      this.enqueue({ key: `group:${this.outing.id}`, kind: "create_group", to: p.plan.attendeeIds,
        dueAt: iso(now), text: `You're confirmed!\n${this.planText(p)}`, version: p.version });
    } else {
      const sameRoster = prev.plan.attendeeIds.join() === p.plan.attendeeIds.join();
      if (!sameRoster)
        this.enqueue({ key: `roster:${this.outing.id}:v${p.version}`, kind: "update_group_roster",
          to: p.plan.attendeeIds, dueAt: iso(now), text: "", version: p.version });
      this.enqueue({ key: `update:${this.outing.id}:v${p.version}`, kind: "group", to: p.plan.attendeeIds,
        dueAt: iso(now), text: `Updated plan:\n${this.planText(p)}`, version: p.version });
    }
    this.scheduleReminder(p, now);
  }

  /** FR13: material change creates a pending version; current plan stays unless infeasible. */
  requestChange(commandId: string, actor: UserId,
    changes: Partial<Pick<ProposalVersion["plan"], "start" | "end" | "activity" | "attendeeIds">>,
    oldPlanStillFeasible: boolean, now: string): Result {
    return this.once(commandId, () => {
      const cur = this.current;
      if (!cur || !["confirmed", "change_pending"].includes(this.state)) return this.err("invalid_transition");
      if (!cur.plan.attendeeIds.includes(actor)) return this.err("unauthorized");
      if (this.pending) return this.err("change_already_pending");
      const plan = { ...cur.plan, ...changes };
      const t = ms(now);
      const p: ProposalVersion = { version: this.versions.length + 1, kind: "change", createdAt: now, plan,
        deadline: iso(Math.min(t + this.responseMinutes * MIN, ms(plan.start))) };
      this.versions.push(p);
      this.pendingVersion = p.version;
      this.state = "change_pending";
      if (!oldPlanStillFeasible) {
        this.currentInfeasible = true;
        this.cancelJobs((j) => j.kind === "reminder"); // pause reminders
      }
      for (const u of plan.attendeeIds)
        this.enqueue({ key: `confirm:${this.outing.id}:v${p.version}:${u}`, kind: "private", to: [u], dueAt: now,
          version: p.version,
          text: `Proposed change:\n${this.planText(p)}\nReply "CONFIRM ${p.version}" to accept or "KEEP" to keep the current plan.` });
      return this.ok();
    });
  }

  /** Withdrawal is immediate and needs nobody's permission (FR13). */
  withdraw(commandId: string, actor: UserId, now: string): Result {
    return this.once(commandId, () => {
      const cur = this.current;
      if (!cur || !cur.plan.attendeeIds.includes(actor)) return this.err("not_attending");
      const remaining = cur.plan.attendeeIds.filter((u) => u !== actor);
      if (this.pending) this.dropPending();
      this.cancelJobs((j) => j.kind === "reminder");
      const tooFew = remaining.length < cur.plan.activity.minAttendees;
      if (this.outing.policy === "everyone" || tooFew) {
        this.currentInfeasible = true;
        this.state = "change_pending";
        this.enqueue({ key: `replan:${this.outing.id}:v${cur.version}`, kind: "private", to: [this.outing.organizerId],
          dueAt: now, text: "The current plan no longer works for the group. Replan or cancel?" });
        return this.ok("needs_replan");
      }
      const p: ProposalVersion = { ...cur, version: this.versions.length + 1, kind: "change", createdAt: now,
        deadline: now, plan: { ...cur.plan, attendeeIds: remaining } };
      this.versions.push(p);
      this.applyVersion(p, ms(now));
      return this.ok();
    });
  }

  recordLateness(commandId: string, actor: UserId, minutes: number, now: string): Result {
    return this.once(commandId, () => {
      const cur = this.current;
      if (this.state !== "confirmed" || !cur?.plan.attendeeIds.includes(actor)) return this.err("not_attending");
      const others = cur.plan.attendeeIds.filter((u) => u !== actor);
      this.enqueue({ key: `late:${commandId}`, kind: "group", to: others, dueAt: now,
        text: `Heads-up: ${this.name(actor)} is running about ${minutes} min late.` });
      return this.ok();
    });
  }

  complete(now: string): Result {
    const cur = this.current;
    if (this.state !== "confirmed" || !cur) return this.err("invalid_transition");
    this.state = "completed";
    this.cancelJobs((j) => j.kind === "reminder");
    for (const u of cur.plan.attendeeIds)
      this.enqueue({ key: `repeat:${this.outing.id}:${u}`, kind: "repeat_prompt", to: [u], dueAt: now,
        text: `Run it back next week? Reply YES or PASS (only you see this).` });
    return this.ok();
  }

  cancel(actor: UserId): Result {
    if (actor !== this.outing.organizerId) return this.err("unauthorized");
    if (["completed", "cancelled", "expired"].includes(this.state)) return this.err("invalid_transition");
    this.state = "cancelled";
    this.pendingVersion = undefined;
    this.cancelJobs(() => true);
    return this.ok();
  }

  recordRepeat(actor: UserId, yes: boolean): Result {
    if (this.state !== "completed" || !this.current?.plan.attendeeIds.includes(actor)) return this.err("invalid_transition");
    this.repeatInterest.set(actor, yes);
    return this.ok();
  }

  /** FR14: only explicit yes respondents; fresh availability & consent required. */
  nextRoundRoster(): UserId[] {
    return [...this.repeatInterest].filter(([, y]) => y).map(([u]) => u);
  }

  /** STOP: immediate, suppresses queued sends, treated as withdrawal if attending. */
  stop(userId: UserId, now: string): void {
    const u = this.users.get(userId);
    if (u) u.stoppedAt = now;
    for (const j of this.outbox)
      if (j.status === "pending" && j.to.includes(userId) && j.to.length === 1) j.status = "suppressed";
    if (this.current?.plan.attendeeIds.includes(userId) && this.state === "confirmed")
      this.withdraw(`stop:${userId}:${now}`, userId, now);
    else if (this.pending?.plan.attendeeIds.includes(userId)) this.dropPending();
  }

  /** Worker: jobs due now, with consent rechecked at dispatch time. */
  dueJobs(now: string): OutboxJob[] {
    const t = ms(now);
    const due: OutboxJob[] = [];
    for (const j of this.outbox) {
      if (j.status !== "pending" || ms(j.dueAt) > t) continue;
      j.to = j.to.filter((u) => this.consented(u));
      if (j.to.length === 0) { j.status = "suppressed"; continue; }
      due.push(j);
    }
    return due;
  }
}
