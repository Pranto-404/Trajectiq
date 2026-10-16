# TRAJECTIQ v5 developer guide

## Modules and contracts

- `data/nasa.js`: frozen offline numeric snapshots, units, provenance, destination distance selectors. `nasaDataset(design)` chooses the correct table. Rows tagged `assumption` must never be presented as sourced observations.
- `data/catalog.js`: fictional components, presets, version, uncertainty ranges. `missionFor(design)` supplies destination constraints; `presetFor(destination,key)` supplies starter hardware/scales. Keep destination handling centralized.
- `engine/model.js`: `normalize` validates drafts; `components` applies size/solar scaling; `calculate` returns component totals, derived period/delta-V and constraint statuses. `newRun` constructs a launched state. `advance` splits time at physical/model boundaries and stops at crises. `resolve` validates/executes one enabled decision. `runToEnd` supplies reproducible automated policies; `robustness` is a synchronous reference implementation. `debrief` derives explanations; `pareto` compares completed results.
- `engine/copilot.js`: bounded experiment parser and simulation-backed alternatives. Proposals are previews with a source design; applying rejects stale/in-flight edits.
- `engine/assistant.js`: strict supported intents, bilingual grounded explanations, source links and unknown fallback. It is not a general-purpose LLM.
- `ui/app.js`: navigation, rendering, guarded actions, run state, checkpoints, report export, modal focus, batch sampling. `draftGuard` protects flight hardware; `discardThen` manages destructive navigation; `validCheckpoint` protects restoration. `startRobustness` schedules one sample per task and preserves reference RNG order.
- `ui/space3d.js`: schematic WebGL renderer, keyboard/pointer camera, lifecycle cleanup and unavailable callback. `ui/scene.js`: SVG alternative. Neither controls physics.
- `styles.css`: responsive layout, reduced motion, touch sizing and local table scroll. The source cascade tests are not screenshots or browser layout tests.
- `sw.js`: a complete versioned shell cache. Bump its cache identifier with every code release. Do not force an update onto an open game.

## Important invariants

Preserve generated data = returned + onboard + lost, and the analogous quality-weighted science identity. Battery remains within capacity; propellant never increases. Completed/crisis-paused missions cannot advance. Applying the same decision twice must not change the result. Playback speed must only alter scheduling, never equations.

A draft is normalized before launch. After launch, its hardware cannot change. Checkpoints serialize every run field and restore paused under the same model version. A version mismatch must preserve the original until the user chooses to discard it. Reports are read-only exports; adding import requires strict schema, phase, conservation and resource validation.

## Changing the engine

Add analytic/invariant tests for the changed physical behavior, update version/provenance and regenerate the standalone build. Prefer an explicit honest simplification over a trajectory claim the model cannot calculate. Update affected preset benchmark values and explanatory help. Keep historical results segregated by version and destination.

The standalone builder concatenates modules after removing imports/exports. Top-level declarations must remain unique across modules. `npm run build` followed by `npm test` validates syntax and unresolved assets. Never edit the generated standalone HTML directly.

## Reproduce checks

```sh
npm run build
npm test
node --test tests/v5-physics.test.mjs
node --test tests/v5-flight-guards.test.mjs
node --test tests/v5-assistant-accuracy.test.mjs
```

The DOM adapter tests execute application handlers with mocked browser surfaces. The GPU adapter checks lifecycle/control calls without a physical graphics driver. They supplement, rather than replace, real-browser end-to-end testing.

## State, security and compatibility

The local key remains `trajectiq-v1` for continuity; checkpoint schema is separately versioned. Twenty valid completed runs are retained. Corrupt raw text/checkpoints can be exported before discard. There is no cloud persistence, telemetry or multiplayer. Keep user strings escaped and avoid direct HTML interpolation of newly added saved fields. Current modern-browser requirements include ES modules, pointer events and optional WebGL; WebGL failure must preserve full SVG gameplay.
