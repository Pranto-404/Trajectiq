# v5.0.0 release candidate · 15 October 2026

## Changes

- Moon plus an optional Mars orbital mapping scenario, with separately sourced body constants/solar flux and clearly stated teaching assumptions.
- Active-flight hardware/relaunch protection; explicit discard confirmation for destructive navigation.
- Version-validated autosave and paused resume, including pending crises. Damaged raw saves/checkpoints remain available until explicit discard.
- Targeted power/communications upgrade with a before/after preview.
- Strict offline assistant routing, English/Bangla/Banglish support, percentage parsing, state-aware explanations and engine-backed what-ifs. Unsupported questions receive honest limits.
- Corrected partial-contact energy, safe-mode threshold integration, zero-energy finality and recovery authorization.
- Honest reduced-return capture labeling, raw science/percentage results and destination/version-aware observational comparisons.
- Event-loop batched uncertainty sampling with progress, cancellation and deterministic parity.
- Responsive grid/touch/modal fixes, reduced-motion improvements, WebGL resource cleanup and resilient SVG fallback.
- Version-pinned offline cache and Vercel build/header configuration.

## Compatibility changes and limits

v4 completed history remains in local storage but is segregated from current-model charts. In-progress checkpoints must match model5.0.0/schema1; no unverified migration is attempted. JSON reports cannot restore progress. Entire-interface Bangla translation, URL/browser-history screen routing, online multiplayer and general-purpose AI remain outside this release.

Mars is an educational arrival/orbit scenario. No cruise, launch-window, landing, thermal/radiation, n-body or full RF solver was added. Neither the robustness score nor mission success predicts actual spacecraft reliability.

Core regression checks pass; real-device/browser visual and accessibility testing and v5 production smoke testing remain pending. The source is delivered as a release candidate, not certified “flawless on every device.” Vercel is live at https://trajectiq-omega.vercel.app/ with managed-browser Moon/Mars/assistant smoke checks. GitHub repository creation under Pranto-404 remains pending browser sign-in.


## UI maintenance patch · 17 October 2026

- Fixed the input-event hardware guard replacing the operations selector before its change event during an active flight. Hardware edits remain locked, while operating schedules can be changed and persisted.
- Added the existing Coast operating mode to the telemetry selector so it accurately represents a coast command issued in the game view.
- Clear an old robustness result on committed fuel/altitude changes even when no input event was emitted.
- Renewed the offline cache identifier to `trajectiq-5.0.0-ui1`. Physics model and checkpoint schema remain 5.0.0; existing valid flights remain compatible. Close all game tabs and reopen to activate the update.
- Added two regression tests; both failed on the previous UI and pass after the fixes. Full suite: 281 passed, zero failures/skips. Build regenerates the complete offline HTML.
- Vercel build command now builds and runs the test suite; failed tests block that deployment from becoming ready.
