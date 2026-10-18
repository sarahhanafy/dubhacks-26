import { Spectrum } from "spectrum-ts";
import { imessage } from "@spectrum-ts/imessage";
import { CookingBot, type Transport } from "./bot.js";
import { parseProfileWithAI } from "./llm.js";

// Anyone who texts the What's Cooking number is onboarded (texting first = opt-in).
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
      console.log(`[whats-cooking] → …${userId.slice(-4)}: ${text.split("\n")[0]}`);
    } catch (e) {
      console.error(`[whats-cooking] send to …${userId.slice(-4)} failed:`, (e as Error).message);
    }
  },
};

const bot = new CookingBot(transport, () => new Date(), parseProfileWithAI, "data/huddle.json");
setInterval(() => bot.tick().catch((e) => console.error("[whats-cooking] tick", e)), 60_000);
console.log(`[whats-cooking] ready · ${bot.users.size} saved users · AI: ${process.env.OPENROUTER_API_KEY ? "OpenRouter" : process.env.GEMINI_API_KEY ? "Gemini" : "off (rule parser)"}`);

for await (const [space, message] of app.messages) {
  if (message.direction === "outbound") continue;
  if (message.content.type !== "text" || !message.sender) continue;
  const from = norm(message.sender.id);
  spaces.set(from, space); // reply in the thread they texted from
  console.log(`[whats-cooking] ← …${from.slice(-4)}: ${message.content.text}`);
  try {
    await bot.handle(from, message.content.text);
  } catch (e) {
    console.error("[whats-cooking] handler error", e);
    await space.send("sorry, something broke on my end. try again, or text HELP.");
  }
}
