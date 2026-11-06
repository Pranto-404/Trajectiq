# TRAJECTIQ · React mission design game

Interactive spacecraft design, mission simulation and engineering trade-offs for the NASA Space Apps game challenge.

**Play:** https://trajectiq-omega.vercel.app/ · **Production branch:** `main`

The current app includes eight destinations, ten mission scenarios, a persistent interactive 3D spacecraft, light/dark themes, animated space backgrounds, reduced-motion support, and an offline mission assistant. Crew mode supports up to four people sharing one device; it is not network multiplayer. The assistant uses the simulation engine and local rules, not generative AI.

```sh
npm ci --ignore-scripts
npm run dev       # local development
npm test          # Node and UI regression suites
npm run build     # hosted app and offline edition in site/
npm run preview   # preview the built app
```

Vercel builds `main` with `npm run build && npm test` and serves `site/`. The new standalone edition is generated at `site/TRAJECTIQ_Play.html`; `dist/TRAJECTIQ_Play.html` remains the archived v6 artifact. Requires Node >=22.12.

Verification: 718 automated tests passed locally, plus local Edge checks of themes, assistant experiments, mission flow and responsive layouts. Physical-phone, screen-reader and comprehensive offline validation remain outstanding. See [QA](docs/QA_V7_INTEGRATION.md) and [progress](docs/plan/PROGRESS.md).

## Historical v6 documentation

The following records the previous release; scenario counts, setup commands, dependency descriptions and test totals below are historical. Use the current instructions above.

**Space Mission Design Game** · built for the NASA International Space Apps Challenge 2026 challenge of the same name.

> Design a spacecraft, launch it, fly the mission, find out *why* it succeeded or failed, and redesign. Alone, or as a crew of up to four.

**Play online:** https://trajectiq-omega.vercel.app/ · **Source:** https://github.com/Pranto-404/Trajectiq

## What the challenge asks, and where to find it in the game

| Challenge asks for | In TRAJECTIQ |
|---|---|
| Define a mission objective first | **Mission board** with four scenarios, a mission charter (budget, science target, schedule, orbit limits) and the most critical resource named for each |
| Design a spacecraft, instruments, launch vehicle and orbit | Hangar with seven subsystems, drag-and-drop in 3D, **orbit options explained**, and a launch-vehicle envelope check |
| Manage mass, power, budget, data, communications and **time** | Live margins for all six, including a development-schedule resource |
| Check mass and orbit against the launch vehicle | Launch–orbit compatibility check; rideshare cannot reach low inclinations or high orbits |
| Simulate the mission and evaluate it | Deterministic engine: rocket equation, orbit period, shadow, battery, recorder and contact link |
| Single player and teams of up to four with different roles | **Crew mode**: four roles own different subsystems, negotiate by suggestion, sign off Go/No-Go and vote in crises |
| Scoring that rewards performance, scientific value, efficient resources, decisions, collaboration | **Mission Score out of 1000** across exactly those five things |
| Difficulty levels, scenarios, random events, sandbox | Cadet / Engineer / Flight Director; Moon and Mars scenarios; a seeded **space-weather event**; **Sandbox** mode |
| Save, share and compare designs; leaderboard; mission report | **Mission codes** that re-fly any design fairly, a local leaderboard, a printable report |
| Explain *why* a mission failed | **Decision review**: every crisis choice is replayed under each alternative and explained |
| Teach without assuming knowledge | Concept cards behind every "?" button, plain-language crises, beginner coaching |

## Play in 60 seconds

1. Choose **Solo**, **Crew** or **Sandbox**, a scenario and a difficulty. Accept the mission.
2. Build in the hangar. Watch mass, cost, schedule, maneuver reserve and eclipse margins move. Click "?" for a plain-language explanation.
3. Open launch readiness, accept or fix the warnings, and launch.
4. Fly. When a crisis pauses the mission you see the **direction** each response will push science, battery and data (no exact numbers). You get **one forecast** per mission that shows ranges.
5. Read the score, the decision review and the causes. Redesign and compare.

## Modes, scenarios, difficulty

- **Scenarios:** Lunar Polar Mapper (beginner), Lunar Ice Hunter (low polar orbit plus a solar particle event), Mars Polar Mapper, Mars Dust Season (a dust storm dims the Sun).
- **Difficulty:** Cadet (more budget, 70% objective), Engineer (150 credits, 80%), Flight Director (92% budget, 85% objective, degraded environment, space weather in every scenario).
- **Crew mode (1–4 players on one device):** the Commander owns budget and launch, the Engineer the bus and propulsion, the Science Lead the instrument and orbit, the Power & Comms Officer power, communications and the recorder. Fewer players share roles. Other roles can *suggest* a part to its owner. Launch needs every role's sign-off, and each role judges readiness through its own lens. In a crisis each role advises from its own priority (so roles can honestly disagree), the team votes, and the Commander breaks ties. This is pass-the-controls play on one device, not network multiplayer.

