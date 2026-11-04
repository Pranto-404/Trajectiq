# Scientific model and validation · v6

This is an educational first-order model, not flight-design software. Every number below is either a sourced constant, an established equation, or an explicit game assumption.

## Sourced constants (NASA/JPL snapshots in `dist/data/nasa.js`)

Moon mean radius 1,737.4 km and GM 4,902.800 km³/s²; Mars mean radius 3,389.5 km and GM 42,828.37362 km³/s²; solar irradiance at the Moon 1,361 W/m² and at Mars 586.2 W/m²; Earth–Moon perigee, semimajor axis and apogee; Earth–Mars near and far range scenarios. Sources and verification dates are listed inside the game (Sources & method) and exportable as CSV.

## Equations

- **Ideal rocket equation:** Δv = Isp · g₀ · ln(m₀ / m_f), g₀ = 9.80665 m/s². Propellant use is its inverse.
- **Circular orbit period:** T = 2π √((R + h)³ / μ).
- **Eclipse duration, both bodies (changed in v6):** t_eclipse = (T / π) · asin(R / (R + h)). This is the central cylindrical-shadow bound for a zero solar beta angle. At 100 km above the Moon: T = 117.8 min, t_eclipse = 46.5 min. Verified against an independent evaluation in `tests/v6-engine.test.mjs`. v5 used a fixed 35 minutes for the Moon.
- **Energy:** E_next = clamp(E + (P_gen − P_load) · Δt / 60). Steps are split at shadow, contact and space-weather boundaries.
- **Data:** MB = Mb/s × seconds / 8.
- **Link scaling with distance:** (reference distance / distance)², a teaching approximation, not a radio link budget.
- **Duty cycle shown to players:** average link rate = link rate × contact minutes / orbit period.

## Game assumptions (not sourced)

Component masses, powers, costs, data rates and values; 28% array efficiency and 85% operating derating; 25-minute ground-contact window per orbit; 240-minute campaign; science targets and thresholds per scenario; 650 m/s capture plus 100 m/s reserve; safe mode at 15% battery, recovery above 40%; crisis triggers; the degraded-link factor of 45%; space-weather magnitudes and durations; development lead times and the schedule formula (6 months of integration + longest lead + 25% of the other lead times); launch-vehicle envelopes (rideshare: ≥45° inclination, ≤150 km at the Moon, ≤600 km at Mars).

**Mars reference distance:** 225 million km is a game choice for normalising the radio link. It is not a measured average, and the near and far values are NASA reference scenarios.

## What v6 added to the model

- **Readiness checks:** launch–orbit compatibility, development schedule, recorder before first contact (fill time = capacity ÷ (data rate × duty), compared with the time to the first contact).
- **Space weather:** a seeded event time in a window; dust cuts solar output for its duration; a particle event cuts observation usefulness and can corrupt stored data. A decision is offered only if replaying the options under the default policy changes science, final battery or discarded data materially.
- **Link decisions** are offered only when the recorder holds more than one degraded contact window can return.

## Mission Score

Five dimensions that mirror the challenge text (see `dist/engine/review.js`):

1. Performance, 300: 260 × min(1, science / target) + 40 if the objective is met.
2. Scientific value, 200: instrument value × pointing factor × polar coverage × altitude detail × quality factors.
3. Efficiency, 200: 35% science returned ÷ generated, 25% budget left (full marks at ≤50% used), 25% energy health, 15% schedule slack.
4. Decision quality, 200: for each high-stakes decision, (chosen − worst) ÷ (best − worst) of the replayed outcome scores (performance + value + efficiency); full marks when no high-stakes decision arose.
5. Collaboration, 100 (crew only): participation of every role, Go/No-Go concerns resolved, share of roles consulted in crises, and expert advice followed.

The score is a teaching metric. It is not a probability of success. The Educational Robustness Index remains a seeded sensitivity experiment over solar, link, Isp and pointing multipliers, not a reliability estimate.

## Replay and forecasts

A decision replay starts from a stored snapshot of the paused state and runs the real engine to the end under each response. Later crises are answered as the player answered them, or with a no-intervention default, and later manual commands are held at defaults. Differences therefore isolate the decision. Direction previews rehearse every option the same way. The one forecast re-runs it under pessimistic, nominal and optimistic multipliers and widens the range by 5%.

## Not modelled

Transfer trajectory, launch windows, landing, thermal, radiation environment, atmospheric effects, detailed RF budgets, real ground-station geometry, n-body dynamics. The assistant declines to invent values for them.
