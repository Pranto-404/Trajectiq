# Copilot QA and security scope — 2026-11-06

The assistant reads a fresh context for each question. An active/completed run supplies its own design; draft edits do not silently replace flight context. Older answers intentionally remain snapshots. Opening chat pauses the game, so values do not change while reading. This is an offline rules/simulation assistant, not generative AI or unlimited natural-language understanding.

## Evidence

- Automated battery/recorder tests change current telemetry and verify corresponding conservation/data-return advice without mutating the run.
- Draft/run divergence, completed-run context, natural next-step phrases, difficulty-specific science targets, scenario-specific experiment bounds, guarded proposals, failed-question retention, focus return and first-visit persistence are covered.
- Edge manual check: Mars Dust Season at T+22, battery 100%, recorder 77.3%, science 0/448; “What should I do now?” identifies the pending crisis and directs the player to compare responses.
- A 375px viewport exposed a telemetry hook-order crash. Fixed both media-query hooks to execute unconditionally; regression exercises width and height crossings. Edge subsequently returned to desktop with telemetry intact and no captured errors after reload.
- Phone chat is 359px in a 375px viewport; composer remains available. Grid/input constraints prevent answer/form overflow.
- First-visit guide dismissed and remained dismissed after reload. Existing saves skip the new-user introduction.
- 371 Node and 358 UI tests passed. Hosted/standalone production build passed. Existing bundle-size advisory remains; physical low-end device performance is not benchmarked.

## Security review

- npm audit: zero known vulnerabilities at review time. This is dependency advisory coverage, not proof of security.
- Reviewed same-origin CSP/build configuration and external-link HTTPS/noopener handling. No added external services, credentials, analytics or network AI calls.
- Existing hostile import/save/share and assistant-boundary tests remain passing. React renders question/answer text; no new raw HTML execution path was introduced.
- Local browser storage persists mission/preferences. This is not a secure server account or network multiplayer authorization system. Do not store secrets in mission names or chat questions.
- No independent penetration test, server concurrency benchmark, full assistive-technology review or physical-device test was performed. Production deployment checks are reported separately from local QA.

## NASA data boundary

The assistant uses the same existing catalog, cited physical constants and educational engine as the game. Recommendations are based on simulated mission state, not live spacecraft telemetry. Scenario budgets, component capabilities and game time are simplified teaching assumptions. This update fixes the link from those calculations to contextual advice; it does not introduce an uncited live data feed.
