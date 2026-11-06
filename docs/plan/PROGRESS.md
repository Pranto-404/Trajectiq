# TRAJECTIQ progress and resume point

Keep this file current. Update it after every milestone, agent launch and agent result. A new session should read it first (see CLAUDE.md), then continue from "Next steps".

Last updated: 2026-11-06. Event date below is retained from the owner's project notes, not independently verified.

## Twelve-language first release and orbital UI — 2026-11-06

Owner selected 12 languages with deeper gameplay coverage. Implemented on feat-global-mission-ui, ready for main publication after local checks.

- English/Bengali plus ten new lazy-loaded packs, 173 translated keys per new language; saved preferences, native-name selector, Arabic RTL, script-aware system fonts and explicit English fallback.
- Onboarding, navigation, resource/build/crew/report labels and assistant shortcuts covered. Localized shortcuts use the existing contextual engine; detailed answers remain English for new languages, explicitly disclosed. Native-speaker review and full narrative localization remain outstanding.
- Original atmosphere/horizon treatment informed by all six supplied Pinterest references; reduced-motion handling and no additional graphics dependency.
- Final verification: 364 UI/store tests plus existing Node suite, production and standalone builds passed. Edge Arabic mobile chat/reload, narrow German layout, Japanese light theme and LTR restoration verified; no captured browser errors. No physical device or Safari claim.
- Details and remaining scope: [multilingual release](../MULTILINGUAL_RELEASE.md). Online multiplayer remains unimplemented; existing crew is pass-and-play.

Next steps: publish this verified release, verify Vercel status and production language selector. Then continue native-language review and remaining scenario/assistant prose before describing localization as complete.

## Responsive polish, performance and crew verification — 2026-11-06

Follow-up to the owner's cramped-chat screenshot. Work is on feat-responsive-polish, verified locally and being published to main. Previous contextual-copilot release 72c223d is already live.

- Larger chat composer, focus-ring clearance, short-screen sheet sizing, touch input fonts and a repaired 320px mission-charter overflow.
- Softer mint/navy dark theme, original thermal-blanket texture, restrained scene framing and briefing motion. Mobile panel blur removed; offscreen WebGL pauses; unmounted solar-wing references are released.
- Corrected Ice Hunter's squared coverage explanation; clarified equation units, clamp limits and generated/returned science distinction.
- Verified four-person pass-and-play setup, handoffs, sign-offs, proposal acceptance, crisis voting/tie resolution and two completed crew flights. Network multiplayer is not implemented.
- Final validation: 372 Node + 359 UI tests (731), build passed, 290 workload runs completed. Six Edge viewport sizes, phone report/tools checks and 320px/landscape chat review. No physical Apple/Android device or Safari-engine test is claimed.
- Details, measurements, reference links and limitations: [responsive/performance review](../RESPONSIVE_PERFORMANCE_REVIEW.md).

## Contextual copilot and onboarding — 2026-11-06

Latest follow-up supersedes older assistant placement and release notes below. Publishing feat-contextual-copilot to main after verification.

- Bottom-right responsive chat, pinned composer, two contextual shortcuts, optional advanced tools, and latest-answer follow-ups only. Focus returns to the launcher; opening chat pauses flight.
- Verified active run takes precedence over draft, answers update with battery/recorder state, and completed runs use their own report. Fixed difficulty-specific science thresholds and scenario-specific experiment bounds.
- First-visit three-step guide persists dismissal without changing the draft. Aurora and meteor motion respects reduced motion and hidden tabs.
- Fixed a real viewport-change crash: telemetry short-circuited a React hook. Both media-query hooks now run unconditionally; regression covers width/height transitions. Fixed narrow chat overflow.
- Validation: 371 Node + 358 UI tests passed (729 total); hosted/standalone build passed. Edge checks include current Mars crisis advice, 375px chat, desktop resize recovery, first-visit dismissal and reload. npm audit reports zero known dependency vulnerabilities.
- Research: 106 substantive archived project descriptions, 100 current team proposals, and NASA descriptions of ten verified 2024 winners; this is documentation review, not 100 executed games. See [comparison ledger](../COMPARATIVE_RESEARCH_2026.md).
- Assistant is local rules plus simulation, not a generative language model. Physical-device/screen-reader, load testing and independent penetration testing remain outside this verification. See [copilot QA](../COPILOT_QA_2026.md).

