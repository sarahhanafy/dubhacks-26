import { describe, expect, it } from "vitest";
import { generateProposals } from "../src/domain/matcher.js";
import { toPublicPlan } from "../src/domain/projection.js";
import * as fx from "../src/fixtures/demo.js";
import type { Outing, PrivateResponse } from "../src/domain/types.js";

const clone = <T>(x: T): T => structuredClone(x);
const base = () => ({
  outing: clone(fx.outing),
  users: new Map(clone(fx.users).map((u) => [u.id, u])),
  grants: clone(fx.grants),
  responses: clone(fx.responses),
  activities: clone(fx.activities),
  now: fx.NOW,
});
const resp = (rs: PrivateResponse[], id: string) => rs.find((r) => r.userId === id)!;

describe("matcher", () => {
  it("returns up to three distinct activities, ranked by FR9", () => {
    const r = generateProposals(base());
    expect(r.options.map((o) => o.activity.id)).toEqual(["pickleball", "walk", "pho"]);
    expect(r.options[0]!.attendeeIds).toHaveLength(4);
  });

  it("A3: private budget excludes that person from the meal, not the whole group (flexible)", () => {
    const pho = generateProposals(base()).options.find((o) => o.activity.id === "pho")!;
    expect(pho.attendeeIds).not.toContain("kai");
  });

  it("A4: everyone mode cannot produce a subset", () => {
    const i = base();
    (i.outing as Outing).policy = "everyone";
    const ids = generateProposals(i).options.map((o) => o.activity.id);
    expect(ids).not.toContain("pho"); // Kai's budget blocks it for the full roster
    expect(ids).toContain("pickleball");
  });

  it("A2: maybe willingness never counts as attendance", () => {
    const i = base();
    resp(i.responses, "jenna").willing = "maybe";
    const pb = generateProposals(i).options.find((o) => o.activity.id === "pickleball");
    expect(pb).toBeUndefined(); // pickleball needs exactly 4
  });

  it("A3: unknown travel is unresolved, not assumed to pass", () => {
    const i = base();
    i.outing.policy = "everyone";
    delete resp(i.responses, "amir").travel.v_courts;
    const r = generateProposals(i);
    expect(r.options.map((o) => o.activity.id)).not.toContain("pickleball");
    expect(r.unresolvedCount).toBeGreaterThan(0);
  });

  it("A3: travel that doesn't fit the window is excluded", () => {
    const i = base();
    i.grants.find((g) => g.userId === "amir")!.end = "2026-10-18T22:00:00.000Z"; // must be home by 3 PM
    const r = generateProposals(i);
    expect(r.options.find((o) => o.activity.id === "pickleball")).toBeUndefined();
  });

  it("A1: STOPped or expired grants are excluded", () => {
    const i = base();
    i.users.get("kai")!.stoppedAt = fx.NOW;
    i.grants.find((g) => g.userId === "jenna")!.expiresAt = "2026-10-18T16:00:00.000Z";
    const walk = generateProposals(i).options.find((o) => o.activity.id === "walk")!;
    expect(walk.attendeeIds.sort()).toEqual(["amir", "sarah"]);
  });

  it("FR10: no match is reported honestly", () => {
    const i = base();
    i.outing.windowEnd = "2026-10-18T21:30:00.000Z";
    expect(generateProposals(i).noMatch).toBe(true);
  });

  it("A6: public projection and reason contain no private data", () => {
    const i = base();
    const [c] = generateProposals(i).options;
    const pub = JSON.stringify(toPublicPlan({ version: 1, ...c! }, i.users, fx.TZ));
    for (const leak of ["maxBudget", "tight on money", "travelMinutes", "maxTravel","needsReturnTravel", "fixture estimate"])
      expect(pub).not.toContain(leak);
  });

  it("is deterministic", () => {
    expect(generateProposals(base())).toEqual(generateProposals(base()));
  });
});
