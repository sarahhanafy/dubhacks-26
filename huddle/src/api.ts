// Live link for the laptop demo (localhost only): the app polls this, so joining or hosting
// by text shows up in the app, and joining or hosting in the app shows up for the bot.
import { createServer, type Server } from "node:http";
import type { CookingBot } from "./bot.js";

export function startAppLink(bot: CookingBot, port = Number(process.env.APP_API_PORT ?? 8787)): Server {
  return createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.end();
  const send = (code: number, body: unknown) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
  try {
    const me = bot.activeUser;
    if (req.method === "GET" && req.url === "/api/state")
      return send(200, { version: bot.version, events: bot.events, me: me ? { joined: me.joined, areas: me.profile.areas ?? [] } : null });
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    if (!me) return send(409, { error: "Text the bot first so the app knows who you are." });
    const ev = body.id ? bot.events.find((e) => e.id === body.id) : undefined;
    if (req.method === "POST" && req.url === "/api/join" && ev) { body.join ? await bot.joinEvent(me, ev, false) : bot.leaveEvent(me, ev); return send(200, { ok: true }); }
    if (req.method === "POST" && req.url === "/api/bring" && ev && body.dish) { bot.bringTo(me, ev, String(body.dish)); return send(200, { ok: true }); }
    if (req.method === "POST" && req.url === "/api/host" && body.title && body.start) {
      const hosted = bot.addHosted({ title: String(body.title).slice(0, 60), start: body.start, place: body.place, neighborhood: body.neighborhood,
        lat: +body.lat, lng: +body.lng, potluck: !!body.potluck, category: body.category }, me);
      return send(200, { ok: true, event: hosted });
    }
    send(404, { error: "not found" });
  } catch (e) { send(400, { error: (e as Error).message }); }
}).listen(port, "127.0.0.1", () => console.log(`[whats-cooking] app link on http://localhost:${port}`));
}
