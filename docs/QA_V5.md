# TRAJECTIQ v5 QA and compatibility report

Release candidate checked: **15 October2026**. NASA/Mars source verification:10 October2026. Automated environment: Linux, Node.jsv24.19.0, AMD EPYC9V74 host CPU. This is not a mobile hardware benchmark.

## Executed evidence

| Check | Actual result | Scope |
|---|---|---|
| Uploaded untouched v4 baseline | 56/56 passed | Extracted source matched committed v4 source byte-for-byte; `.git` excluded from content comparison |
| Final `npm run build` | Passed; standalone286,272bytes | Full inline HTML generated from current modules, no runtime imports/external assets |
| Final `npm test` | **279 tests;279 passed;0 failed;0 skipped** | About4.05s on this host; raw output in `TEST_RESULTS_V5.txt` |
| Assistant new cases | 182 additional cases included in total | Intent/adversarial/unsupported questions, percentages/Bangla digits, forecasts, current state, followups |
| Flight integrity | 10 dedicated v5 UI adapter tests included | Relaunch/edit/discard guards, checkpoint restore, raw corruption preservation, targeted patch, focus, batch cancel, malformed/XSS history |
| Physics | Existing and v5 analytic/invariant cases included | Moon/Mars equations, unit conversions, energy/data conservation, exact thresholds, duplicate decisions, serialized continuity |
| Rendering | 21 focused renderer/static-layout cases included | Mock GPU/input lifecycle and static CSS; no real graphical browser layout claim |
| Service worker | 3 dedicated mock-cache tests included | Pin one version, avoid forced activation, old-cache cleanup, offline503, request boundaries |
| Standalone | Parser/assets/function presence test included | Confirms generated code parses and embeds assets; real local-file launch still needs browser QA |
| Baseline200-sample robustness timing | 1,679.57ms synchronous | Confirms a blocking work unit on host; not Android latency |
| v5 sampling | One run per scheduled event-loop task | Test proves yielding, cancellation, duplicate prevention and equality with seeded reference result |
| Public v4 browser observation | Earlier managed Chrome visit displayed mission offer and SVG fallback | Baseline observation only, not v5 end-to-end verification |
| GitHub publication | Pending creation under selected Pranto-404 account | Plugin has no repository-create action; browser sign-in required |
| Vercel publication | **READY** at https://trajectiq-omega.vercel.app/ | New project in selected connected account; default account API path succeeded |

The source remains dependency-free. No npm dependency vulnerability upgrade was needed. Automated coverage is substantial but not exhaustive: passing Node adapters cannot prove browser focus semantics, Safari layout, GPU behavior, accessibility compliance or performance on low-end hardware.

## Width matrix

**Static CSS cascade checks passed** at320,360,375,390,414,430,640,768,820,1024,1280,1440 and1920px. Checks cover min-content grid roots and selected constraints. They do not compute browser layout, screenshot every screen, detect every overlap or emulate a device. All thirteen rendered-viewport checks remain pending.

## Device and browser matrix

| Platform | Real device tested | Browser emulation tested for v5 | Current evidence |
|---|---|---|---|
| Windows Chrome | No | No | Source reviewed; model/UI adapters only |
| Windows Edge | No | No | Source reviewed; model/UI adapters only |
| Firefox | No | No | Source reviewed; model/UI adapters only |
| macOS Safari | No | No | Source reviewed; viewport/touch CSS improvements |
| macOS Chrome | No | No | Source reviewed; no OS/browser-specific run |
| iPhone Safari | No | No | Source reviewed; touch/pinch and modal fixes mocked |
| Android Chrome | No | No | Source reviewed; touch/pinch and renderer fallback mocked |
| iPad Safari | No | No | Source reviewed; responsive grids/modal constraints |
| Android tablet | No | No | Source reviewed; responsive grids/modal constraints |

Browser version/viewport cannot be supplied for tests that were not run. An attempt to install a Chromium testing runtime was rejected by automatic approval review because the prescribed workflow requires the managed browser. It was not bypassed. The updated build was subsequently deployed through the connected account. Managed Chrome smoke checks described below were executed on v5; this does not supply the missing multi-device/viewport coverage.

