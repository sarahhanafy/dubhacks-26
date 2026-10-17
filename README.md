# DubHacks 26 — Community Connection App

Text-first assistant that turns "I want to hang out" into a confirmed outing. See `PRD.md`.

## Run

```bash
npm install
npm test        # acceptance checks A1–A9 (domain level)
npm run demo    # walks the §8 demo journey on labeled fixtures
```

## Layout

- `src/domain/types.ts`: records (PRD §6)
- `src/domain/matcher.ts`: deterministic feasibility and ranking (FR7–FR10); the LLM never decides this
- `src/domain/lifecycle.ts`: outing state machine, proposal versions, outbox jobs (FR11–FR14)
- `src/domain/projection.ts`: public plan allow-list; the only data groups and the LLM see
- `src/fixtures/demo.ts`: 4-person sample circle and venues (labeled sample data)

## Next

Photon adapter (verify DMs and group creation first), persistence with outbox transactions, and LLM request parsing into `Outing` and `PrivateResponse`.
