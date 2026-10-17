// Run: npm run demo — walks the PRD §8 journey against labeled fixtures.
import { generateProposals } from "./domain/matcher.js";
import { OutingLifecycle } from "./domain/lifecycle.js";
import { formatLocal } from "./domain/projection.js";
import * as fx from "./fixtures/demo.js";

const at = (min: number) => new Date(Date.parse(fx.NOW) + min * 60_000).toISOString();
const users = new Map(fx.users.map((u) => [u.id, { ...u }]));
const log = (s: string) => console.log(`\n— ${s}`);

const res = generateProposals({ outing: fx.outing, users, grants: fx.grants, responses: fx.responses,
  activities: fx.activities, now: fx.NOW });
log("Options for the group (no private reasons shown)");
res.options.forEach((o, i) =>
  console.log(`${i + 1}. ${o.activity.name} @ ${formatLocal(o.start, fx.TZ)} · ${o.attendeeIds.length} going · ${o.publicReason}`));

const life = new OutingLifecycle(fx.outing, users);
life.openCollecting();
const pick = res.options[0]!;
life.propose("p1", "sarah", pick, fx.NOW);
for (const u of pick.attendeeIds) life.accept(`a1:${u}`, u, 1, true, at(2));
log(`State: ${life.state}`);

life.requestChange("c1", "amir", { start: at(300), end: at(390) }, true, at(5));
log(`Amir asks for a later start → ${life.state}, current still v${life.currentVersion}`);
for (const u of pick.attendeeIds) life.accept(`a2:${u}`, u, 2, true, at(6));
log(`All approve → ${life.state}, current v${life.currentVersion}`);

life.recordLateness("l1", "jenna", 10, at(290));
life.complete(at(400));
life.recordRepeat("sarah", true); life.recordRepeat("amir", true);
life.recordRepeat("jenna", true); life.recordRepeat("kai", false);
log(`Next round roster: ${life.nextRoundRoster().join(", ")}`);

log("Outbox");
for (const j of life.outbox)
  console.log(`[${j.status}] ${j.kind} → ${j.to.join(",")} @ ${formatLocal(j.dueAt, fx.TZ)}\n   ${j.text.split("\n")[0]}`);
