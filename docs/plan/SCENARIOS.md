# TRAJECTIQ proposed scenarios built on real missions

Verified 2026-11-05. Numbers come from `bodies.json` and `real_missions.json` (each with source URLs). Tags: **[REAL]** = taken from a NASA/JPL source; **[DERIVED]** = arithmetic on real numbers by the plan author; **[GAME]** = game assumption to keep the simulation tractable. Difficulty maps to the existing `DIFFICULTY` levels (cadet/engineer/director are suggestions).

Common game simplifications to keep honest in every scenario text: pre-arranged transfer (no cruise/launch window computed), circular two-body orbits unless the scenario says "elliptical", central cylindrical shadow, fixed contact windows. Credits and component tables remain fictional.

| # | Scenario | Body | Real mission | Difficulty |
|---|---|---|---|---|
| 1 | Lunar Polar Mapper (rebased on LRO) | Moon | LRO | Easy |
| 2 | Twin Gravity Mappers | Moon | GRAIL | Medium |
| 3 | Mars Relay Orbiter | Mars | Odyssey / MRO | Medium |
| 4 | Deep Dip | Mars | MAVEN | Hard |
| 5 | Venus Radar Cycles | Venus | Magellan | Hard |
| 6 | Mercury Thermal Squeeze | Mercury | MESSENGER | Hard |
| 7 | Ion Tour Vesta to Ceres | Vesta, Ceres | Dawn | Medium-Hard |
| 8 | Touch the Rubble Pile | Bennu | OSIRIS-REx | Medium |
| 9 | Jupiter Radiation Dash | Jupiter | Juno | Hard |
| 10 | Ocean Moon Flyby Tour | Europa | Europa Clipper | Expert |
| 11 | Earth Observer on a Clock | Earth LEO | Landsat 9 / PACE | Easy-Medium |
| 12 | Kiss the Corona | Sun (heliocentric) | Parker Solar Probe | Hard |

---

## 1. Lunar Polar Mapper (rebased on LRO) - Easy

- **Objective:** Map the lunar poles from a ~50 km polar orbit and return at least 80% of the science target.
- **Trade-off taught:** payload power and data rate vs eclipse endurance and downlink capacity (keeps the current game, adds the real anchor).
- **Real numbers [REAL]:** Moon GM 4902.800 km3/s2, radius 1737.4 km (JPL); LRO launch mass ~1,846 kg, dry <949 kg, payload 92 kg / ~125 W, 10.7 m2 array, 80 A-hr Li-ion, Ka-band 100-300 Mb/s, ~$460 M, orbit ~30 x 180 km science phase (NSSDCA). GRAIL 50-55 km (NSSDCA/JPL).
- **Derived [DERIVED]:** period 113.0 min and central shadow 48.0 min at 50 km (same formulas as the engine); Moon irradiance 1361.0 W/m2 (fact sheet).
- **Game assumptions [GAME]:** 650 science-unit target, 4-hour campaign, 25-minute contact, fictional catalog, 4 Mb/s downlink (real LRO Ka-band is 25-75 times faster; mention in the post-mission comparison).
- **Calibration:** show "LRO payload = 92 kg / 125 W; yours = x kg / y W".

## 2. Twin Gravity Mappers - Medium

- **Objective:** Fly two small spacecraft in tandem at ~55 km for a 90-day science phase; success is measured by ranging data returned.
- **Trade-off:** each spacecraft must stay small and cheap, but formation keeping and two links double the propellant, power and cost.
- **Real [REAL]:** GRAIL spacecraft 202.4 kg fueled / 132.6 kg dry each; 113 min period; 175-225 km separation; Ka-band inter-satellite ranging; S-band to Earth; estimated $375 M; deliberate impact 2012-12-17 (NSSDCA, NASA Science).
- **Derived:** propellant fraction 34% (69.8/202.4); period 113.5 min at 55 km.
- **Game assumptions:** formation-keeping delta-V per week; two-spacecraft scoring; mascon perturbation modelled as a random orbit-adjust crisis (mascons are real: GRAIL page, but magnitudes unverified).

## 3. Mars Relay Orbiter - Medium

- **Objective:** Serve a surface asset by relaying UHF data to Earth, balancing relay throughput with direct-to-Earth return.
- **Trade-off:** UHF proximity link (fast, short) vs X-band deep-space link (slow, long); storage buffer between the two.
- **Real:** Odyssey UHF relay 8/32/128/256 kb/s (DESCANSO); Odyssey 725 kg launch, 376.3 kg dry, telecom 23.9 kg, EPS 86.0 kg, 2-hour ~400 km orbit; MRO 160 Gbit recorder, 3 m dish, max 6 Mb/s, 255 x 320 km, 112 min, ~$720 M; Mars range 56.2e6-400.1e6 km (Horizons 30-year sample), light time 3.1-22.2 min (derived).
- **Assumptions:** lander data volume per sol, relay pass length (a real number needs a NASA source: unverified), score by MB delivered.

## 4. Deep Dip - Hard (needs elliptical orbit support)

