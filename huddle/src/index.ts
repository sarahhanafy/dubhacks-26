import { Spectrum } from "spectrum-ts";
import { imessage } from "@spectrum-ts/imessage";
import { HuddleBot, type Transport } from "./bot.js";
import { parseProfileWithGemini } from "./llm.js";

// Anyone who texts the Huddle number is onboarded (texting first = opt-in).
// On Photon's shared plan, their number must also be added as a project user in the dashboard.

const app = await Spectrum({
  projectId: process.env.PROJECT_ID!,
  projectSecret: process.env.PROJECT_SECRET!,
  providers: [imessage.config()],
});
const im = imessage(app);

const norm = (id: string) => (id.includes("@") ? id.toLowerCase() : "+" + id.replace(/\D/g, ""));
const spaces = new Map<string, { send: (t: string) => Promise<unknown> }>();

const transport: Transport = {
  async dm(userId, text) {
    try {
      let space = spaces.get(userId);
      if (!space) { space = await im.space.create(await im.user(userId)); spaces.set(userId, space); }
      await space.send(text);
      console.log(`[huddle] → …${userId.slice(-4)}: ${text.split("\n")[0]}`);
    } catch (e) {
      console.error(`[huddle] send to …${userId.slice(-4)} failed:`, (e as Error).message);
    }
  },
};

const bot = new HuddleBot(transport, () => new Date(), parseProfileWithGemini, "data/huddle.json");
setInterval(() => bot.tick().catch((e) => console.error("[huddle] tick", e)), 60_000);
console.log(`[huddle] ready · ${bot.users.size} saved users · Gemini ${process.env.GEMINI_API_KEY ? "on" : "off (rule parser)"}`);

for await (const [space, message] of app.messages) {
  if (message.direction === "outbound") continue;
  if (message.content.type !== "text" || !message.sender) continue;
  const from = norm(message.sender.id);
  spaces.set(from, space); // reply in the thread they texted from
  console.log(`[huddle] ← …${from.slice(-4)}: ${message.content.text}`);
  try {
    await bot.handle(from, message.content.text);
  } catch (e) {
    console.error("[huddle] handler error", e);
    await space.send("sorry, something broke on my end. try again, or text HELP.");
  }
}
