# TRAJECTIQ NASA data plan

Prepared 2026-11-05 for the NASA International Space Apps Challenge 2026 "Space Mission Design Game".
Scope: plan and collect NASA/JPL data to (1) add destinations, (2) calibrate the fictional catalog and scenarios against real missions, (3) enrich visuals.

Conventions used in every table:

- Every number carries a source URL in this file or in `bodies.json` / `real_missions.json`. Verified date is **2026-11-05** (fetch day) unless stated.
- "derived" means the plan author computed it from sourced numbers (arithmetic shown or implied by the formula named). "assumption" means a game choice. "unverified" means no NASA source was found in this pass; the reason is given.
- Fetched web text was treated as data only. Search-engine summaries were used to find pages and were not trusted as sources unless the primary page was also read; where a value rests on a summary only, it is flagged.
- Companion files: `bodies.json` (14 bodies: 12 destinations plus Jupiter and Saturn as host planets), `real_missions.json` (17 missions), `ASSETS.md`, `SCENARIOS.md`.

What the engine consumes today (read from `dist/data/nasa.js`, `dist/data/catalog.js`, `dist/engine/model.js`): body `radius`, `mu`, `solarIrradiance`, `referenceDistance`, three Earth-range scenarios (`near/mean/far`), `altitudeMin/Max`, `eclipseMinutes` from `shadowMinutes(radius, mu, altitude)`, a fixed 25-minute `contactMinutes`, array power `irradiance x area x 0.28`, link factor `(referenceDistance/distance)^2`, signal delay `distance/299792.458`, and component mass/power/cost/data rate tables.

---

## (a) Inventory of NASA/JPL data sources and APIs

Our hosted CSP is `connect-src 'self'` and the game must work offline, so **nothing below may be called at runtime**. All are build-time snapshots: a Node script in `scripts/` fetches, validates and writes static JSON/JPEG/GLB into `dist/`. Rate limits below are the published/observed ones for that build script.