- **Objective:** Sample the upper atmosphere with a 150 km periapsis and a ~6,000 km apoapsis; optionally do a 125 km "deep dip" campaign.
- **Trade-off:** science value of low periapsis vs drag heating and attitude disturbance; instrument mass vs power.
- **Real:** MAVEN dry 809 kg, wet 2,454 kg, payload 65 kg in 8 instruments, 1,150-1,700 W, two 55 A-hr Li-ion, 75 deg inclination, 4.5 h period, 150 km periapsis and ~125 km deep dips, twice-weekly HGA sessions (NASA Science, NASA Facts, NSSDCA).
- **Derived:** period 4.38 h from a 150 x 6,000 km orbit (published 4.5 h).
- **Assumptions:** drag model, deep-dip science multiplier, thermal limit.

## 5. Venus Radar Cycles - Hard

- **Objective:** Map at least 70% of Venus with radar in repeating cycles through a 294 km periapsis orbit, then raise the bar to 90%.
- **Trade-off:** swath width and coverage per cycle vs onboard recorder size and downlink; left-looking vs right-looking cycles; power for the radar.
- **Real:** Magellan 3,445 kg launch, periapsis 294 km (NSSDC) / 297 km (NASA Science), apoapsis 8,463 km, 85.5 deg, 243-day cycles, 4,225 SAR orbits each ~20 km x 17,000 km at 75 m/pixel, 98% coverage, 1,200 Gbit returned (NASA Science, NSSDC planetary page). Venus irradiance 2,601.3 W/m2, surface 737 K (fact sheet).
- **Derived:** Venus rotation 5832.6 h = 243.0 d, so one cycle = one rotation of the planet under the orbit.
- **Assumptions:** compress each 243-day cycle to ~60 game minutes; coverage as a fraction proportional to swath x orbits; cost.

## 6. Mercury Thermal Squeeze - Hard

- **Objective:** Survive 12-hour elliptical orbits near the Sun and return a global image set.
- **Trade-off:** more sunlight (arrays smaller) vs overheating; instrument pointing vs keeping the sunshade between spacecraft and Sun.
- **Real:** Mercury irradiance 9,082.7 W/m2 (~6.7x Earth), surface 590-725 K sunward (fact sheet); MESSENGER 1,093 kg launch (or 1,107.9 kg), 485.2 kg dry, 607.8 kg propellant (56% of launch mass, derived), 450 W at Mercury, orbit 200 km x 15,193 km, 80 deg, 12 h (NSSDCA); impact 2015-04-30.
- **Derived:** heat-flux index 6.67; Mercury GM 22031.8686 km3/s2 gives a 12 h period for a ~10,136 km semimajor axis (matches NSSDCA geometry).
- **Assumptions:** sunshade catalog item, temperature thresholds (NASA temperature limits for hardware not fetched: unverified).

## 7. Ion Tour Vesta to Ceres - Medium-Hard

- **Objective:** Use electric propulsion to reach two bodies, mapping each from three altitudes.
- **Trade-off:** thrust is limited by solar power at 2.4-3 AU (derived 150-240 W/m2); high Isp saves propellant but needs time and power; science at each altitude vs total mission duration.
- **Real:** Dawn 1,217.7 kg launch, 747.1 kg dry, 425 kg xenon + 45.6 kg hydrazine, 10.3 kW at 1 AU and 1.3 kW at 3 AU, Isp 3,200-1,900 s, 92 mN at 2.6 kW, 3 thrusters; Vesta orbits 2,750 km (69 h), 680 km (12.3 h), 210 km (4.3 h); Ceres 13,500 km then 375 km; X-band 10 b/s-124 kb/s; $446 M (NSSDCA). Vesta GM 17.2882844, Ceres GM 62.6284 km3/s2 (SBDB).
- **Derived:** engine formulas reproduce 4.30 h and 69.4 h at Vesta; Ceres 375 km gives 5.41 h; Vesta irradiance 244 W/m2, Ceres 178 W/m2 at semimajor axis.
- **Assumptions:** thrust-time-to-delta-V conversion, orbit transfers between altitudes, ion catalog item.

## 8. Touch the Rubble Pile - Medium

- **Objective:** Map a sub-kilometre asteroid from ~1 km, pick a sample site, collect at least 60 g, and return the capsule.
- **Trade-off:** autonomy vs operations cost under a 4.4-18 minute one-way light time; mapping detail vs time; propellant is tiny but navigation errors are costly.
- **Real:** Bennu GM 4.8904e-9 km3/s2, diameter 484.4 m, rotation 4.296 h (SBDB); OSIRIS-REx dry 880 kg, wet 2,110 kg, 1,226-3,000 W, ~$800 M (excl. launch), 1.75 km then ~1 km orbits, ~240 m flyovers, minimum sample requirement 60 g, returned 121.6 g (press kit; NASA Science sample blog). Bennu irradiance range 740-1,692 W/m2 (derived).
- **Derived:** circular speed at 1 km altitude ~6 cm/s; period 1,480 min at 0.75 km (derived).
- **Assumptions:** sampling success probability, mapping-to-site-selection score; the radius vs altitude definition of the real 1.75 km orbit is unverified.

