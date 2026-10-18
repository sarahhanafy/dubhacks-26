import { describe, expect, it } from "vitest";
import { parseFriendReply, parseRequest } from "../src/domain/request.js";

const TZ = "America/Los_Angeles";
const SAT_10PM = new Date("2026-10-18T05:00:00.000Z"); // Sat Oct 17, 10 PM PDT

describe("parseRequest", () => {
  it("resolves a weekday + window in the sender's timezone", () => {
    const r = parseRequest("free sunday 2 to 6, something active, under $15", SAT_10PM, TZ);
    expect(r.windowStart).toBe("2026-10-18T21:00:00.000Z");
    expect(r.windowEnd).toBe("2026-10-19T01:00:00.000Z");
    expect(r.maxBudget).toBe(15);
    expect(r.vibe).toBe("active");
    expect(r.dateLabel).toBe("Sun, Oct 18, 2:00 PM – 6:00 PM");
    expect(r.missing).toEqual([]);
  });

  it("handles explicit am/pm and tomorrow", () => {
    const r = parseRequest("tomorrow 10am-1pm brunch", SAT_10PM, TZ);
    expect(r.windowStart).toBe("2026-10-18T17:00:00.000Z");
    expect(r.windowEnd).toBe("2026-10-18T20:00:00.000Z");
    expect(r.vibe).toBe("food");
  });

  it("reports missing hard constraints instead of guessing", () => {
    expect(parseRequest("let's do something fun", SAT_10PM, TZ).missing).toEqual(["day", "time"]);
  });

  it("'free sunday' is availability, not a $0 budget", () => {
    expect(parseRequest("free sunday 2 to 6", SAT_10PM, TZ).maxBudget).toBeUndefined();
    expect(parseRequest("sunday 2 to 6, something free", SAT_10PM, TZ).maxBudget).toBe(0);
  });
});

describe("parseFriendReply", () => {
  it("reads willingness, budget and an end time", () => {
    expect(parseFriendReply("yes but only $10, until 5")).toEqual({ willing: "yes", maxBudget: 10, untilHour: 17 });
    expect(parseFriendReply("maybe")).toEqual({ willing: "maybe" });
    expect(parseFriendReply("pass")).toEqual({ willing: "no" });
  });
});
