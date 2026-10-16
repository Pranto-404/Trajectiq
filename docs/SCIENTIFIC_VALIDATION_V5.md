# TRAJECTIQ v5 scientific validation

TRAJECTIQ is a deterministic educational mission game. The source constants and equations below are physically meaningful; the fictional components, mission objectives, resource budgets, operating schedules and recovery scenarios are teaching assumptions. These tests validate implementation against the stated model, not the accuracy of a real flight prediction.

## Source constants and units

| Quantity | Moon | Mars | Use and source |
|---|---:|---:|---|
| Mean radius | 1,737.4 km | 3,389.5 km | Circular orbit geometry; [JPL satellite physical parameters](https://ssd.jpl.nasa.gov/sats/phys_par/sep.html), [NASA Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) |
| Gravitational parameter μ | 4,902.800 km³/s² | 42,828.37362 km³/s² | Circular period; [JPL satellite parameters](https://ssd.jpl.nasa.gov/sats/phys_par/sep.html) and [JPL planetary GM table, Mars MAR097](https://ssd.jpl.nasa.gov/sats/phys_par/) |
| Reference solar irradiance | 1,361 W/m² | 586.2 W/m² | Panel generation at the scenario reference sunlight; [NASA Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html), [NASA Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) |
| Illustrative Earth distance scenarios | 363,300 / 384,400 / 405,500 km | 54,600,000 / 225,000,000 / 400,200,000 km | Moon fact-sheet reference values; Mars near/far examples from [NASA Mars Relay Network](https://science.nasa.gov/mars/mars-relay-network/). **225 million km is the game's chosen link normalization, not a measurement or asserted orbital average.** |

The Mars constants were checked against the NASA/JPL sources on 10 October 2026. The app bundles a snapshot and does not fetch current ephemerides. Near/far distance examples do not identify today's positions. Source provenance is preserved in `dist/data/nasa.js`.

## Equations and conventions

- Circular two-body period: `T = 2π sqrt((R+h)^3 / μ) / 60`, in minutes when radius and altitude are in km and μ in km³/s².
- Rocket equation: `Δv = Isp × 9.80665 × ln(mwet / mdry)`, in m/s. Propellant expenditure is its inverse: `m_used = m_before × (1 − exp(−Δv/(Isp × 9.80665)))`. Reference: [NASA Glenn ideal rocket equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/ideal-rocket-equation/).
- Power: array area × scenario irradiance × assumed 28% conversion efficiency; generation then receives an assumed 85% operating derating. The efficiency and derating are game assumptions, not verified flight hardware specifications.
- Battery integration: `ΔE [Wh] = (generation [W] − load [W]) × Δt [min] / 60`, clamped to physical battery capacity.
- Payload and link rates convert using `MB = Mb/s × seconds / 8`. These are decimal megabytes, not MiB.
- Light-time: `distance / 299792.458`, in seconds. It is a readout and does not delay player commands.
- Educational link scaling: `reference throughput × (reference distance / scenario distance)^2`. It is not a full antenna/link budget and omits coding, frequency, noise and pointing geometry.
- Mars central cylindrical-shadow duration: `T/π × asin(R/(R+h))`, using zero solar beta angle. This is a simplified central-shadow case, not a dated eclipse prediction. The Moon continues to use a fixed 35-minute teaching eclipse.

## Scenario boundaries

Both destinations use a fictional 150-credit budget, four-hour operating campaign, 650-unit science target and success at 80% of that target (520 returned units). Only quality-weighted observations actually downlinked count as returned science. Onboard and discarded data are separately accounted for. Progress bars cap at 100%; raw attainment can exceed 100%.

The assumed capture/correction allocation is 650 m/s plus a 100 m/s reserve. These numbers do not result from an Earth–Moon or Earth–Mars trajectory solution. Transport to the selected destination is pre-arranged and compressed. Launch-provider capacity, hardware mass/cost, power, tank size and contact windows are fictional educational values.

Mars adds destination-dependent gravity, radius, solar flux, altitude range (200–1,000 km), eclipse duration and distance/light-time examples. Its communications classes represent a separately engineered fictional deep-space system normalized at 225 million km. They do not imply that the Moon antenna can preserve its throughput at Mars.

Not modeled: interplanetary cruise, launch windows, orbital insertion trajectory optimization, landing, atmospheric drag, n-body gravity, realistic inclination-dependent lighting and contact geometry, thermal/radiation dynamics, mission-control light-time operations, equipment failure statistics or a full spacecraft link budget. Spacecraft visualization is schematic. No NASA certification, operational reliability prediction or flight readiness is implied.

## Confirmed defects corrected

1. **Misleading alternate orbit:** the old “Accept a wider orbit” action changed only a science multiplier, leaving altitude and period unchanged. It is now “Accept reduced-return capture.” The action explicitly describes a 450 m/s teaching approximation, a 35% useful-science penalty and unchanged reference orbit/period. No unvalidated alternate orbital solution is invented.
2. **Transmitter energy:** a recorder emptying within a time slice previously drew transmitter power for the whole slice. Integration now splits at the empty-recorder event; only the transmitting interval incurs that load.
3. **Safe-mode boundary:** a slice crossing 15% charge previously consumed science power while dropping the observations from the entire interval. Integration now splits at the threshold, retains observations collected before safe mode and applies the reduced safe-mode load afterwards.
4. **Zero-energy finality:** a zero-energy operating state now terminates immediately; later sunlight cannot revive the run.
5. **Resource authorization:** recovery decisions independently recheck available propellant and transmitter power, even if a restored checkpoint's button flags are altered. Invalid phases/actions are rejected and completed runs ignore further decisions.
6. **Input constraints:** the rocket equation returns zero for nonfinite/nonphysical parameters. Design normalization enforces destination altitude, tank, array and battery limits.

## Numerical checks

The following values are from the v5 engine with the bundled balanced presets, default uncertainty factors of 1 and ordinary science operations. Cost is fictional credits; science is the game's quality-weighted unit.

| Quantity | Moon balanced | Mars balanced |
|---|---:|---:|
| Altitude | 100 km | 400 km |
| Circular period | 117.790996889 min | 118.041764771 min |
| Eclipse model duration | 35 min, assumed | 41.601362949 min, derived central-shadow case |
| Wet mass | 164 kg | 174 kg |
| Cost | 115 credits | 124 credits |
| Returned science | 751.282959559 | 668.725223684 |
| Raw target attainment | 115.58% | 102.88% |
| Objective achieved | Yes | Yes |
| Final battery | 91.153938635% | 90.089179013% |

The Mars preset uses 150% array and battery sizing. At the same physical array area, the Mars/Moon generated-power ratio is `586.2/1361 ≈ 0.430713`. Lower sunlight is not bypassed by copying lunar generation values.

### Resilient preset caveat

Hardware endurance is not a guarantee of high science return. Under the conservative automated policy, the Resilient preset returns about **504.4444 units (77.61%) and fails the 520-unit success threshold**. Under the ordinary automated policy it returns about **568.8889 units (87.52%) and succeeds**, for both bundled destination presets. These outcomes use different operating decisions; they are not evidence of universal superiority of one design. Human decisions and uncertainty factors can change results.

## Test evidence

`tests/v5-physics.test.mjs` independently reconstructs the circular-period and eclipse equations at Mars altitudes of 200, 400 and 1,000 km; checks equal-area solar scaling; validates signal delay; tests normalization and tank limits; verifies alternate capture propellant expenditure; analytically checks partial-contact energy and safe-mode crossing energy/data; exercises exact battery boundary cases; checks raw over-target scoring; and rejects a forged enabled capture button when propellant is insufficient.

For checkpoint determinism, Moon and Mars fragile missions are serialized/restored at each transition and crisis, then advanced with the same decision sequence. Full resulting states, histories, events and outcomes must be identical. Repeated recovery actions and advancement of completed runs must be no-ops.

Seeded cross-design tests validate at every step:

- `generated MB = returned MB + onboard MB + lost MB`
- `generated science = returned science + onboard quality + lost science`
- Battery is between zero and capacity; fuel cannot increase or become negative; recorder backlog stays within capacity.
- Crises do not produce duplicate decision events, and every tested run terminates.

The focused run of existing engine/regression tests plus the new physics suite contains **43 tests**. See the final release QA report for the complete integrated suite and deployment results. Numerical tolerance accounts for floating-point arithmetic; it is not a measure of physical predictive accuracy.

A 200-sample synchronous robustness calculation took approximately **1.61 seconds** on the development host, confirming that such a calculation can block a browser main thread. This is a host measurement, not an Android benchmark. The Educational Robustness Index is a fraction of successes under bounded fictional perturbations, not a probability of real spacecraft survival.