## Mission Score (0–1000)

Mission performance 300, scientific value 200, resource efficiency 200, decision quality 200, and (crew mode) team collaboration 100, normalised to 1000. Decision quality ranks your choice against every alternative by replaying it from the exact paused moment. Formulas are in `dist/engine/review.js`.

## Honest science

NASA/JPL snapshots supply Moon and Mars radius, gravitational parameter, solar irradiance and distance examples. Established equations supply the ideal rocket equation, circular orbit period, **eclipse duration for both bodies from one formula** (central cylindrical shadow, zero beta angle, 46.5 minutes at 100 km above the Moon) and energy integration. Hardware values, credits, science units, contact windows, crisis triggers and development schedules are educational assumptions. The 225 million km Mars reference distance is a **game choice for normalising the radio link, not a measured average**, and is labelled in the game as well as here. Details: `docs/SCIENTIFIC_VALIDATION_V6.md`.

## Run it

```sh
npm run build   # regenerates dist/TRAJECTIQ_Play.html, a single offline file
npm test        # 327 tests, no dependencies
npm start       # serves dist/ on http://localhost:3000
```

Node.js 22+ for build and tests; Python 3 for the optional local server. Open `dist/TRAJECTIQ_Play.html` to play with no server. Pushing to `main` deploys to Vercel, which runs the build and all tests first.

## Quality and security

- 327 automated tests: physics, scoring, decision replay, crew logic, assistant accuracy, UI flows, rendering fallbacks, accessibility CSS rules, offline behaviour and security.
- Security: strict Content-Security-Policy and hardening headers on the hosted pages (no inline or eval scripts, no outside origins); the offline file pins its exact script by SHA-256; mission codes, saved data and player names are treated as untrusted input (size limits, whitelisted fields, clamped values, escaped output, fuzz and XSS tests); no network access, accounts or trackers.
- Offline: the hosted game caches itself after the first visit. Online, the newest release always wins.

## Device and browser testing status

Verified in an emulated 375×812 touch viewport (Chromium): the mission board, hangar, crisis, score and trade screens fit without horizontal scrolling and the controls are usable. The standalone file was also loaded under its own Content-Security-Policy. **Not yet verified on physical iOS or Android devices.** A five-minute checklist is in `docs/MOBILE_TEST_CHECKLIST.md`. Judges opening the link on a phone should expect the 3D scene to fall back to a 2D view if WebGL is unavailable; gameplay stays fully available.

## Team

Team: **Kemon Dilam Bondhura**. Member names, roles and contributions: *to be added before submission.*

## Documentation

- `docs/RELEASE_NOTES_V6.md`: what changed and why, mapped to the review findings.
- `docs/COMPETITIVE_ANALYSIS.md`: the official challenge text and comparable projects.
- `docs/QA_V6.md`: what was tested, how, and what remains unverified.
- `docs/SCIENTIFIC_VALIDATION_V6.md`: formulas, sources, assumptions.
- `docs/MOBILE_TEST_CHECKLIST.md`: five-minute phone test.
- Earlier v3–v5 documents are historical records; v6 supersedes their statements about current behaviour.

## Attribution

NASA/JPL data sources are linked inside the game and in the science document. All visuals are generated in code; there are no external assets or runtime dependencies. This project is not endorsed by NASA. A first version of TRAJECTIQ existed before the event; the scenarios, scoring, crew mode, decision review, sharing and interface described here were built for it.

## Optional AI backup assistant

The verified assistant runs offline from the game's own rules, simulation and NASA/JPL data. When it cannot answer, the assistant switches to the AI backup automatically: the question, a short numeric mission summary and the last few questions are sent to this site's own server function (`api/assist.js`), which calls Google Gemini. The backup may answer any ordinary question, and ties the answer back to the game where that is honest. Its answers look like normal answers with a small "AI backup · not verified by the game" badge, a notice under the input says the backup exists, and the player can switch it off (Tools & preferences), in which case a button asks first. The offline game never depends on it.

- Setup: add `GEMINI_API_KEY` in Vercel (Project, Settings, Environment Variables, Sensitive), then redeploy. Optional `GEMINI_MODEL` (default `gemini-3.5-flash-lite`). The key lives only on the server; the browser never sees it, it is not in the repository, and the CSP is unchanged (`connect-src 'self'`).
- Safeguards: same-origin only, JSON only, 6 KB body cap, 500-character question, whitelisted context, per-client and daily rate limits (best effort per serverless instance), 12 s timeout, capped plain-text output. Also set a spend limit on the key in Google AI Studio.
- Tests: `tests/v8-ai-backup.test.mjs` (server, secret scan) and `tests-ui/store/ai-backup.test.jsx` (client).
