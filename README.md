# TRAJECTIQ · v5.0.0

**Design → validate → launch → operate → understand → redesign.**

Team: **Kemon Dilam Bondhura**. An educational Space Mission Design Game with Moon and Mars scenarios, seven spacecraft subsystem categories, deterministic simulation, crises, causal debriefs and an offline mission assistant.

This is a tested **release candidate**, not a flight-design tool or a certified cross-device release. Automated verification is complete; physical-device verification remains pending. The deployed Moon journey, crisis refresh, Mars setup and assistant smoke checks passed. See `docs/QA_V5.md`.

**Live game:** https://trajectiq-omega.vercel.app/

**Source:** https://github.com/Pranto-404/Trajectiq

## Play immediately

Open **`dist/TRAJECTIQ_Play.html`** in a desktop browser, or double-click `START_GAME.bat` on Windows. The HTML embeds the complete game; no installation, internet, account, paid AI service or API key is required. A phone's file preview may not execute HTML: use a hosted HTTPS version for mobile play.

For modular development, use Node.js 22+ for build/tests and Python 3 for the optional local server:

```sh
npm run build
npm test
npm start
```

Open `http://localhost:3000`. Windows users without `python3` can run `py -m http.server 3000 --directory dist`. There are no npm dependencies. `npm run build` regenerates the standalone file from the same modules.

## First mission

1. Choose **Accept mission · enter hangar**. Start with Moon and the Balanced design.
2. Choose a subsystem, then a component. Watch cost, mass, power, battery and data margins change. Customize name, color, fuel, orbit, array/battery size and instrument duty.
3. Open **Launch readiness**, read blockers/warnings, then authorize launch.
4. Use **Next event** or the step button. Recovery decisions pause the mission. Choose a response, then resume. Operations commands become available after capture.
5. Return at least **520 science units** of the 650-unit target while ending with battery above zero. The budget is 150 fictional credits. Observations left onboard do not count as returned science.
6. Read the debrief. **Apply power + comms fix** previews a targeted upgrade; it preserves unrelated choices and can be cancelled. Relaunch and compare.

Mars is available through **Choose destination** in the hangar/lab. Switching loads a Mars starter design; it changes radius, gravity, sunlight, altitude limits, eclipse estimate and distance examples. It is a simplified pre-arranged arrival/orbital mapping scenario, not a full Earth–Mars cruise or landing simulation.

## Save, resume and offline

An active flight is automatically checkpointed in this browser, including pending crises. Reload restores it paused. Hardware is locked during a flight; changing presets/resetting requires explicit discard. Damaged/incompatible checkpoints are retained for export until explicitly discarded.

Browser storage is local to the origin, device and browser. Clearing site data loses it; private browsing or quota restrictions can prevent saving. The JSON mission report is **read-only**, not an import/restore file. There is no cloud sync or online multiplayer.

The standalone file contains all runtime assets. The hosted app becomes offline-ready after its first successful service-worker cache installation; it cannot load for the first time without a network. Close every game tab and reopen to activate a new cached release. v5 pins cached modules to one version and avoids forcing an update over an active game. External NASA links require a connection.

## Assistant

The assistant is a **deterministic offline project copilot**, not a live general-purpose generative AI. It uses actual design/flight state and the game engine. English, Bangla and common Banglish prompts are supported; the whole interface is only partly translated.

Try `Review my design`, `What if fuel = 45 kg?`, `What if battery size = 125%?`, `What if solar array size = 1.25x?`, `Compare presets`, or ask which crisis response to choose. Experiments show original/proposed values and require an explicit apply action. Unknown, ambiguous and unsupported questions receive a limitation/clarification instead of an invented specification.

## Scientific scope

NASA/JPL snapshots supply Moon/Mars radius, gravitational parameter, solar irradiance and distance examples. Established equations supply ideal rocket performance, circular period, energy integration and unit conversions. Hardware values, mission credits, science units, recovery triggers, contact scheduling and uncertainty ranges are **educational assumptions**.

Mars's 225-million-km reference distance is a game normalization, not a measured average. Communication classes represent separately engineered fictional destination systems. Displayed light-time does not delay commands. The reduced-return capture choice keeps the reference orbit unchanged and labels its penalty as an approximation.

The Educational Robustness Index is a seeded sensitivity experiment, not a real spacecraft reliability probability. Its 200 samples run in cancellable event-loop batches. Hardware robustness does not guarantee objective completion: the Resilient preset fails under the conservative policy but succeeds under the ordinary policy.

Full formulas, sources, numerical checks and limits are in `docs/SCIENTIFIC_VALIDATION_V5.md`.

## Documentation

- `docs/BUG_FIX_REPORT_V5.md`: baseline, defects, reproduction, changes and regression evidence.
- `docs/QA_V5.md`: executed tests, compatibility matrix, performance and unresolved gates.
- `docs/SCIENTIFIC_VALIDATION_V5.md`: sources, equations, assumptions and numerical cases.
- `docs/DEPLOYMENT_V5.md`: GitHub/Vercel publication status and update workflow.
- `docs/DEVELOPER_V5.md`: architecture and maintenance.
- `docs/DEMO_V5.md`: 90-second and 3-minute demonstration paths.
- `docs/RELEASE_NOTES_V5.md`: changes and limitations.

Earlier v3/v4 reports and research notes are historical records; v5 documentation supersedes their statements about current functionality.

## Attribution and competition use

NASA/JPL references are linked inside the game and scientific report. The code-generated visuals use no external art or runtime dependencies. Implemented with Codex assistance; do not imply NASA endorsement. This work is preparation material: verify the applicable event/challenge rules, disclose pre-existing work, cite sources and add the six members' actual contributions before submission. Award eligibility or success is not guaranteed.