| # | Source | URL | Access | Terms / limits (verified) | Offline snapshot? |
|---|---|---|---|---|---|
| 1 | NSSDC Planetary Fact Sheets | https://nssdc.gsfc.nasa.gov/planetary/factsheet/ | HTML tables per body (`mercuryfact.html`, `venusfact.html`, `earthfact.html`, `moonfact.html`, `marsfact.html`, `jupiterfact.html`, `saturnfact.html`, `galileanfact_table.html`). Scrape at build. | NASA media guidelines (below). Page "Last Updated" dates seen: Mercury/Venus/Moon 2024-01-11, Earth 2024-11-15, Mars 2025-05-19, Jupiter 2024-10-02, Saturn 2025-03-18, Galilean table 2016-04-18. No stated rate limit; be polite (1 req/s). `satfact.html` returned 404 so Titan/Phobos are not covered by this source. | Yes. Store value + `lastUpdated` + URL. |
| 2 | JPL SSD physical parameters | https://ssd.jpl.nasa.gov/sats/phys_par/ (satellites), https://ssd.jpl.nasa.gov/planets/phys_par.html (planets) | HTML tables. Satellite page lists GM and mean radius with 1-sigma and source codes (DE440, MAR097, JUP365, SAT441). Planet page lists masses (not GM) and IAU 2015 radii; Change Log latest 2019-12-12. | NASA guidelines. Cite Archinal et al. 2018 (Celest. Mech. 130:22) for radii. | Yes. |
| 3 | NAIF `gm_de440.tpc` | https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc | Plain-text SPICE PCK. Best single file for GM: Mercury 22031.8686, Venus 324858.592, Earth 398600.4355, Moon 4902.8001, Mars 42828.3736, Ceres 62.6289, Vesta 17.2882 (file dated 2022-12-14, DE440, Park et al. 2021 AJ 161:105). | NAIF public; no limits stated. | Yes. Parse `BODYnnn_GM`. |
| 4 | SSD/CNEOS **SBDB API** (small bodies) | https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=1&phys-par=1&full-prec=1 | JSON. Tested for Ceres (`sstr=1`), Vesta (`4`), Bennu (`2101955`): returns orbit elements (a, e, q, Q, period) and `phys_par` (GM, diameter, rot_per, extent, albedo) with per-field references. | **SSD API Fair Use Policy** (https://ssd-api.jpl.nasa.gov/): one request at a time, descriptive User-Agent with contact, handle rate limits with backoff, **"You may not embed these APIs in your website (per NASA CORS policy)"**, formats may change (check `version`), no availability guarantee. | Yes, build-time only. This policy is the legal reason runtime calls are out. |
| 5 | **Horizons API** | https://ssd.jpl.nasa.gov/api/horizons.api (doc https://ssd-api.jpl.nasa.gov/doc/horizons.html) | GET with `COMMAND`, `EPHEM_TYPE=OBSERVER`, `QUANTITIES='20'` (range), `CENTER='500@399'`, `format=json`; also `VECTORS`, `SPK`, `APPROACH`. Used 2026-11-05 for 13 bodies, 1,096 samples each, 2026-11-05..2056-11-05 at 10 d (output signature version 1.2). | Same SSD Fair Use Policy. All 13 requests succeeded sequentially with 2 s spacing. | Yes. Output is `docs/plan/bodies.json` `earth_range_km`. Re-run script annually. |
| 6 | Other SSD/CNEOS APIs | https://ssd-api.jpl.nasa.gov/ lists: Fireball, Horizons, Horizons File, Horizons Lookup, JD converter, **NHATS**, Periodic Orbits, **SB Close Approach**, SB Identification, **SB Mission Design**, SB Observability, SB Radar, SB Satellites, SBDB, SBDB Query, Scout, Sentry | JSON | Same policy | Candidates only: NHATS/SB Mission Design for "reachable asteroid" scenario selection; CAD for Bennu-class close approaches. Not tested. |
| 7 | **DONKI** space weather (CCMC) | https://ccmc.gsfc.nasa.gov/DONKI/WS/get/{SEP\|FLR\|CME\|GST\|...}?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD | JSON, **no API key**; tested 2026-11-05. **Hard limit: date range must be <= 60 days** (server error "Date range cannot exceed 60 days"). Harvested SEP and FLR 2011-01-01..2026-10-31 in 97 chunks each, 0 failed. | "Rules of the Road" (https://ccmc.gsfc.nasa.gov/tools/DONKI/): data are "prototyping quality and in research context"; asks that studies be done with knowledge and collaboration of submitters/CCMC; see CCMC publication policy. The api.nasa.gov mirror (`https://api.nasa.gov/DONKI/...`) returned HTTP 503 upstream timeout on 2026-11-05 and its key-limit page is JavaScript-rendered, so DEMO_KEY limits are **unverified** (one 503 response carried `X-Ratelimit-Limit: 10`). | Yes. Store aggregated statistics, not raw events. Results in section (b). |
| 8 | NASA Image and Video Library API | https://images-api.nasa.gov/search?q=...&media_type=image | JSON, no key; HTTP 200 on 2026-11-05 | NASA media guidelines; per-asset credit lines vary. Rate limit unverified. | Use only at build time to pick images; ship local copies. |
| 9 | **Solar System Treks** | https://trek.nasa.gov/ ; WMTS tiles e.g. `https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{row}/{col}.jpg` and `.../Mercury/EQ/Mercury_MESSENGER_MDIS_Basemap_BDR_Mosaic_Global_166m/...` | 256 px JPEG tiles; layout verified: level z has 2^z rows x 2^(z+1) columns (level 2 = 2048x1024). I stitched Mercury level 2 and it renders correctly. Capabilities XML at `.../1.0.0/WMTSCapabilities.xml`. | Portal terms not fetched: **unverified**; data are PDS/USGS products. | Yes: stitch level 2 or 3 at build time, down-convert to JPEG. |
| 10 | **USGS Astropedia / planetarymaps.usgs.gov** | https://astrogeology.usgs.gov/search?... e.g. `https://planetarymaps.usgs.gov/mosaic/Ceres_Dawn_FC_DLR_global_20ppd_Oct2015.tif` | GeoTIFF. HEAD verified 2026-11-05: Ceres 400 m mosaic 27,280,830 bytes; Vesta HAMO 60 m mosaic 356,659,263 bytes; Mercury MDIS BDR 166 m 4,247,470,901 bytes. | Astropedia pages say cite authors; listed public domain (search summary of Bennu pages; individual terms not all read). | Yes, downsample once at build, do not ship. |
| 11 | **NASA SVS** CGI Moon Kit | https://svs.gsfc.nasa.gov/4720/ | Direct files: `lroc_color_poles_1k.jpg` 1024x512 139,068 B, `lroc_color_2k.jpg` 2048x1024 447 KB, `ldem_3_8bit.jpg` 1024x512 111,552 B (HEAD checked). Page last updated 2026-01-09. | NASA guidelines. | Yes. |
| 12 | **Visible Earth / Blue Marble NG** | https://visibleearth.nasa.gov/images/73909/december-blue-marble-next-generation-w-topography-and-bathymetry | `https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/december/world.topo.bathy.200412.3x5400x2700.jpg` = 2,566,770 bytes (HEAD checked). The old `eoimages.gsfc.nasa.gov` path no longer resolves. | NASA guidelines. | Yes (downscale). |
| 13 | **NASA 3D Resources** | https://github.com/nasa/NASA-3D-Resources (and https://nasa3d.arc.nasa.gov) | GitHub contents API lists 227 model folders (`.glb` + preview `.png`) and "Images and Textures". Repo `pushed_at` 2025-06-03. | README: "free and without copyright"; points to the NASA usage guidelines. GitHub metadata shows **no license file**. | Yes: copy selected GLBs; see ASSETS.md for sizes. |
| 14 | NSSDCA Master Catalog (spacecraft pages) | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2009-031A | HTML | Worked for 10 of the 12 IDs tried; **returned "An error has occurred" for Cassini (1997-061A) and Magellan (1989-033B)** on 2026-11-04/05. Several pages carry internal conflicts (see `real_missions.json` notes). | Scrape once; store with conflict notes. |
| 15 | JPL press kits and NASA mission pages | e.g. https://www.jpl.nasa.gov/press-kits/europa-clipper/quick-facts/, https://science.nasa.gov/mission/lucy/spacecraft/ | HTML | NASA guidelines | Hand-curate into `real_missions.json`. |
| 16 | DESCANSO Design & Performance Summary Series | https://descanso.jpl.nasa.gov/DPSummary/ (Juno `Juno_DESCANSO_Post121106H--Compact.pdf`, Odyssey `odyssey_telecom.pdf`) | PDF | NASA/JPL public | Source of real link rates (Juno 10 bps-200 kbps X-band; Odyssey UHF 8/32/128/256 kb/s). |
| 17 | GSFC-STD-1000 Rev I (GOLD Rules) | https://standards.nasa.gov/system/files/tmp/GSFC-STD-1000RevI_Approved_0.pdf | PDF; **approved 2025-08-19, expires 2030-08-19**; Table 1.06-1 read directly. | Public NASA standard | Source of margin policy (section c). |
| 18 | NASA SmallSat State-of-the-Art | https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/ and `/in_space_propulsion/` | HTML | NASA | Source of efficiency (~30%), specific power (~30 W/kg), Isp ranges. |
| 19 | NTRS | https://ntrs.nasa.gov/citations/20190030760 (PACE) | PDF/API | NASA | Gap-filler for instrument masses (OCI 260 kg / 280 W). |
| 20 | Not fetched / candidates | DSN Now and DSN Link Design Handbook 810-005 (deepspace.jpl.nasa.gov/dsndocs/810-005/), PDS (pds.nasa.gov), NASA Eyes on the Solar System, NASA Earthdata | - | **Unverified: not fetched in this pass.** | Evaluate in Phase 3. |

NASA media usage guidelines (https://www.nasa.gov/nasa-brand-center/images-and-media/, fetched 2026-11-05): NASA content, including "texture maps and polygon data" used for 3-D models, "generally are not subject to copyright in the United States"; may be used for educational/informational purposes including "computer graphical simulations and Internet Web pages"; "NASA should be acknowledged as the source"; the NASA insignia, logotype and identifiers "are not in the public domain"; no implied endorsement; third-party copyrighted items are marked and need their own permission. A separate section for AI products says NASA does not permit attributing model outputs to NASA ("according to NASA") nor putting the NASA Meatball/Worm/Seal beside AI-generated imagery (relevant if TRAJECTIQ ever adds LLM-written text).

---

## (b) Data source to game mechanic / visual mapping

| Source (row above) | Data | Game mechanic or visual | Engine hook |
|---|---|---|---|
| 1, 2, 3 | radius, GM, mean radius per body | Orbit period, speed, shadow time; body size on the HUD | `MISSION.radius/mu` -> per-body table `BODIES[id]` consumed by `missionFor` |
| 1 | solar irradiance W/m2: Mercury 9082.7, Venus 2601.3, Earth/Moon 1361.0, Mars 586.2, Jupiter 50.26, Saturn 14.82 | Array output and the **power-vs-distance trade**; bodies without a printed value (Ceres/Vesta/Bennu) use derived 1361/a^2 | `calculate`: `c.power.solar = irradiance*area*eff` |
| 1 | surface temperature ranges (Moon 95-390 K, Mars ~214 K mean, Venus 737 K, Mercury 590-725 K sunward, Europa -170 C mean) | Thermal-load crisis and heater/radiator trade (new) | new `thermal` block on body |
| 5 Horizons | geocentric range min/max per body over 30 years (Mars 56.2e6-400.1e6 km, Venus 39.8e6-259.5e6, Mercury 82.7e6-217.1e6, Jupiter 591.5e6-965.2e6, Saturn 1.2016e9-1.6494e9, Ceres 237.2e6-591.8e6, Vesta 170.5e6-536.5e6, Bennu 5.9e6-350.1e6 km) | Near/mean/far distance scenarios, signal delay readout, link-margin factor `(ref/d)^2`; replaces hand-picked ranges. Light time 3.1-22.2 min for Mars (derived from the Horizons range) is a core teaching number | `distanceOptions`, `linkEnvironment` |
| 4 SBDB | a, e, q, Q, rotation period, GM, diameter | Heliocentric distance changes irradiance across the orbit (Bennu 1.36 to 0.90 AU = 740 to 1692 W/m2, derived); day length for ground contact | new `heliocentric` block |
| 7 DONKI | SEP 493 raw records, **131 independent episodes** (clustered, 3-day gap) 2011-2026; X-class flares 156 and M-class 2,609 (note duplicates) | Replace the fixed "Solar particle event" crisis with a frequency-driven one: expected 8.3 SEP episodes/yr average, 15-17 in 2012-2014, 22 in 2024, 0-1 in 2016/2020; seed per-mission draw from yearly rate | `missionFor.weather`, scenario `weather` |
| 8, 9, 10, 11, 12 | textures, DEMs | Planet sphere, orbit-picker thumbnails, landing-zone maps | `dist/assets/`, see ASSETS.md |
| 13 | 3-D GLB of LRO, MRO, MAVEN, Juno, Cassini, Dawn, MESSENGER, Magellan, OSIRIS-REx, Parker, Odyssey, Landsat 8, Aqua, Galileo, Bennu shape | Hangar/launch view and "your spacecraft is like this one" cards | `dist/assets/models/` |
| 14, 15, 16 | real mass/power/data/cost budgets | Component-catalog calibration; "real mission comparison" panel after scoring; scenario numbers | `CATALOG`, `SCENARIOS` |
| 17 | GSFC-STD-1000 margins | Readiness check thresholds (mass 15/10/5/2 %, power 25/20/15/10/5 %) | readiness `checks[]` in `calculate` |
| 16 | Real link rates and band | Comms component classes (UHF relay 8-256 kb/s, X-band deep space 10 bps-200 kb/s at Jupiter, Ka-band LEO/lunar 100-300 Mb/s) | `CATALOG.comms` |

### DONKI statistics collected (this pass, `ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP` and `/FLR`)

Window 2011-01-01 to 2026-10-31. SEP records per calendar year: 2011:25, 2012:41, 2013:31, 2014:27, 2015:10, 2016:2, 2017:13, 2018-2019:0, 2020:2, 2021:13, 2022:40, 2023:75, 2024:119, 2025:60, 2026 (to Oct):35. Clustering records within 3 days into episodes gives 131 episodes (2011:12, 2012:17, 2013:15, 2014:15, 2015:6, 2016:1, 2017:6, 2020:1, 2021:4, 2022:6, 2023:10, 2024:22, 2025:10, 2026:6). Flare records by GOES class letter: X 156, M 2,609, C 581, B 46, A 1; X-class per year peaks at 54 in 2024.

Caveats that must be shown in-game as "unverified model": (1) DONKI is a notification/event log, not a uniform survey: record counts jump in 2022-2025 because more instruments and models submit entries, and M-class counts show duplication (2014: 199, 2024: 982), so use X-class and the clustered SEP episodes for frequency; (2) the SEP schema returns `sepID`, `eventTime`, `instruments` (e.g. "GOES-P: SEISS >10 MeV", "STEREO A: IMPACT 13-100 MeV"), `linkedEvents` and no peak flux, so **event magnitude distribution is unverified**; a magnitude draw needs the NOAA S-scale (not NASA, not fetched) or a deeper DONKI field (not available in this endpoint); (3) coverage is from the primary catalog start in 2020 plus retroactive entries by the SWRC team, so 2011-2019 rates are lower bounds.

### Consistency checks run on the data (evidence the numbers are right)

Using the engine's own formula `period = 2 pi sqrt((R+h)^3/GM)` with GM and R from the files above: Vesta 210 km gives 4.30 h and 2,750 km gives 69.4 h (Dawn published 4.3 h and 69 h); GRAIL 50 km gives 113.0 min (published 113 min); Landsat 705 km gives 98.7 min (published 99 min); PACE 676.5 km gives 98.1 min (published 98.3 min); MRO mean 287 km gives 112.8 min (published 112); MESSENGER 12 h period needs a 10,136 km semimajor axis, i.e. apoapsis altitude ~15,200 km (NSSDCA 15,193 km). These are strong validation of the GM/radius table. A fact for the game: the engine's central cylindrical-shadow minutes at the lowest altitude are 36 (Earth 400 km), 43 (Mars 200 km), 48 (Moon 50 km), 36 (Mercury 200 km), 37 (Venus 300 km), 61 (Ceres 375 km), 48 (Vesta 210 km) minutes; note that sun-synchronous dawn-dusk orbits like Landsat/PACE can avoid most eclipse, which the central model does not represent.

---

## (c) How real missions are designed, as design rules we can encode

Each rule lists the evidence and how to encode it. **Verified** means read in a NASA document today.

1. **Mass margin by maturity** (GSFC-STD-1000 Rev I, Table 1.06-1, verified): >15% pre-SRR and at SRR, >10% at PDR, >5% at CDR, >2% at SIR, 0 at launch. Margin is `(allowable - predicted)/basic` on **dry mass only**; propellant is handled as delta-V margin (3-sigma). Encode: readiness check "mass margin" with scenario-dependent phase (easy scenarios use the >10% PDR rule); our current checks have no margin concept.
2. **Power margin against end-of-life capacity**: >25% pre-Phase A, >20% Phase A, >15% Phase B, >10% Phase C, >5% Phase D, plus 5% predicted at launch for mission-critical, cruise and safing modes (same table). Margin = `(available - estimated)/available`. Encode: compute EOL array power (apply degradation) and show margin; flag below 10%.
3. **RF link margin**: >3 dB for NSN direct-to-Earth and >0 dB for SN/SR at Phases A-B, tightening to >1 dB at Phase C and E (same table). Encode: link margin = 10 log10 of the `(referenceDistance/distance)^2` factor already computed; add a +/-3 dB band for "marginal".
4. **Effective solar array conversion is far below cell efficiency.** Game uses `irradiance x area x 0.28`; NASA SmallSat SOA quotes a nominal 30% (high 34%) for 3-5 junction cells and ~30 W/kg specific power (https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/). Real arrays vs gross area (derived from sourced figures): Juno 14 kW at Earth from 60 m2 = 17% and 400 W at Jupiter = 13%; Europa Clipper 23 kW from ~102 m2 = 17% and 700 W minimum at Jupiter = 14%; MRO ~1,000 W at Mars from 20 m2 = 8.5% (power wording unverified). Encode: apply a packing/sun-angle/degradation factor of ~0.6 to the 0.28 (giving ~17%) and an extra low-intensity penalty (x0.8) beyond ~3 AU. The same data show why Jupiter solar missions need huge arrays.
5. **Propellant is about half of launch mass for chemical orbiters.** Derived fractions: Odyssey 48%, MRO 53%, Cassini 55%, MESSENGER 56%, Juno 56%, MAVEN 67%, OSIRIS-REx 58%, Europa Clipper 47%; electric: Dawn 39%, Psyche 40%; small: GRAIL 34%; planetary-observer LEO: PACE 14%; solar probe Parker 19%. The game's `maxFuel` of 70-90 kg against ~100 kg dry (40-45%) is a defensible mid-point. Encode: show "propellant fraction" with a real-mission band.
6. **Isp ranges**: hydrazine monopropellant 180-285 s (typically 200-235 s for >=1 N thrusters), alternative mono/bipropellants 150-310 s, Hall 200-1,920 s, gridded ion 500-3,000 s (NASA SmallSat SOA Table 4-1). Dawn ion: 3,200 to 1,900 s, 92 mN at 2.6 kW (NSSDCA). The game's 225 s / 310 s chemical choices sit inside this range; add an electric class whose thrust is power-limited ("below 75 mN/kW" per SOA) to model the Dawn/Psyche trade.
7. **Eclipse sizing and battery cycles.** Eclipse minutes come from orbit geometry (our model); real LEO observers cycle the battery ~5,300 times a year (derived: Landsat 9 period 99 min). Real batteries in the fleet: MRO two 50 A-hr NiH2 at 32 V (1.6 kWh each, derived), MAVEN two 55 A-hr Li-ion, Odyssey 16 A-hr NiH2, Dawn 35 A-hr NiH2. NASA SmallSat SOA gives Li-ion cyclability 2,000-70,000 charges and 5-10 year life. Encode: battery wear = cycles/yr x depth of discharge; the game's 15% safe-mode threshold stays; add a cycle-life warning for LEO scenarios.
8. **Data volume is bounded by contact, not by instrument.** Evidence: Cassini stored data on two ~2 Gbit solid-state recorders and replayed in DSN passes (635 GB over 13 years, 294 orbits); MRO carries 160 Gbit and downlinks up to 6 Mb/s; Magellan returned 1,200 Gbit in 4,225 SAR orbits at 75 m/pixel; Parker records an 11-day encounter then downlinks for 77-158 days at 167 kb/s at 1 AU; Lucy's L'Ralph holds 256 Gbit onboard for a flyby; Juno's telecom design spans 10 bps to 200 kbps; Landsat 9 returns ~750 scenes/day. Encode: the existing contact model is right in spirit; calibrate `storageMax` and `dataMbps` so a 1:20 to 1:100 contact-to-generate ratio appears in outer-planet scenarios.
9. **Contact schedules.** MAVEN communicates in twice-weekly sessions with a pointed HGA; MRO flies 12 orbits/day; Landsat 14 orbits/day. The game's fixed 25 min contact is a simplification. Encode: `contactMinutes` as a function of body and relay: LEO ground pass minutes (unverified; needs a NASA source), Mars relay via Odyssey/MRO (UHF 8-256 kb/s proximity link, verified), deep-space DSN pass hours (unverified).
10. **Radiation: vault mass vs dose.** Juno carries a titanium vault (150 kg per NSSDCA, ~180 kg per another NASA page: conflict). Europa Clipper vault: aluminum-zinc alloy sheets up to 9.2 mm; electronics expect an average of a few thousand to tens of thousands of rads per flyby even with the vault; trajectory limits time in the belts (JPL press kit). Encode a destination radiation level and make `shielding` a catalog item whose mass scales with dose. Absolute krad numbers: **unverified**, use a relative index until sourced.
11. **Thermal**: Parker's carbon-composite shield is 11.43 cm thick, 2.3 m diameter, tested to ~2,500 F (1,400 C), instruments near 85 F; Europa Clipper electronics must survive more than 100 C inner-system heat and about -230 C at Jupiter. Mercury sunward surface 590-725 K, Venus 737 K. Encode a heat-flux check = irradiance / 1361 (Mercury ~6.7x, Parker at 0.0459 AU ~475x, derived 647,000 W/m2 from 6.86 million km).
12. **Orbit choice is a trade, not a number.** MESSENGER used an elliptical 200 km x 15,193 km, 12 h, 80 degree orbit; Magellan 294 x ~8,463 km at 85.5 degrees in 243-day cycles; MAVEN 150 km periapsis; Dawn spiralled through 2,750, 680 and 210 km at Vesta; OSIRIS-REx used ~1 km to 1.75 km orbits and ~240 m flyovers at Bennu. Encode elliptical orbits (periapsis/apoapsis) for scenarios; the circular-only model stays for easy mode.
13. **Mission-phase structure** (verified from NASA pages): Cassini 4-year primary + 2 extensions; MAVEN 1-year primary after 5-week commissioning; MRO 24-month primary (full Mars year); LRO 1-year exploration then science; GRAIL 90-day science; Dawn 14 months at Vesta then Ceres. Encode scenario durations as scaled fractions of primary phases.
14. **Cost realism**: Cassini $3.9 B, Europa Clipper $5.2 B (2015-2034), Juno $1.13 B, MRO ~$720 M, LRO ~$460 M, Dawn $446 M, GRAIL $375 M, OSIRIS-REx ~$800 M (excl. launch), Psyche ~$1.2 B (launch services $131 M). Unit basis is not stated. Encode relative cost bands only; keep game credits fictional.

---

## (d) Phased implementation plan

### Phase 0 (1-2 days): snapshot pipeline and schema

Add `scripts/build-nasa-snapshot.mjs` (Node, build-time only) that (i) fetches rows 1-5 and 7 with the SSD fair-use behaviour (sequential, User-Agent with contact, 2 s spacing, backoff), (ii) validates against a JSON Schema, (iii) writes `dist/data/bodies.js` (ES module, same style as `nasa.js`), `dist/data/missions.js`, `dist/data/spaceweather.js`, and a `snapshot-manifest.json` with URLs and fetch dates. CI fails if a "required" field becomes null. Commit generated files so Vercel never runs the fetcher.

Proposed schemas (mirror `docs/plan/bodies.json`):

```
Body { id, name, kind, host?, radius_km, gm_km3s2, surface_gravity_ms2|null,
       heliocentric:{semimajor_au, perihelion, aphelion}, solar_irradiance_w_m2 + basis,
       earth_range_km:{min,max,basis}, orbit_altitude_km:{min,max,mode,reference_mission},
       hazards:{thermal,radiation,atmosphere,power}, sources:{field:{url,kind,verified}} }
Mission { id, target, launch_mass_kg, dry_mass_kg, propellant_kg, power:{...}, instruments[],
          orbit:{...}, comm:{band,rate,antenna}, cost_musd, lifetime, sources[], unverified[] }
SpaceWeather { sep_episodes_per_year:{year:count}, xflare_per_year:{year:count}, window, caveats }
Scenario { id, bodyId, missionRef, objective, calibrated:{param:{value,source}}, assumptions:[...] }
```

### Phase 1 (3-5 days): generalise destinations, no new physics

Engine changes (all in `dist/data/*` and `dist/engine/model.js`):

- `missionFor(d)` currently branches `d.destination==='mars'`; replace with `BODIES[d.destination]` lookup (radius, mu, irradiance, `altitudeMin/Max`, `referenceDistance`). Keep Moon/Mars numbers identical so existing tests pass.
- `nasaDataset`/`distanceOptions` read `earth_range_km` per body (near = min, far = max, mean = game assumption flagged as such, as Mars does today).
- `ENVELOPE` in `catalog.js` (`rideshare.altMax:{moon,mars}`) becomes per-body; add Mercury, Venus, Earth, Ceres, Vesta, Bennu keys.
- `presetFor` gets per-body defaults (altitude, arrayScale).
- Add bodies in this order: Earth LEO (no light-time; uses ground contact), Mercury, Venus, Ceres, Vesta, Bennu. Titan/Europa/Ganymede/Phobos are flyby/relay variants, defer to Phase 3.

### Phase 2 (1 week): calibrated catalog and realism toggles

- `calculate`: add `effectiveArrayEfficiency` (0.17 at 1 AU) and optional low-intensity penalty; add power margin and mass margin readiness checks (rules 1-2); report EOL power.
- Add `thermal` and `radiation` blocks: heat-flux index `irradiance/1361`; radiation index per body with a `shielding` catalog item.
- Add `orbit: {periapsis, apoapsis}` support in `orbitPeriodMinutes` (semimajor axis `a = R + (rp+ra)/2`) and `shadowMinutes`; keep circular default.
- New catalog classes sized from real subsystems (Odyssey fractions: EPS 23% of dry, telecom 6%, propulsion hardware 13%, C&DH 3%): UHF relay radio, Ka-band LEO downlink, ion thruster (power-limited), vault.
- Space weather: draw SEP episodes from `spaceweather.js` rates by scenario year; X-class flare count drives a "radio blackout" comm penalty (assumption, flagged).

### Phase 3 (2+ weeks): visuals and more targets

- Ship textures and models per ASSETS.md; add a "real comparator" panel after scoring (e.g. "Odyssey carried 725 kg; yours 148 kg").
- Add Europa/Titan/Ganymede/Phobos flyby mode using Clipper (25 km minimum, ~50 flybys) and Cassini (127 Titan flybys) as the model. Source the missing numbers (Titan flyby altitude, Earth ground-pass minutes, DSN pass length) before enabling.
- Evaluate DSN Now / 810-005, PDS instrument tables, NHATS (row 20, 6).

### Test and regression plan

Golden tests that existing Moon and Mars scores do not change; a "snapshot drift" test that diffs a fresh fetch against committed JSON and requires a human to approve changes in GM/radius greater than 1e-6 relative.

---

## (e) Risks and licensing notes

1. **No runtime fetches.** CSP `connect-src 'self'` plus SSD policy ("not embed in your website", CORS) and offline requirement mean snapshots only. Add the manifest to the "Sources" screen (current `SOURCES` array pattern).
2. **Attribution.** Acknowledge NASA/JPL/USGS as source in an in-game credits panel, per the media guidelines. Suggested text is in ASSETS.md. Do **not** use the NASA Meatball/Worm logo or imply NASA endorsement (insignia "not in the public domain"). If any LLM-generated text is shipped, do not attribute it to NASA and do not place NASA insignia near AI-generated imagery.
3. **Source conflicts** (all recorded in `real_missions.json`): MESSENGER launch mass 1,093 kg (NSSDCA) vs 1,107.9 kg (NASA Science); OSIRIS-REx 1,529 kg (NSSDCA) vs 2,110 kg wet and 880 kg dry (press kit); Juno 1,500 kg vs 3,625 kg total and vault 150 vs ~180 kg; MAVEN dry 903 vs 809 kg; Dawn dry 747.1 vs 725 kg; Mars range 401.4e6 (fact sheet) vs 400.2e6 (relay page) vs 400.1e6 (Horizons 30-yr sample); Mercury radius 2439.7 (fact sheet) vs 2439.4 km (JPL); Ceres GM 62.6284 (SBDB) vs 62.6289 (NAIF); Magellan periapsis 294 vs 297 km. Policy: prefer the primary design document (press kit, NASA Facts), show the alternative in a tooltip.
4. **NSSDCA instability.** Two catalog pages errored on 2026-11-04/05 and the site banner reads "Version 5.3.0, 16 October 2026"; keep local copies and treat the catalog as non-authoritative.
5. **Data that are not yet verified** (do not ship as facts): Earth ground-station pass minutes; DSN pass length and G/T; absolute radiation doses (Jupiter, Van Allen); Titan/Phobos/Ganymede orbit altitude limits; SEP magnitude distribution; Mars dust opacity statistics; mission cost for MAVEN, MESSENGER, Magellan, Lucy, Parker, PACE, Landsat 9, Odyssey; Psyche dry mass; Europa Clipper dry mass and comm band; DEMO_KEY limits at api.nasa.gov; Treks portal terms.
6. **DONKI "Rules of the Road"** ask for collaboration and caveat data as prototyping quality; our use is educational aggregate statistics with a visible caveat. Contact CCMC (link on the DONKI page) before claiming scientific accuracy.
7. **Texture pitfalls found** (details in ASSETS.md): the NASA-3D-Resources `Moon.jpg` is an Apollo photograph of the full disk, not a map; the Titan texture is a featureless orange gradient; there is no Mercury folder. Mercury/Vesta/Ceres/Bennu need Treks or USGS products. 3-D models vary from 0.25 MB to 10.5 MB; MAVEN (A) is 10.5 MB and Juno (A) 9.0 MB, too large to ship unprocessed.
8. **Scope risk.** Do Phase 1 first (data table only); physics changes in Phase 2 alter scoring and need balance testing.
9. **Hosting size.** Budget of 6 MB images is easy (see ASSETS.md), but keep GLB under ~3 MB total by shipping 3-4 models and compressing with meshopt/Draco.

## Sources read for this plan (fetched 2026-11-04/05)

NSSDC fact sheets (links in row 1), JPL SSD pages (rows 2, 4, 5), NAIF `gm_de440.tpc`, SSD API fair-use text (https://ssd-api.jpl.nasa.gov/), DONKI (https://ccmc.gsfc.nasa.gov/tools/DONKI/ and the WS endpoints), NASA media guidelines, GSFC-STD-1000 Rev I, NASA SmallSat SOA power and propulsion chapters, NSSDCA spacecraft pages, JPL press kits (Europa Clipper, Psyche, Juno, Cassini), NASA Science mission pages, USGS Landsat 9 fact sheet, NTRS PACE paper, DESCANSO Juno/Odyssey telecom summaries, SVS 4720, Visible Earth 73909, GitHub API for NASA-3D-Resources.
