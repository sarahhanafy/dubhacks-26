# What's Cooking 🍳

Every week, What's Cooking texts you a few things happening near you, like pop-up cafés, open pickleball courts, swim meetups and group hikes. Reply with a number to join. And anyone can host: text `HOST taco potluck sat 6pm cal anderson` and it goes out in neighbors' weekly texts, with a shared "who's bringing what" list for potlucks. The app shows the same events on a map and in a list, so it's easy to show up, keep showing up, and become a regular.

Built at DubHacks 2026 (Community Kitchen track) with Photon iMessage.

## Try it

**App demo (laptop):** `npm install && npm run demo:app`, then open `demo/index.html`. Press **▶ play demo reel** for a self-running tour.

**Live link:** while the bot is running (`npm run dev` in `huddle/`), the app at `demo/index.html` syncs with it through `http://localhost:8787`: join or host by text and it appears in the app; join, host, or add a dish in the app and the bot knows.

**iMessage bot:**
```bash
cd huddle   # the iMessage bot lives in this folder
npm install
# .env needs PROJECT_ID and PROJECT_SECRET from the Photon dashboard (optional: OPENROUTER_API_KEY, or GEMINI_API_KEY)
npm run dev        # live over iMessage
npm run sim        # offline rehearsal of a full conversation
```
Text the project's number "hi". What's Cooking asks 3 quick questions (interests, neighborhood, when you're free and budget), then texts back 5 events near you. Commands: `1` to join · `INFO 2` · `MORE` · `MY` · `LEAVE` · `PREFS` · `STOP`, or text a mood like "something outdoorsy". Host your own with `HOST <what> <day> <time> <place>`, and for potlucks reply `BRING <dish>`; hosts get a text when someone joins. It sends a digest every Sunday morning and a reminder 2 hours before anything you joined.

## How it works

- `src/events/seattle.ts`: curated **sample** events for the demo week at real Seattle parks and neighborhoods (hosts and counts are illustrative).
- `src/domain/discovery.ts`: deterministic ranking. Hard filters first (in the future, this week, under budget, within distance, matches when you're free, not full, and meets every access need: step-free, sensory-friendly, kid-friendly), then a transparent score: your interests, distance, free, beginner-friendly, recurring (easy to become a regular), sooner. At most two picks per category, for variety.
- `src/domain/hosting.ts`: turns "HOST potluck sat 6pm cal anderson" (or the app's host form) into a neighbor-hosted event; asks for anything missing instead of guessing.
- `huddle/src/api.ts`: the localhost link the demo app polls.
- `huddle/src/bot.ts`: the iMessage conversation. Texting first is the opt-in, STOP is immediate, and an optional AI call (OpenRouter or Gemini) only reads your own onboarding answers.
- `demo/`: the phone-style app (map, list, event sheet, My week, and the weekly text) running the same ranking engine in the browser.

`npm test` runs the domain tests.
