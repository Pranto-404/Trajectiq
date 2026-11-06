# TRAJECTIQ progress and resume point

Keep this file current. Update it after every milestone, agent launch and agent result. A new session should read it first (see CLAUDE.md), then continue from "Next steps".

Last updated: 2026-11-05. Event: NASA Space Apps, 2026-11-14.

## Product state

- `main` = **v6.0.0**, live at https://trajectiq-omega.vercel.app/, 327 tests passing. Vanilla ES-module UI in `dist/ui`, tested pure engine in `dist/engine`, data in `dist/data`. v6 notes: `docs/RELEASE_NOTES_V6.md`, QA: `docs/QA_V6.md`.
- Owner feedback after v6: phone test passed; but the UI feels basic (flat buttons, plain website, no React/Next, not interactive enough). They want: better, easier, more motion; recheck every function; more planetary missions; effective NASA data (reverse-engineer how real NASA missions are designed); plan with a NASA-data agent; build, have another agent review, find flaws, rebuild.
- Owner decisions: do NOT put team names/contributions in the web app (README only, added later by the owner). Team roster still pending from the owner (README says "to be added"). Video transcript pending (optional).

## Active work: branch `ux-v7`

Stack decision (approved, evidence in `docs/plan/UX_REDESIGN_PLAN.md`): **Vite 8 + React 19, plain JSX**, zustand, Motion, three + react-three-fiber (lazy), CSS Modules + tokens, Vitest + Testing Library, Playwright (CI only). **Not Next.js** (its static export ships inline scripts that break our `script-src 'self'` CSP). Engine/data files stay where they are and are imported by alias; legacy UI stays until cutover; Vercel `outputDirectory` becomes `site`.

Agents launched (they run in the background and may be lost if a session ends; if their output is missing, relaunch from the descriptions here):

| Agent | Task | Output | Status when written |
|---|---|---|---|
| UX/stack planner | audit, design system, stack decision, work packages | `docs/plan/UX_REDESIGN_PLAN.md` | DONE, committed on `ux-v7` |
| NASA data lead | sourced data for more destinations, 17 real missions, NASA textures/3D models, 12 scenarios | `docs/plan/NASA_DATA_PLAN.md`, `bodies.json` (14 bodies), `real_missions.json` (17), `ASSETS.md`, `SCENARIOS.md` | DONE, committed. Unverified items are flagged inside the files. Key: engine period formula reproduces Dawn/GRAIL/Landsat 9/MRO periods; real arrays ~13-17% of irradiance x area vs game 28%; GOLD Rules margins; DONKI gives ~8.3 SEP episodes/yr; SSD/Horizons terms forbid embedding live APIs (use build-time snapshots only). |
| Engine/NASA-bodies engineer | 8 bodies (Moon, Mars, Earth LEO, Mercury, Venus, Ceres, Vesta, Europa), 6 new real-mission scenarios, REAL_MISSIONS, provenance, `dist/engine/api.js` | `docs/ENGINE_BODIES.md` | DONE, merged into `ux-v7` (2697573), verified: 371 node + 127 vitest pass. Skipped Phobos/Bennu/Ganymede/Titan (reasons in SKIPPED_BODIES). Legacy UI/sw/standalone don't know the new bodies (expected; replaced at cutover). |
| Foundation engineer | WP0 build, WP1 store/shell/i18n, WP2 design system + motion, WP3 sound/haptics on `ux-v7`; writes `docs/plan/FOUNDATION_NOTES.md` | commits on `ux-v7` (build, store, shell, DS, kit gallery, fx, tests, FOUNDATION_NOTES.md) | DONE, see report; 337 node + ~130 vitest tests green |

## Next steps (in order)

1. (Engine agent launched; review its branch `nasa-bodies` when it reports, run all tests, then merge into `ux-v7`.) Original intent: an **engine agent** (separate branch `nasa-bodies` from `ux-v7`, touching only `dist/engine`, `dist/data`, and `tests/`) to generalise `missionFor` and the catalog for new destinations with sourced values, offline snapshot data only (CSP forbids runtime fetches), keeping all existing tests green and adding new ones. Attribution text for NASA assets must be shown in the app.
2. When the foundation agent reports (`docs/plan/FOUNDATION_NOTES.md`): launch feature agents in parallel, each in its own git worktree branched from `ux-v7`, with exclusive file ownership per the plan's work packages: (A) board + hangar (WP4, WP5); (B) 3D stage (WP6; use NASA textures/models from ASSETS.md where licence-clean, keep bundled images under about 6 MB); (C) flight + crew (WP7, WP8); (D) report + sheets (WP9, WP10). Merge branches into `ux-v7` and resolve conflicts.
3. Port every behaviour in the plan's parity matrix: crew mode, crisis voting, decision review, score, share codes, assistant, concept cards, save/checkpoint, leaderboard, compare, report/print. Replace fake-DOM UI tests with component tests; keep all engine tests untouched.
4. **Gate G1 (end of 2026-11-08): a playable vertical slice (board → hangar → launch → flight → report) on the new stack.** If it fails, Plan B: ship the legacy app with CSS/motion/sound upgrades (plan section 6.3).
5. Launch an **independent reviewer agent** (fresh context, adversarial): functional audit of every feature, accessibility (axe), mobile 375px, security (CSP, hostile data), performance, NASA-data accuracy and attribution, and a flaw list. Fix the flaws, rebuild, repeat once more.
6. Cutover (plan section 7): merge `ux-v7` to `main` only when all tests, CSP/header checks, standalone hash check, and a live-site smoke test pass; update README/docs/QA; verify live headers and a mobile check; keep `docs/QA_V6.md`-style honesty about what was not tested.
7. Ask the owner for: team roster, phone device/browser used in their test, video transcript if useful.

