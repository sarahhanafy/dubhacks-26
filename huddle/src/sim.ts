// Offline rehearsal: `npm run sim` plays a full conversation with a fake transport.
import { CookingBot } from "./bot.js";

let now = new Date("2026-10-18T05:00:00.000Z"); // Sat Oct 17, 10 PM PT
const bot = new CookingBot({ async dm(_id, text) { console.log(`\x1b[35mwhat's cooking:\x1b[0m ${text}\n`); } }, () => now);
const me = "+12065550100";
const say = async (t: string) => { console.log(`\x1b[36mme:\x1b[0m ${t}`); await bot.handle(me, t); };

await say("hi");
await say("pickleball, coffee pop ups and hiking");
await say("capitol hill and ballard");
await say("weekends and weeknights, under $15");
await say("INFO 1");
await say("1");
await say("MORE");
await say("something with music");
await say("MY");
now = new Date(Date.parse(bot.events.find((e) => e.id === bot.users.get(me)!.joined[0])!.start) - 90 * 60_000);
await bot.tick();
await say("STOP");
await say("EVENTS"); // no reply after STOP