## Accessibility evidence and limits

Implemented:44px critical targets, native vertical/pinch scrolling, keyboard camera controls, focused-canvas wheel zoom, focus restoration selector, inert modal background, labelled scrollable tables, readable wrapping, reduced-motion preference and optional SVG gameplay. Mock tests exercise these contracts.

Pending: actual screen readers, full tab order across all pages, focus trap under real DOM, measured contrast ratios,200% zoom, landscape orientation, OS text scaling, mobile virtual keyboard and reduced-motion behavior on actual devices. WCAG2.2AA compliance is a target, not a certified outcome.

## Remaining issues / release gates

1. **P0 verification gate:** audit's narrow-screen overflow root cause was repaired, but all-screen rendered layout verification is still required. Do not mark “all responsive defects closed” from static tests alone.
2. **P1 verification gate:** Moon core browser journey and crisis reload passed. Standalone local-file launch, browser offline/update lifecycle, full network audit and cross-platform flows remain pending. Node regression counterparts pass.
3. **GitHub publication pending:** new repository under Pranto-404 requires browser sign-in. Vercel new-project production deployment is READY and publicly accessible; Git integration and a separate preview-promotion workflow are not yet configured.
4. **P2 incomplete localization:** main journey controls and assistant are bilingual; technical prose and some error/help text remain English.
5. **P2 navigation limitation:** app uses in-memory screen navigation, not history-aware URLs. Browser Back/Forward do not switch game screens; refresh resumes a valid flight paused.
6. **P2 portability limitation:** report JSON is read-only; no import/cloud sync. Browser quota/private-mode/site-data deletion can prevent or remove saves. Current model/schema checkpoints only.
7. **Model boundary:** alternate capture is a disclosed penalty approximation, and Mars is arrival/orbit only. No real mission performance/reliability prediction.
8. **Performance boundary:** batch scheduling avoids the known200-run synchronous UI block; individual sample speed, assistant review latency, initial render, long-session memory and mobile FPS still need device measurements.
9. **Comparison boundary:** historical player runs may use different decisions; chart explicitly labels them observational. Use copilot common-policy forecasts for controlled design comparison.
10. **Competition gate:** confirm final challenge, development window, attribution, contributor statements and license with the applicable event. Preparation work is not automatically eligible.

No failing automated test or known reproducible uncorrected core mission-integrity defect remains in the exercised cases. This does not substitute for the open browser/visual/deployment gates. Release status: **deployed candidate with Moon/Mars/assistant smoke evidence; expanded device QA and GitHub publication pending**.

## Deployed v5 browser smoke evidence

On15 October2026, the managed Chrome browser opened https://trajectiq-omega.vercel.app/ without a login wall. Document viewport1348×936; document scrollWidth1348 on the inspected hangar. Browser build/version was not reported; do not infer Windows/macOS/Android identity from this cloud browser.

Executed: accept Moon mission; launch readiness; authorize launch; next event to degraded contact at176.6minutes; refresh; verify paused checkpoint and unchanged crisis; review paused flight; select Wait for next contact; advance to finish. Actual result751/650science,115.6%,347MB returned,13MB onboard,0MB discarded. WebGL was unavailable and the SVG fallback completed the entire flow.

Executed after redesign: select Mars; verify400km starter,174kg,124credits and lower solar margin; ask battery125%; preview showed174→171.8kg,124→122credits,668.7science unchanged and90.1→88.1% battery. Proposal was not applied. Lunar-night-temperature query returned an explicit unsupported thermal-model answer. Closing the modal restored focus to the assistant opener. Screenshot `trajectiq-v5-mars-live.jpg` records the visible deployed build.

The inspected console tail contained browser-extension metadata errors (`chrome-extension://`), not application-source errors. This is a limited captured-tail observation, not a claim of a completely error-free browser session or production observability scan. No synthetic mobile resizing, offline-network toggle or physical GPU test was performed.
