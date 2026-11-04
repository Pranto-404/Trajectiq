# QA record · v6.0.0 (2026-11-05)

## Automated

`npm test`: **327 tests, all passing** (Node 24, no dependencies), run on the merged `main` before and after deployment.

| Area | Tests |
|---|---|
| Physics, engine, checkpoints, v3–v5 regressions | 281 inherited tests, updated where v6 deliberately changed behaviour |
| v6 engine: eclipse formula, readiness checks, gated crises, weather, scoring, decision replay, crew logic, share codes | `tests/v6-engine.test.mjs` |
| v6 interface: header, board, crew flow end to end, previews, score, sharing, concept cards | `tests/v6-ui.test.mjs` |
| Security: headers, CSP hash, banned APIs, link safety, hostile persisted data, share-code fuzzing | `tests/v6-security.test.mjs` |
| Rendering: WebGL fallbacks, ambient motion cap, reduced motion, resource release | `tests/scene3d.test.mjs`, `tests/v5-rendering-accessibility.test.mjs` |
| Offline: network-first with cached fallback | `tests/v5-offline.test.mjs` |

Behaviour that v6 changed on purpose and whose tests were rewritten: link crisis only when material; direction-only crisis previews instead of exact tables; Moon eclipse from the formula; service worker network-first; ambient 3D motion capped at about 30 fps.

## Manual, in a real browser (Chromium, built-in preview)

| Check | Result |
|---|---|
| Hosted site `https://trajectiq-omega.vercel.app/` after deploy: board → hangar → launch → completed mission | Works; no console errors; no CSP violations; service worker registers |
| Response headers on the live site | CSP, X-Frame-Options, COOP, CORP, HSTS, Permissions-Policy, nosniff present; the standalone page carries its own hash-pinned policy instead |
| Standalone file under its own CSP | Loads and runs |
| Desktop 1280×800: board, hangar, crew strip, suggestions, Go/No-Go roll call, crisis with direction chips, score and trade screens, 3D hangar and orbit | Rendered as designed |
| Emulated phone 375×812, local and live: board, hangar controls, destination field, header, menu popover, modal | No horizontal scroll; destination field stacked; menu opens in view, closes after a choice |
| Rapid page switching | No unhandled errors |

Defects found and fixed during this pass: a count-up animation overwrote buttons that shared a data attribute; the 3D canvas grew without bound when its intrinsic size fed back into the flex layout; skipped view transitions raised unhandled rejections; a returning visitor could be served a stale cached release.

## Not verified

- **Physical iPhone, iPad and Android devices.** Only an emulated touch viewport was used. Run `docs/MOBILE_TEST_CHECKLIST.md`.
- Safari and Firefox rendering of the popover menu, anchor positioning and WebGL; Safari WebGL context limits.
- Screen-reader behaviour (labels, focus order and aria attributes are in place and tested statically, but not heard).
- Performance on low-end phones (ambient motion is capped at about 30 fps and stops under reduced motion).
- The challenge video was not readable in this environment; the written challenge text was used.
- The published 2026 judging rubric was not confirmed.

## Results to fill in after the phone test

| Device | OS / browser | Steps 1–10 passed | Notes |
|---|---|---|---|
| | | | |