## Working rules (also in CLAUDE.md)

Never fabricate NASA numbers: every value needs a source URL and verification date, else mark unverified. Never claim a test or device check that was not run. Do not edit `dist/engine` and `dist/data` from UI work. Commit and push to GitHub regularly; `main` only after full verification. Avoid backslashes in Python patch scripts sent through the shell (they get mangled); use the Edit tool for such strings.

## Interruption log

- 2026-11-05: a 5-hour usage limit stopped the foundation and engine agents mid-work. Foundation left uncommitted files on `ux-v7` (src/ds, src/i18n, src/store, tests-ui). Engine worktree `D:
asa\Trajectiq\.claude\worktreesgent-aacb668532c1702d9` (branch `nasa-bodies`) had no commits. Both agents were resumed by message and told to commit small milestones. If they are lost again, relaunch from the task descriptions above, using the existing files as the starting point.

- 2026-11-05: foundation merged on `ux-v7`. Feature agents launched in worktrees: feat-board-hangar, feat-stage, feat-flight-crew, feat-report-sheets (see their branches on origin). Merge each into `ux-v7` after verifying build + tests.

- 2026-11-05: engine merged into `ux-v7`; feature agents told to merge `ux-v7` for the new API. Feature branches on origin: `feat-board-hangar`, `feat-stage`, `feat-flight-crew`, `feat-report-sheets`. When all four report: merge each into `ux-v7`, verify (`npm run build`, `npm test`), wire together, smoke-test the loop in the browser, then launch the independent reviewer agent.

- 2026-11-06: a second usage limit interrupted the four feature agents. Saved state: `feat-board-hangar` (board committed, hangar uncommitted), `feat-stage` (NASA textures + ux-v7 merge committed), `feat-flight-crew` (WIP committed, more files uncommitted), `feat-report-sheets` (all uncommitted). All were resumed by message with orders to commit and push small milestones. NOTE: `npm run build` on `ux-v7` regenerates the legacy `dist/TRAJECTIQ_Play.html` from the old script list, which cannot load the new engine; restore it with `git checkout -- dist/TRAJECTIQ_Play.html` and do not commit it (fix the build so it does not overwrite it, or switch it at cutover).

- 2026-11-06: `feat-flight-crew` DONE and merged into `ux-v7` (7c3d6c3); verified 371 node + 164 vitest. Remaining agents: board-hangar, stage, report-sheets (running). Integration TODO from `docs/plan/FEATURE_REQUESTS.md`: store should consume the forecast; `crew-signoff` re-opens `launch-check`; hangar should embed `<RollCall/>` and `<CrewStrip/>`; `Stage3D` export name; gauge compact size; make `npm test`/`npm run build` stop rewriting the legacy `dist/TRAJECTIQ_Play.html`.

- 2026-11-06: `feat-board-hangar` DONE and merged into `ux-v7` (a85134b); verified 371 node + 206 vitest. Remaining agents: `feat-stage` (3D), `feat-report-sheets` (running). Then: integration hook-ups from FEATURE_REQUESTS.md (store setDestination limited to Moon/Mars; preset drops scenario/difficulty; shell header overflows at 375px; onboarding reset; Stage3D export name; forecast into store; crew-signoff reopens launch-check; embed RollCall/CrewStrip), browser smoke test of the whole loop at desktop and 375px (preview server: `npm run dev`), then the independent reviewer agent.

- 2026-11-06: `feat-report-sheets` DONE and merged into `ux-v7` (7ac1e93); verified 371 node + 289 vitest. Browser smoke test of the loop on the dev server (`npm run dev`, launch config `trajectiq-react`, http://localhost:5173) at 1280x800: board -> hangar (spotlight tour, ghost preview, schematic stage placeholder) -> hold-to-confirm launch -> flight (resource flow, timeline, gauges) -> report (score reveal) all work, no console errors. NOT yet checked: 375px, crisis takeover in browser, crew mode in browser, assistant sheets, 3D stage. Only `feat-stage` (3D) is still running. After it merges: integration hook-ups from `docs/plan/FEATURE_REQUESTS.md`, 375px pass (shell header overflows at 375px), then launch the independent reviewer agent, fix findings, then cutover per UX plan section 7 (including: build must stop overwriting legacy `dist/TRAJECTIQ_Play.html`, standalone hash CSP, live headers check).
