> Historical document: this describes an earlier release. For current behavior, see README.md and docs/QA_V5.md.

# TRAJECTIQ 3.0 — test and change report

Verified in the execution workspace on 2026-10-07. No claim of flight certification, NASA endorsement, guaranteed competition ranking, or universal browser compatibility.

## Result

42 automated tests pass using `npm test`. The standalone package is rebuilt from the same tested modules. Source and standalone versions are 3.0.0.

## Defects corrected

1. A spacecraft could previously recover from a completely exhausted battery in later sunlight. Zero energy now terminates the mission with a specific failure reason.
2. Five-minute endpoint sampling could assign a whole step to the wrong side of a contact/shadow boundary. Integration now uses intervals of at most one minute and splits at those boundaries.
3. A transmitter previously consumed its full load during contact with an empty recorder. Transmission power now requires buffered data.
4. Energy recovery was labeled as conservation but simply switched to ordinary science scheduling. It now pauses science/transmission and resumes in sunlight at 60% battery. Manual Conserve remains manual.
5. Halving instrument duty could increase the workload of an already low-duty instrument. Recovery now halves the current duty.
6. Assistant context could refer to a previous flight while editing a new design. It now uses the draft on design screens and the selected flight/result on operational screens.
7. An assistant/help modal could leave the flight running behind the text. Reading pauses flight, and Resume is blocked until the modal closes.
8. Malformed stored JSON, non-array archives and non-finite design numbers could cause a blank screen or invalid calculations. Input validation, finite defaults and bounded values protect the game.
9. Presets originally bypassed normalization for new customization fields. They now reset with explicit standard sizing/duty/distance values.
10. The mission export could label an old flight with a newer draft design. It now exports the actual run design.
11. Cost increases were colored as improvements in before/after comparisons. Lower cost is now marked as improvement.
12. Orbit rendering recalculated invariant paths and allocated link buffers every frame. It now caches paths and reuses buffers; transmission pulses require actual downlink activity.
13. Cache-first behavior could keep older game code. The new service worker uses network-first reads with an offline cache, deletes only TRAJECTIQ-owned old caches, and avoids caching redirected responses.
14. Version-2 run history is retained. Comparisons across engine versions explicitly warn that differences cannot all be attributed to hardware changes.

## Meaningful automated coverage

- Original 26 tests: launch constraints, conservation, rocket equation/fuel use, crisis gating/recovery, deterministic comparisons, uncertainty, complete gameplay loop, all engineering screens, standalone syntax, camera math and mocked WebGL adapter.
- 13 new engine/data/assistant tests: invalid inputs; NASA constants feeding calculations; customization trade-offs; zero-energy termination; eclipse boundary integration; empty-recorder power; low-duty recovery; automatic energy recovery; actual distance effect on returned science; 100 seeded candidate designs; all 45 help-library questions; current-state answers; English/Bangla and unsupported-question fallback.
- 3 new UI adapter tests: five malformed saved-state variants; customization persistence and safe text rendering; assistant pausing, submitted questions, language selection and correct redesign context.

The 100-design sweep skips physically blocked designs and checks every launched configuration for finite state, bounded battery/storage, complete termination, byte conservation, and quality-weighted science conservation. It is a property check, not a statistical estimate of real mission reliability.

## Reproducible reference scenarios

| Configuration | Schedule | Science units returned | Completion | Cost | Outcome |
|---|---|---:|---:|---:|---|
| Balanced | Sunlit mapping | 751.283 | 100% (capped) | 115 | Objective achieved |
| Fragile | Shadow mapping, continue collecting, wait on link | 60.417 | 9.295% | 110 | Power exhausted |
| Resilient | Same shadow-mapping choices | 568.889 | 87.521% | 129 | Objective achieved |

Changing the recovery policy changes these outcomes. A better-powered spacecraft can generate more bytes and therefore also discard more raw data; more discarded bytes do not automatically imply less returned science.

## NASA data

Eight numeric records in `dist/data/nasa.js`, also exported as CSV in the site. Source HTML snapshots are retained in `docs/research`.

- NASA NSSDCA Moon Fact Sheet: https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html (last source update 2024-01-11; verified 2026-10-06).
- NASA/JPL satellite physical parameters: https://ssd.jpl.nasa.gov/sats/phys_par/sep.html (verified 2026-10-06).

NASA supplies environmental constants/reference values. Component values, science points, cell efficiency, loss assumptions, link scaling rule and contact/shadow schedules are explicitly educational. The snapshot is not live telemetry, an LRO terrain raster or a detailed radio propagation model.

## Remaining verification boundary

No real browser, phone/tablet or actual GPU screenshot audit was available in this environment. UI tests use a DOM adapter; WebGL tests mock its API. Layout, shader compilation, touch behavior, source-link reachability and service-worker lifecycle still need a hands-on check on the team's demonstration devices. No user-study learning outcome or timed pitch claim is made.

The assistant uses local retrieval and rules. It is designed to cover the project and current state, not every conceivable question. Explicit unknowns return “I can’t answer that reliably.” It cannot browse, invent specifications, change engine outcomes or promise competition success. New questions can be added to its knowledge catalog and regression corpus.
