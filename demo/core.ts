// Browser bundle entry: exposes the real discovery + hosting engine to the demo page.
export { rankEvents, distanceKm, slotOf, nearestArea, areasOf } from "../src/domain/discovery";
export { createHostedEvent, parseHostText } from "../src/domain/hosting";
export { zonedToUtc } from "../src/domain/request";
export { EVENTS, AREAS } from "../src/events/seattle";
