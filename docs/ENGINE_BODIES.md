# Engine v7: bodies, scenarios and the public API

Branch `nasa-bodies`. Touches only `dist/data`, `dist/engine`, `tests` and this file. Moon and Mars behaviour is unchanged: an A/B run over every preset, difficulty and Moon/Mars scenario (science, battery, bytes, crises, readiness values) is byte-identical to the v6 engine.

## What shipped

| Body | id | Default scenario | Real mission behind it | Note |
|---|---|---|---|---|
| Moon | `moon` | `lunar-polar`, `lunar-ice` | LRO, GRAIL | unchanged |
| Mars | `mars` | `mars-polar`, `mars-dust` | MRO, Odyssey, MAVEN | unchanged; 225,000,000 km stays a labelled game choice |
| Earth, low orbit | `earth` | `earth-observer` | Landsat 9, PACE | ground-station distances are geometry for a 705 km orbit |
| Mercury | `mercury` | `mercury-thermal` | MESSENGER | heat-load event, sunshade mass |
| Venus | `venus` | `venus-radar` | Magellan | data-limited radar mapper |
| Vesta | `vesta` | `dawn-vesta` | Dawn | weak sunlight, array up to 4x |
| Ceres | `ceres` | `dawn-ceres` | Dawn | weak sunlight, array up to 5x |
| Europa | `europa` | `europa-flyby` | Europa Clipper | circular-orbit stand-in for a flyby tour; radiation event |

Considered and not shipped (`SKIPPED_BODIES` in `bodies.js` carries the reasons):

- **Phobos**: GM 7.1e-4 km^3/s^2 and Mars perturbation make a Keplerian circular orbit meaningless, and no NASA orbiter or altitude range exists. Skipped.
- **Bennu**: GM 4.9e-9 km^3/s^2 gives a period of about 35 hours at 1 km. The once-per-orbit contact model and a few-hour campaign cannot represent it, and non-gravitational forces dominate. Skipped.
- **Ganymede**: no sourced orbit altitude range, and Europa already teaches the Jovian trade. Skipped.
- **Titan**: 14.8 W/m^2 at Saturn means a solar kit is not feasible (Cassini used RTGs), the minimum safe altitude over the thick atmosphere was not sourced, and the game has no RTG class. Skipped.
- **Europa** is shipped as a documented simplification: real Europa Clipper never orbits Europa (it flies nearly 50 flybys as low as 25 km) and Jupiter makes low circular orbits unstable. The body carries `simplification` text that the UI should show next to the scenario.

## Physics: one orbit model for every body

- Period: `2*pi*sqrt((R+h)^3/mu)`. Eclipse: central cylindrical shadow `T/pi*asin(R/(R+h))`. Both live in `catalog.js` and are the only orbit maths.
- Tests reproduce published periods: Dawn at Vesta 210 km (4.3 h), 680 km (12.3 h, 2% tolerance because the published altitude is rounded), 2,750 km (69 h); GRAIL 50 km (113 min); Landsat 9 705 km (99 min); PACE 676.5 km (98.3 min); MRO 287.5 km mean (112 min); Odyssey ~400 km (2 h); MESSENGER 12 h from its 10,136 km semimajor axis.
- Not modelled, and said so in the UI text: elliptical orbits, drag, aerobraking, mascons and irregular gravity (Moon, Vesta), third-body perturbation (Europa), sun-synchronous geometry (the central shadow overstates Earth eclipse).
- Weak sunlight: array output is `irradiance * area * efficiency`, so it scales with the body's irradiance. Outer bodies (Vesta, Ceres, Europa) allow a larger array through the scenario field `arrayScaleMax` (the standard kit area times a factor; mass and cost grow with the existing formula).
- **Array efficiency decision.** The game's 28% is a game assumption. Real arrays deliver about 13-17% of irradiance times gross area (Juno 17% at Earth and 13% at Jupiter; Europa Clipper 17% and 14%; research derived from press-kit figures). Changing the default would silently change Moon and Mars balance, so the default stays 0.28 and is exposed per scenario as `arrayEfficiency`. `missionFor(...).arrayEfficiency` is always present; the assistant's "assumptions" answer states the active value and the real range. Mercury uses 0.12 (arrays turned away from the Sun), a stated game assumption. `REAL_ARRAY_EFFICIENCY` in `real-missions.js` carries the real figures.
- **Thermal and radiation** are scenario weather events, not physics. `weather.kind` is now one of `dust`, `particle` (v6) plus `thermal` (power-to-fraction and quality, like dust) and `radiation` (quality and stored-data corruption, like a particle event). Both new kinds support `aftermath`: riding the event out leaves the instruments `aftermath` times as sensitive for the rest of the campaign. Event sizes are relative game assumptions; no temperature limit or dose in rads is used or quoted. The assistant answers heat and radiation questions only in scenarios that have such an event, labelled "GAME ASSUMPTION", and still refuses them elsewhere.
- **GOLD Rules** (GSFC-STD-1000 Rev I) and the propellant fractions appear as non-blocking `calculate().hints` (see API).
- Per-scenario fields that default to the old constants: `duration` (240 min), `contactMinutes` (25), `maneuver` (650 m/s), `reserve` (100 m/s), `thermalMass` (15 kg), `arrayScaleMax` (1.5), `arrayEfficiency` (0.28). Contact length for Earth (12 min) and Venus (20 min) is a game assumption; no NASA ground-pass length was read.