## 9. Jupiter Radiation Dash - Hard

- **Objective:** Complete as many polar science orbits as possible before the electronics are dosed out, powered only by sunlight.
- **Trade-off:** vault mass (shielding) vs instrument and propellant mass; solar array area vs mass at 50 W/m2.
- **Real:** Jupiter irradiance 50.26 W/m2, dipole field 4.30 Gauss-Rj3 (fact sheet); Juno launch 3,625 kg (1,593 kg spacecraft), 60 m2 arrays, ~14 kW at Earth and ~400 W at Jupiter, titanium vault 150 kg (NSSDCA) or ~180 kg (NASA Science), 14-day polar orbit, perijove ~4,200 km above clouds, 37 orbits planned, $1.13 B, X-band 10 bps-200 kbps (JPL press kit, NSSDCA, DESCANSO).
- **Derived:** effective array conversion 17% of gross area at Earth, 13% at Jupiter (14 kW / 60 m2 / 1,361; 400 W / 60 m2 / 50.26). Use these instead of 28%.
- **Assumptions:** dose per perijove (NASA absolute figure unverified); failure threshold; light time 33-54 min (derived from Horizons range 591-965 million km).

## 10. Ocean Moon Flyby Tour - Expert

- **Objective:** Fly ~50 passes of an icy moon at 25 km and up (real minimum 25 km; upper bound unverified, set by the game) from a Jupiter orbit and return radar, spectra and gravity data.
- **Trade-off:** each flyby adds science and dose; vault mass and radiation margins compete with instrument mass; downlink must fit between passes.
- **Real:** Clipper 5,800 kg at launch, 2,750 kg propellant, ~23 kW near Earth and at least 700 W through prime mission, 102 m2 arrays, 3 m dish, vault Al-Zn up to 9.2 mm, nearly 50 flybys, 25 km minimum altitude, Jupiter insertion April 2030, prime end June 2034, ~$5.2 B, a few thousand to tens of thousands of rads per flyby with mitigation (JPL press kit, NASA Science). Europa GM 3202.7121 km3/s2, radius 1560.8 km, g 1.31 m/s2, -170 C (JPL, fact table).
- **Derived:** effective array 14% of gross area at Jupiter (700 W / 102 m2 / 50.26). Europa light time 33-54 min.
- **Assumptions:** the flyby altitude upper bound (unverified), per-flyby dose number, comm band and rates (unverified), data volume per flyby (unverified).

## 11. Earth Observer on a Clock - Easy-Medium

- **Objective:** Image land at 30 m for as many orbits as possible for five years, using a sun-synchronous orbit.
- **Trade-off:** instrument power (OCI 280 W) vs array size and battery cycle life; scenes per day vs ground-station contact; orbit altitude vs revisit period.
- **Real:** Landsat 9 2,710 kg, 705 km, 98.2 deg, 99 min, 14 orbits/day, 16-day repeat, ~750 scenes/day, 5-year design life, 10+ years consumables (USGS/NASA); PACE ~1,700 kg fueled, 235 kg hydrazine, ~2.7 kW, 676.5 km, 98.3 min, OCI 260 kg / 280 W (NASA blog, NTRS). Earth GM 398600.4355, radius 6371.0 km.
- **Derived:** ~5,300 eclipse battery cycles per year (365.25 x 24 x 60 / 99); engine period 98.7 min at 705 km; central shadow ~36 min (sun-synchronous dawn-dusk orbits avoid most of it; the central model overstates eclipse).
- **Assumptions:** ground-station pass minutes (unverified), local-time geometry, scene value.

## 12. Kiss the Corona - Hard

- **Objective:** Collect field and particle data on repeated close approaches, then return it during the long outbound leg.
- **Trade-off:** shield mass and size vs power generation; short, intense data collection vs a downlink running at hundreds of kb/s for months.
- **Real:** Parker 685 kg including 130 kg propellant, 384 W at encounter, 11.43 cm carbon-composite shield 2.3 m wide tested near 1,400 C, closest approach 3.8 million miles from the surface (NASA Science, June 2026), perihelion 6.86 million km, ~11-day encounter and 77-158 days of downlink, Ka-band 34 W TWTA, 167 kb/s at 1 AU (NSSDCA).
- **Derived:** irradiance at 6.86 million km (0.0459 AU) is 647,000 W/m2, about 475 times Earth.
- **Assumptions:** heliocentric body model (needs a non-planet "body"), thermal limit, orbit period; cost unverified.

---

## Notes for implementation priority

Start with 11 (Earth LEO), 6 (Mercury), 8 (Bennu) and 7 (Dawn): they need only new body rows plus an irradiance-dependent array efficiency. Scenarios 4, 5 and 10 require elliptical orbit support (Phase 2 in `NASA_DATA_PLAN.md`). Scenario 9 and 10 need a radiation and shielding mechanic with a relative dose index until NASA absolute doses are sourced. Scenario 12 needs a heliocentric body and a thermal mechanic.