## Mission experience review — 2026-11-06

Current work supersedes historical production/next-step statements below. The React app was deployed from main at 6aa035d; this follow-up is on feat-mission-experience and is being published after verification.

- Original animated mission briefing, destination illustrations, four-step journey, stronger light/dark visual hierarchy, and clearer mission actions.
- Engine-backed design advisor prioritizes blockers then the scenario's critical resource; interactive collect/store/return diagram, stage reset control, and earlier launch readiness.
- Fixed blocked access to launch diagnostics, locked scenario selection, fixed-duration flight progress, misleading scenario kicker, and light mobile action contrast. Final launch authorization remains guarded.
- Motion respects both reduced-motion settings and hidden tabs. New strings include Bengali translations.
- Verification: 371 Node + 351 UI tests passed; production/standalone build passed. Edge desktop and 375px responsive review; complete Mars Dust Season run returned 569 science, score 832, grade A. Physical-device and comprehensive screen-reader checks remain outstanding.
- Research, assessment, and remaining limitations: [EXPERIENCE_REVIEW.md](../EXPERIENCE_REVIEW.md).

## Production publication — 2026-11-06

Owner explicitly requested publication to GitHub main and Vercel after reviewing the ux-v7 result. Publishing the tested React app to main; Vercel runs build and tests before activation. Earlier statements that production remains v6 describe the prior state. Physical-device, screen-reader and full offline release checks remain outstanding and are not represented as passed. The committed dist standalone remains a v6 archive; Vercel serves the generated site directory and new standalone.

## Appearance and assistant follow-up — 2026-11-06

- Persistent light/dark themes, header shortcut and Menu appearance selector, Bengali labels, AA-tested light text/status palette, and a readable caption over the dark 3D stage.
- Animated nebula, stars and orbital rings use CSS transform/opacity only; hidden tabs pause them and system/in-app reduced motion stops them. Small buttons preserve the 44px coarse-pointer target.
- Assistant answers retain the existing panel, failures retain typed questions and permit retry, duplicate UI requests are guarded, fuel input reflects the selected tank limit, and applying proposals enforces draft/crew ownership rules and records contributions. Forecast consumption is persisted explicitly.
- Verification: 371 Node tests and 347 UI tests passed; production build passed. Local Edge verified both themes, persistence after reload, design review and fuel experiment, reduced-motion stop/resume, and no captured console errors. Screenshots: ignored local test-results/trajectiq-light.jpg and trajectiq-dark.jpg.
- Assistant remains a local rules/simulation assistant, not generative AI. Production is unchanged; release gates below still apply.

## Current resume point — 2026-11-06 integration pass

All four feature branches, including the 3D stage, are merged into `ux-v7`. The historical next-steps list below predates that integration. Production still serves v6; do not describe the v7 work as deployed to production.

