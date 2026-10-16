# Published Space Apps project review

Reviewed 2026-10-10. These are the creators' published descriptions, not independent playtests or verified judging results. Official team pages could not be retrieved; no award or selection claim is inferred. No code, artwork or assets were copied.

| Project / primary source | Observed idea | TRAJECTIQ response |
|---|---|---|
| [Artemis+ Lunar Habitat Simulator (2025)](https://github.com/zero-abd/artemis-plus-lunar-habitat-simulator) | A mission assistant accompanies habitat gameplay. Its README documents that live Unity game state and earlier conversation turns are not yet passed to the assistant. | Use the exact draft or current flight state, display which context is active, and retain the previous topic for supported follow-ups. Preserve free offline operation using local reasoning and the game engine. |
| [LUNA-01: Mission Control (2026)](https://github.com/Shovon30/Luna-01--Mission-Control) | Sequential mission decisions, consequences and explicit labels separating NASA values from game assumptions. | Add a crisis consequence preview that evaluates every available response from the same paused state. Label current observations, derived estimates and simulation forecasts separately. |
| [Dance of Irradiance (2022)](https://github.com/ericpien/2022_Space_App_Challenge) | Solar irradiance and magnetic-field data influence game hazards. | Keep the existing NASA/JPL constants connected to calculations. Add source-linked what-if experiments rather than decorative data claims. No solar-hazard dataset was imported. |

## Implemented improvements

- A no-typing experiment picker for all 17 components and three distance scenarios, plus six numerical design settings.
- Controlled comparisons of cost, mass, returned science, discarded data and final battery.
- A bounded design review that simulates single-variable alternatives and identifies the best tested candidate under a disclosed ranking.
- A proposal must be applied explicitly. Flight hardware stays locked; stale proposals cannot replace a newer draft.
- Contextual next steps, current telemetry, common spelling/Banglish support and narrow follow-up memory.
- No live generative model, payment, API key, copied competitor implementation or claim of superiority. Unsupported questions receive an honest fallback.

## Deliberate limits

Design forecasts begin at launch using one common operating/recovery policy. Crisis forecasts begin at the exact current state and apply the same later recovery policy. Predictions are deterministic outcomes of this teaching model, not real mission reliability or competition-winning probabilities. The review does not exhaust all combinations. Original NASA snapshot provenance remains unchanged and is accessible in Sources & method.