## Public API (import from `dist/engine/api.js`)

```js
import * as engine from '../../dist/engine/api.js'   // or alias used by the Vite config
```

Bodies and data
- `BODIES` (id -> body), `BODY_IDS`, `getBody(id)` (null for unknown, prototype keys safe), `listBodies()`, `isBodyId(id)`, `SKIPPED_BODIES`.
- Body fields: `id, name, kind, host, order, radius (km), mu (km^3/s^2), solarIrradiance (W/m^2), earthRange {near,mean,far} (km), referenceDistance, altitudeMin/Max/defaultAltitude (km), launchAltMax {rideshare,dedicated}, heliocentricAu, colors {surface,accent,atmosphere|null}, hazards {..strings}, directorWeather, realReference {mission,note}, simplification?, provenance`.
- `provenance[field]` = `{url, kind: 'direct'|'derived'|'assumption', verified: 'YYYY-MM-DD', unverified: boolean, note}` for `radius, mu, solarIrradiance, earthRangeNear, earthRangeMean, earthRangeFar, altitudeMin, altitudeMax, launchAltMax`. **`unverified: true` must be shown as "game assumption".**
- `bodyRows(id)` -> rows ready for a data panel: `{id,label,value,unit,use,kind,url,verifiedOn,unverified,note}`; unverified labels already end with "GAME ASSUMPTION".
- `nasaDataset(design)` (Moon and Mars return their original snapshot objects; other bodies are generated with the same shape plus per-row `url`, `verifiedOn`, `unverified`), `distanceOptions(design)`, `datasetCSV(bodyId)` (RFC 4180, columns parameter, value, unit, evidence, source_url, verified_utc, unverified, note), `sourcesFor(bodyId)` (Sources screen list; Moon returns the unchanged `SOURCES`).
- `ATTRIBUTION`: credit list (NASA/JPL/NAIF/NSSDCA/USGS/GOLD/SmallSat plus a no-endorsement entry). Show it in a credits panel. NASA insignia are not used.
- `REAL_MISSIONS` (17 missions, each with `provenance {sources, unverified[], verified}`; `null` means not found in a NASA page), `getRealMission(id)`, `missionsFor(bodyId)`, `PROPELLANT_FRACTIONS`, `ODYSSEY_SUBSYSTEMS` (share of a real 725 kg orbiter's dry mass: power 23%, propulsion 13%, telecom 6%, command and data 3%), `GOLD_RULES`, `REAL_ARRAY_EFFICIENCY`.

Scenarios and presets
- `listScenarios({difficulty})` -> cards: `id,title,tag,summary,subtitle,why,destination,body{id,name,colors,order},isDefaultForBody,budget,scienceTarget,scienceNeeded,durationMinutes,altitudeRange,referenceAltitude,arrayScaleMax,contactMinutes,critical,weather{kind,title}|null,realMission,realNumbers[{label,value,source}],assumptions,simplification,presets`. Cards come from `SCENARIOS`, so a new scenario appears automatically.
- `bodyForScenario(id)`, `scenariosForBody(bodyId)`, `presetsForScenario(id)` -> `{balanced, resilient, fragile}` complete designs, `presetFor(destination, key, scenarioId?)` (Moon and Mars unchanged), `PRESET_KEYS`.
- `missionFor(design)` now also returns `arrayScaleMax, arrayEfficiency, duration, contactMinutes, maneuver, reserve, thermalMass, bodyId, hazards, simplification, realMission`. **Use `arrayScaleMax` as the maximum of the array slider and `altitudeMin/Max` for the orbit slider; `duration` is no longer always 240.**

Engine (unchanged signatures): `calculate, normalize, newRun, advance, resolve, runToEnd, robustness, diagnose, debrief, reviewDecisions, missionScore, encodeDesign, decodeDesign, verifyDesign, answerQuestion` and the crew helpers. New in `calculate()`: `hints` (propellant fraction, mass margin, power margin; `status` `ok` or `note`; each has `source` and `basis`; they never fail or warn). New in `answerQuestion`: topics `realmission` and `hazard`.

Share codes: Moon and Mars codes are byte-identical to v6 (`TQ6.`, payload `v:1`). Other bodies use the same prefix with payload `v:2`; older readers reject them as an unsupported format instead of turning them into a Moon design. The decoder accepts v1 and v2 and is strict whenever a destination is named: unknown or non-string destination, a v1 code naming a non-legacy body, a scenario of another body, unknown part ids, difficulty, non-numeric or out-of-range numbers and altitudes outside the body's range are rejected, never repaired. A v1 code with no destination key still decodes as before (lenient, clamped).

## Calibration

Probes: every combination of 2 buses, 2 payloads, 3 power kits, 2 thrusters, 3 radios, 3 recorders, 2 launchers, fuel (45 or 70 kg), array scale (three values up to `arrayScaleMax`) and battery scale at the scenario's reference altitude and 90 degrees, flown with the ordinary and conservative policies, targets tuned so a clearly reasonable design succeeds and a careless one fails. Results: see the table below (filled from the final probe).

| Scenario | Target (needed, Engineer) | Budget | Minutes | Balanced (ordinary / conservative policy) | Resilient | Fragile | Share of launchable grid designs that succeed (ordinary / conservative) |
|---|---|---|---|---|---|---|---|
| earth-observer | 800 (640) | 150 | 300 | 1004 win / 1004 win | 644 win / 580 fail | 38 fail / 38 fail | 23.0% / 21.6% of 3646 |
| mercury-thermal | 700 (560) | 150 | 240 | 589 win / 459 fail | 694 win / 497 fail | 71 fail / 56 fail | 22.5% / 1.8% of 3641 |
| venus-radar | 1000 (800) | 150 | 360 | 927 win / 927 win | 1138 win / 1073 win | 78 fail / 78 fail | 23.6% / 23.6% of 3646 |
| dawn-vesta | 1500 (1200) | 150 | 600 | 1931 win / 1931 win | 1931 win / 1931 win | 10 fail / 0 fail | 5.4% / 5.1% of 3222 |
| dawn-ceres | 1800 (1440) | 150 | 720 | 2284 win / 1986 win | 2284 win / 1986 win | 0 fail / 0 fail | 2.7% / 3.4% of 2924 |
| europa-flyby | 560 (448) | 190 | 300 | 660 win / 670 win | 660 win / 670 win | 0 fail / 0 fail | 4.7% / 1.6% of 3300 |

Cells read "science returned, win or fail". The grid is the explorer sweep described above (Mercury and Europa: 3,000-3,600 launchable designs; the grid is coarse, so shares are indicative). Ordinary policy = ride out events and keep collecting; conservative = safe the instruments at a weather event, conserve at an energy crisis, prioritise downlink at a recorder crisis. On Mercury and Europa the conservative policy fails the objective by design: giving up collection time to safe the instruments costs more than riding the event out, which is the trade the scenario teaches. Dawn at Vesta and Ceres have narrow success regions (about 5% and 3% of grid designs): success needs an array of at least 2.5 times the standard kit and a recorder of at least 768 MB, because only two or three ground contacts fall inside the campaign.

Difficulty: the same targets apply at Cadet (70% needed, budget x1.25) and Flight Director (85% needed, budget x0.92, deadline x0.9). At Flight Director the Resilient and Fragile presets of most scenarios miss the 20-month deadline and are not launchable, as the Moon presets already do; Balanced stays launchable. Mercury Balanced misses the Director objective by about 1% (589 of 595); that is deliberate headroom for a harder tier.

## What the UI engineers must know

1. Import from `dist/engine/api.js`; never hard-code `moon`/`mars`. Use `getBody(design.destination)` and `missionFor(design)`.
2. Sliders: orbit `altitudeMin/Max`, array `0.75..arrayScaleMax`, battery `0.75..1.5`, duty `0.25..1`, inclination `0..90`. Campaign length is `duration` minutes (up to 720); do not assume 240 or 48 steps.
3. Show `unverified` values as "game assumption", show `simplification` (Europa) and scenario `assumptions` text, and show `ATTRIBUTION` somewhere reachable.
4. `normalize()` silently falls back to the Moon for an unknown destination (UI state tolerance); `decodeDesign` does not.
5. Legacy UI (`dist/ui/app.js`) hard-codes Moon and Mars (destination selector, `mars` ternaries, 240-minute copy, 4 scenarios in the selector) and will show wrong text for new bodies; it was not edited. `dist/sw.js` does not list `./data/bodies.js`, `./data/real-missions.js` or `./engine/api.js`, and `scripts/build-standalone.mjs` concatenates modules by name and does not include them, so the legacy standalone and the legacy offline cache cannot load the new engine; both belong to the legacy UI that is being replaced.
6. Test change: the external-host allow-list in `tests/v6-security.test.mjs` and `tests/v7-build.test.mjs` now includes `usgs.gov` (the Landsat 9 fact sheet is a provenance URL in the registry).

## Unverified values (surfaced as game assumptions)

Earth ground-pass minutes (12) and Venus contact (20); every scenario duration, science target, budget, thermalMass, arrayScaleMax and event size; launch-vehicle altitude envelopes for the new bodies; the game altitude maximum for Ceres, Vesta, Europa, Mercury, Venus and Earth (the real minimum is sourced for Ceres, Vesta and Europa); all Moon, Mars and new-body radiation figures (none used); the middle Earth distance of each body is a derived game reference (midpoint of the Horizons range) and Mars keeps its 225,000,000 km teaching reference; Ceres and Vesta sunlight is derived as 1361/a^2, not a printed NASA value. No `unverified` field from the research pass was resolved by an extra lookup in this pass.
