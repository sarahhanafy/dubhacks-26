import { describe, expect, it } from "vitest";
import { slotOf, parseArea, parseAreas, parseBudget, parseInterests, parseWhen, rankEvents, type Profile } from "../src/domain/discovery.js";
import { EVENTS } from "../src/events/seattle.js";

const NOW = new Date("2026-10-18T05:00:00.000Z"); // Sat Oct 17, 10 PM PT
const base: Profile = { interests: ["sports", "cafe"], home: parseArea("capitol hill"), maxBudget: 15, maxDistanceKm: 10, when: [] };

describe("rankEvents", () => {
  it("puts matching interests first and caps at 5", () => {
    const picks = rankEvents(EVENTS, base, NOW);
    expect(picks.length).toBe(5);
    expect(["sports", "cafe"]).toContain(picks[0]!.event.category);
  });

  it("never exceeds budget, distance, or includes past/full events", () => {
    const picks = rankEvents(EVENTS, { ...base, maxBudget: 5, maxDistanceKm: 4 }, NOW, { limit: 50 });
    for (const p of picks) {
      expect(p.event.cost).toBeLessThanOrEqual(5);
      expect(p.distanceKm!).toBeLessThanOrEqual(4);
      expect(Date.parse(p.event.start)).toBeGreaterThan(NOW.getTime());
      expect(p.event.going).toBeLessThan(p.event.capacity);
    }
  });

  it("respects when people are free", () => {
    const picks = rankEvents(EVENTS, { ...base, interests: [], maxDistanceKm: 50, when: ["weekday_evenings"] }, NOW, { limit: 50 });
    expect(picks.length).toBeGreaterThan(0);
    for (const p of picks) expect(slotOf(p.event.start)).toBe("weekday_evenings");
  });

  it("keeps variety: at most two per category", () => {
    const picks = rankEvents(EVENTS, { ...base, interests: ["sports"], maxDistanceKm: 50 }, NOW);
    expect(picks.filter((p) => p.event.category === "sports").length).toBeLessThanOrEqual(2);
  });

  it("can exclude events already sent", () => {
    const first = rankEvents(EVENTS, base, NOW);
    const more = rankEvents(EVENTS, base, NOW, { excludeIds: new Set(first.map((p) => p.event.id)) });
    expect(more.some((p) => first.some((f) => f.event.id === p.event.id))).toBe(false);
  });

  it("is deterministic", () => {
    expect(rankEvents(EVENTS, base, NOW)).toEqual(rankEvents(EVENTS, base, NOW));
  });
});

describe("multiple areas", () => {
  it("measures distance from the closest area", () => {
    const one = rankEvents(EVENTS, { ...base, interests: ["wellness"], areas: parseAreas("capitol hill"), maxDistanceKm: 3 }, NOW, { limit: 50 });
    const two = rankEvents(EVENTS, { ...base, interests: ["wellness"], areas: parseAreas("capitol hill and bellevue"), maxDistanceKm: 3 }, NOW, { limit: 50 });
    expect(one.some((p) => p.event.id === "e20")).toBe(false); // Bellevue yoga
    expect(two.some((p) => p.event.id === "e20")).toBe(true);
  });
  it("parses several neighborhoods in order", () => {
    expect(parseAreas("mostly ballard, sometimes cap hill or the u district").map((a) => a.label)).toEqual(["Ballard", "Capitol Hill", "U District"]);
  });
});

describe("onboarding parsers", () => {
  it("reads free-text answers", () => {
    expect(parseInterests("pickleball, coffee pop ups and hiking")).toEqual(["cafe", "sports", "outdoors"]);
    expect(parseArea("I live near the U District")?.label).toBe("U District");
    expect(parseWhen("weekends and weeknight evenings")).toEqual(["weekends", "weekday_evenings"]);
    expect(parseBudget("under $10")).toBe(10);
    expect(parseBudget("free stuff only")).toBe(0);
  });
});