- Added the persistent interactive 3D spacecraft preview to the mission board, destination filters, earlier difficulty controls, and a phone-only fixed Build this mission action. Brighter assembly lighting keeps the craft readable while it rotates. Mobile header wraps into two usable rows.
- Fixed architecture presets losing scenario/difficulty/sandbox/name/livery; added all-body destination switching; protected presets against damaged saves; enforced forecast consumption in the store for both entry points, including concurrent requests; kept crew roll call open through sign-offs; made empty-run redesign safe; restarted guided help correctly.
- Dataset exports now use the canonical quoted CSV with per-row provenance and the correct body filename. NASA imagery credit links now read the stage's source field. Rechecked mean-radius sources for Mercury, Venus, Earth, Mars and Ceres in local Edge against JPL on 2026-11-06; simulation numbers unchanged.
- Build no longer regenerates the incompatible legacy standalone. `npm run e2e` now fails clearly if the browser suite is absent instead of reporting success with zero tests.
- Automated verification: 371 Node tests + 342 UI tests passed after lighting and roll-call-navigation polish. Hosted/standalone build succeeded again after the final CSS adjustment. Final verification is recorded in `docs/QA_V7_INTEGRATION.md`.
- Local Edge: Mars Dust Season board → hangar → launch → dust-storm crisis → one forecast → Keep observing → report completed (669 science, 862 score, grade A). Four-player roll call signed all four roles without switching sheets. Board, hangar and report checked in Edge responsive mode at 375px, each with document scroll width 375px. Real WebGL rendered in board/hangar/flight. No runtime errors observed in the desktop flow; a vendor Three.Clock deprecation warning remains.

Remaining release gates: Linux CI and preview verification, configured browser automation/axe audit, physical-phone full loop and offline test, standalone file:// browser check, production cutover and live headers. The existing release plan requires these before merging to main. No physical-device or comprehensive accessibility result is claimed.

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

## Re-baseline 2026-11-06 (after the third limit reset)

