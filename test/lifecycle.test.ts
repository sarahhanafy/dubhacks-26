import { describe, expect, it } from "vitest";
import { OutingLifecycle } from "../src/domain/lifecycle.js";
import { generateProposals } from "../src/domain/matcher.js";
import * as fx from "../src/fixtures/demo.js";

const NOW = fx.NOW; // Sun 10 AM PT
const at = (min: number) => new Date(Date.parse(NOW) + min * 60_000).toISOString();

function setup() {
  const users = new Map(structuredClone(fx.users).map((u) => [u.id, u]));
  const outing = structuredClone(fx.outing);
  const r = generateProposals({ outing, users, grants: fx.grants, responses: fx.responses,
    activities: fx.activities, now: NOW });
  const walk = r.options.find((o) => o.activity.id === "walk")!;
  const life = new OutingLifecycle(outing, users);
  life.openCollecting();
  return { life, walk, users };
}
function confirmAll(life: OutingLifecycle, version: number, ids: string[], when = NOW) {
  for (const u of ids) life.accept(`acc:${version}:${u}`, u, version, true, when);
}

describe("lifecycle", () => {
  it("A5: confirms only when every intended attendee accepts the exact version", () => {
    const { life, walk } = setup();
    expect(life.propose("p1", "sarah", walk, NOW).ok).toBe(true);
    confirmAll(life, 1, walk.attendeeIds.slice(0, 3));
    expect(life.state).toBe("awaiting_confirmation");
    confirmAll(life, 1, walk.attendeeIds.slice(3));
    expect(life.state).toBe("confirmed");
    expect(life.outbox.filter((j) => j.kind === "create_group")).toHaveLength(1);
  });

  it("A5: duplicate acceptances create one transition and one group op", () => {
    const { life, walk } = setup();
    life.propose("p1", "sarah", walk, NOW);
    confirmAll(life, 1, walk.attendeeIds);
    confirmAll(life, 1, walk.attendeeIds);
    life.accept("different-cmd", "amir", 1, true, NOW);
    expect(life.outbox.filter((j) => j.kind === "create_group")).toHaveLength(1);
    expect(life.outbox.filter((j) => j.kind === "reminder")).toHaveLength(1);
  });

  it("A5: an old-version yes cannot confirm a new version", () => {
    const { life, walk } = setup();
    life.propose("p1", "sarah", walk, NOW);
    confirmAll(life, 1, walk.attendeeIds);
    life.requestChange("c1", "amir", { start: at(330), end: at(390) }, true, at(5));
    const r = life.accept("stale", "jenna", 1, true, at(6));
    expect(r).toMatchObject({ ok: false, error: "stale_version" });
  });

  it("silence/timeout returns an initial proposal to collecting", () => {
    const { life, walk } = setup();
    life.propose("p1", "sarah", walk, NOW);
    life.tick(at(31));
    expect(life.state).toBe("collecting");
    expect(life.accept("late", "amir", 1, true, at(32)).ok).toBe(false);
  });

  it("decline tells the organizer without naming who passed", () => {
    const { life, walk } = setup();
    life.propose("p1", "sarah", walk, NOW);
    life.decline("d1", "kai", 1, NOW);
    const msg = life.outbox.find((j) => j.key.startsWith("declined"))!;
    expect(msg.text).not.toContain("Kai");
    expect(life.state).toBe("collecting");
  });

  it("A7: unapproved change keeps the current plan; approval updates it and replaces reminders", () => {
    const { life, walk } = setup();
    life.propose("p1", "sarah", walk, NOW);
    confirmAll(life, 1, walk.attendeeIds);
    life.requestChange("c1", "amir", { start: at(330), end: at(390) }, true, at(5));
    expect(life.state).toBe("change_pending");
    expect(life.currentVersion).toBe(1);
    life.decline("d", "jenna", 2, at(6));
    expect(life.state).toBe("confirmed");
    expect(life.currentVersion).toBe(1);

    life.requestChange("c2", "amir", { start: at(330), end: at(390) }, true, at(7));
    confirmAll(life, 3, walk.attendeeIds, at(8));
    expect(life.currentVersion).toBe(3);
    const reminders = life.outbox.filter((j) => j.kind === "reminder");
    expect(reminders.filter((j) => j.status === "pending").map((j) => j.version)).toEqual([3]);
  });

  it("A7: infeasible current plan pauses reminders", () => {
    const { life, walk } = setup();
    life.propose("p1", "sarah", walk, NOW);
    confirmAll(life, 1, walk.attendeeIds);
    life.requestChange("c1", "sarah", { start: at(330), end: at(390) }, false, at(5));
    expect(life.outbox.some((j) => j.kind === "reminder" && j.status === "pending")).toBe(false);
  });

  it("withdrawal is immediate; below minimum forces replan", () => {
    const { life, walk } = setup();
    life.propose("p1", "sarah", walk, NOW);
    confirmAll(life, 1, walk.attendeeIds);
    life.withdraw("w1", "kai", at(5));
    expect(life.state).toBe("confirmed");
    expect(life.current!.plan.attendeeIds).not.toContain("kai");
    life.withdraw("w2", "jenna", at(6));
    life.withdraw("w3", "amir", at(7));
    expect(life.state).toBe("change_pending"); // walk needs 2
  });

  it("lateness produces a minimal heads-up to others only", () => {
    const { life, walk } = setup();
    life.propose("p1", "sarah", walk, NOW);
    confirmAll(life, 1, walk.attendeeIds);
    life.recordLateness("l1", "jenna", 10, at(200));
    const j = life.outbox.find((x) => x.key === "late:l1")!;
    expect(j.to).not.toContain("jenna");
    expect(j.text).toBe("Heads-up: Jenna is running about 10 min late.");
    expect(life.current!.plan.start).toBe(walk.start); // lateness doesn't move the outing
  });

  it("A1: STOP suppresses queued sends at dispatch", () => {
    const { life, walk } = setup();
    life.propose("p1", "sarah", walk, NOW);
    life.stop("kai", NOW);
    const due = life.dueJobs(NOW);
    expect(due.some((j) => j.to.includes("kai"))).toBe(false);
    expect(life.state).toBe("collecting"); // pending proposal dropped
  });

  it("A8: cancelled outing stays cancelled", () => {
    const { life, walk } = setup();
    life.propose("p1", "sarah", walk, NOW);
    life.cancel("sarah");
    confirmAll(life, 1, walk.attendeeIds);
    expect(life.state).toBe("cancelled");
    expect(life.dueJobs(at(1000))).toHaveLength(0);
  });

  it("A9: only explicit repeat opt-ins enter the next round", () => {
    const { life, walk } = setup();
    life.propose("p1", "sarah", walk, NOW);
    confirmAll(life, 1, walk.attendeeIds);
    life.complete(at(400));
    life.recordRepeat("sarah", true);
    life.recordRepeat("amir", true);
    life.recordRepeat("kai", false);
    expect(life.nextRoundRoster().sort()).toEqual(["amir", "sarah"]);
  });
});
