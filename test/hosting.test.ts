import { describe, expect, it } from "vitest";
import { createHostedEvent, parseHostText } from "../src/domain/hosting.js";
import { rankEvents, parseAreas } from "../src/domain/discovery.js";
import { EVENTS } from "../src/events/seattle.js";

const NOW = new Date("2026-10-18T05:00:00.000Z"); // Sat Oct 17, 10 PM PT

describe("hosting", () => {
  it("picks up access info from a texted host request", () => {
    const r = parseHostText("host kid friendly picnic sun 1pm gas works", NOW);
    if (!r.ok) throw new Error("parse failed");
    expect(r.input.access).toEqual(["kid_friendly"]);
    expect(r.input.title).toBe("Picnic");
  });

  it("parses a texted host request", () => {
    const r = parseHostText("HOST potluck sat 6pm cal anderson", NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.title).toBe("Potluck");
    expect(r.input.place).toBe("Cal Anderson Park");
    expect(r.input.start).toBe("2026-10-25T01:00:00.000Z"); // next Sat 6 PM PDT
  });

  it("asks for what's missing instead of guessing", () => {
    const r = parseHostText("host pickup soccer", NOW);
    expect(r).toEqual({ ok: false, missing: ["where", "when"] });
  });

  it("creates a potluck that shows up in neighbors' picks", () => {
    const r = parseHostText("host taco potluck sunday 1pm green lake", NOW);
    if (!r.ok) throw new Error("parse failed");
    const ev = createHostedEvent({ ...r.input, hostUserId: "+1" });
    expect(ev.potluck).toBe(true);
    expect(ev.emoji).toBe("🥘");
    expect(ev.hostedBy).toBe("neighbor");
    const picks = rankEvents([...EVENTS, ev], { interests: ["food"], areas: parseAreas("green lake"), maxDistanceKm: 3, when: [] }, NOW, { limit: 10 });
    const mine = picks.find((p) => p.event.id === ev.id);
    expect(mine).toBeDefined();
    expect(mine!.reasons).toContain("neighbor potluck, bring a dish");
  });
});