- Another session (git identity Md. Mahin Ahmed Bhuiyan) took the `ux-v7` work forward and **merged the React UI into `main`** (about 7 commits: themes, onboarding, copilot, twelve languages, orbital presentation, docs such as `docs/QA_V7_INTEGRATION.md`, `EXPERIENCE_REVIEW.md`, `MULTILINGUAL_RELEASE.md`). Production (https://trajectiq-omega.vercel.app/) now serves the React build with the strict CSP.
- Verified by this session on `main` (7c700c6): `npm run build` OK; 372 node tests + 364 vitest tests pass.
- So the cutover is DONE; do not redo it. Branch `ux-v7` and the `feat-*`/`nasa-bodies` branches are historical. Do not push anything to `main` without checking `git fetch` first: another session is active on it.
- Remaining from the original plan: independent adversarial review of the live React build and fixes (launched), phone-width and crisis/crew checks in a browser, README roster (owner supplies names), videos transcript (optional).
- Hazard: running `npm ci` in the shared checkout fails while another session's dev server holds files, and leaves `node_modules` half-deleted. Use `npm install --ignore-scripts` to repair, or verify in a separate worktree.

## 2026-11-07: phone hangar cleanup (branch ux-mobile-hangar)
- Cause of the "messy" phone hangar: Margins and Orbit panels were ~950 px each, stacked under the stage (page 3543 px), and the sticky stage used the one-row header token (56 px) while the phone header is two rows (105 px), so it tucked under the header.
- Fix: `MobileInspector` (Margins / Orbit / Advice / Crew tabs, one panel at a time, sliding pill), compact 2-column gauge tiles, 2x2 orbit option cards, compact header and presets row, live header height (`--header-live-h`), stage height variable `--stage-h`. Page is now 1.2-1.6k px, no horizontal overflow at 375 px.
- Motion added: stage HUD corner brackets + scan line, gauge fill light sweep, staggered tile entrance, tab pill spring, alert-dot pop, launch button ring. All honour reduced motion.
- Not yet verified: a physical phone, the crowded tray sheet peek (it still covers the lower ~200 px), Flight/Report/Board screens on phone.

## 2026-11-07 (2): phone fixes from the owner's real-device screenshots
- Seen on the owner's phone: translucent sticky header and tray let scrolling content show through; header + stage + tabs + tray peek + launch bar left ~170 px of usable space.
- Fix: header scrolls away on phones (opaque), sticky offsets use `--header-live-h` (0 when not sticky), tray collapsed state is a 60 px bar (Parts + live mass/cost) with an opaque sheet, floating Assistant is a 48 px round button above the bottom bars.
- Still unverified: physical phone re-check after deploy; the Flight and Report screens on phone.

## 2026-11-07 (3): phone chrome auto-hide
- Owner asked for the top (stage + tabs) and bottom (parts tray + launch bar) to disappear on scroll down and for the bottom bars to be fully minimizable.
- Done: `useScrollHide` hides stage, tabs, tray and launch bar while scrolling down (only when the tray is collapsed), shows them on scroll up / near top / page end; a minimize button on the parts bar hides the bottom bars until the "Parts and launch" pill is tapped. Assistant button drops when bars are gone.
- Note: the owner's phone was still showing the earlier build (cfea5c9) when they sent the screenshot; production for 19936fe was READY. Ask for a hard refresh / reopen.

## 2026-11-07 (4): assistant v2 (branch assistant-v2)
- Owner: "Heyy" returned "I can't answer that reliably"; wants a powerful assistant. Still offline, deterministic, no generative AI.
- New `dist/engine/smart.js` + wrapper in `dist/engine/assistant.js`: small talk and greetings (typo-tolerant), live-mission facts (battery, fuel, recorder, science, contact, time, launch readiness), orbit/eclipse and rocket-equation calculators, NASA facts and comparisons for all 8 bodies with source links and assumption labels, glossary, stuck/improve routing, fuzzy topic matching, and refusals that still offer next steps. Hard refusals (prices, trajectory/thermal/radiation, off-topic, guarantees) are untouched and tested.
- Tests: tests/v8-assistant.test.mjs (13 tests). 385 node + 364 UI tests pass. Not verified: Bengali wording by a native speaker; long answers on a real phone.

## 2026-11-07 (5): AI backup assistant (branch ai-backup)
- Owner pasted a Gemini key in chat and asked to set it up securely. The key was NOT written to any file, commit, log or Vercel by me; the owner adds it as `GEMINI_API_KEY` in Vercel. Recommend rotating it, since it appeared in chat.
- Built: `server/assist-core.js` + `api/assist.js` (same-origin, rate-limited, sanitised, key in header), `src/store/aiBackup.js`, `askAI` store action, button on refusals in AnswerCard. Default model `gemini-3.5-flash-lite` (Google docs, 2026-11-07). Header auth `x-goog-api-key` is Google's documented form but was not exercised against the live API (no key available to me).
- Not verified: a real call to Gemini end to end; rate limiting across serverless instances.

## 2026-11-07 (6): automatic AI backup (branch ai-auto)
- Owner wanted the backup to feel like the same assistant: auto-switch on refusal, clean chat UI, can answer anything but link back to the game.
- Done: `runAI` in the store fires automatically on a refusal (pref `aiBackup`, default on, toggle in Tools & preferences, notice under the input); thinking bubble then the AI answer as a normal card with a small badge; refusal card + retry only if the backup fails. Server prompt rewritten (any topic, tie back to the game, decline harm), plus the last 3 questions as context.
- Tradeoff owner accepted by asking: questions are now sent without a per-question button (disclosed in the panel, switchable off).

## 2026-11-07 (7): clean assistant chat and new fonts (branch ui-fonts-chat)
- Assistant sheet redesigned as a clean chat: greeting + starter cards when empty, one-line context, bubble for the question, plain answer text with the evidence as a small caption, pill composer, Tools & preferences as a small link below it.
- Fonts replaced (owner: "professional and dotted space-related, not AI-generated looking"): IBM Plex Sans (text), IBM Plex Mono (data), Doto dot-matrix face (kickers, h1 titles, brand, gauge readouts; English only, other languages keep the text face). Vendored OFL woff2 in src/assets/fonts, no CDN. Fonts are not inlined into the CSS. Budgets raised and documented in tests/v7-build.test.mjs (CSS 27 KB gz, fonts 100 KB).
- Not verified: Doto glyph coverage for rarely used symbols (they fall back to the mono face), all 12 languages with the new text face, a physical phone.
