// Body registry: every destination the engine can orbit.
// Source: docs/plan/bodies.json (NASA/JPL research pass, verified 2026-11-05) plus the original Moon and Mars
// snapshots in nasa.js (verified 2026-10-06 and 2026-10-10). Pure data, no imports, no network.
//
// Provenance rules
// - Every numeric field has an entry in `provenance` with a url, a kind and a verification date.
//   kind: 'direct'      read from a NASA/JPL page
//         'derived'     arithmetic on sourced numbers (the note says which)
//         'assumption'  a GAME ASSUMPTION; there is no NASA number behind it
// - `unverified: true` means no NASA source was found. The UI must show these as "game assumption".
// - Moon and Mars values are byte-for-byte the constants the game has always used.
//
// Orbit model for every body: circular two-body period and the central cylindrical-shadow eclipse bound
// (see catalog.js). Gravity-field perturbations, drag, third bodies and elliptical orbits are not modelled.

const V = '2026-11-05';
const url = {
  jplSats: 'https://ssd.jpl.nasa.gov/sats/phys_par/',
  jplPlanets: 'https://ssd.jpl.nasa.gov/planets/phys_par.html',
  naifGm: 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc',
  horizons: 'https://ssd.jpl.nasa.gov/api/horizons.api',
  fact: n => `https://nssdc.gsfc.nasa.gov/planetary/factsheet/${n}fact.html`,
  galilean: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/galileanfact_table.html',
  sbdb: n => `https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=${n}&phys-par=1&full-prec=1`,
  nssdca: id => `https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=${id}`
};
// Provenance helper: P(url, kind, note, {verified, unverified})
const USGS_LANDSAT = 'https://pubs.usgs.gov/fs/2019/3008/fs20193008.pdf';
const P = (u, kind, note = '', o = {}) => ({url: u, kind, verified: o.verified || V, unverified: o.unverified === true || kind === 'assumption', note});
const HORIZONS = 'JPL Horizons OBSERVER table, geocentric range (center 500@399), 2026-11-05 to 2056-11-05, 10-day step; minimum and maximum of the samples (true extremes can lie slightly outside).';
const MEAN_NOTE = 'DERIVED GAME REFERENCE: midpoint of the Horizons minimum and maximum, used to normalise the link model. It is not an observed average.';
const A = (note, u = '') => P(u, 'assumption', note, {unverified: true});

export const BODIES = {
  moon: {
    id: 'moon', name: 'Moon', kind: 'moon', host: 'earth', order: 1,
    radius: 1737.4, mu: 4902.800, solarIrradiance: 1361,
    earthRange: {near: 363300, mean: 384400, far: 405500}, referenceDistance: 384400,
    altitudeMin: 50, altitudeMax: 200, defaultAltitude: 100,
    launchAltMax: {rideshare: 150, dedicated: 200},
    heliocentricAu: 1.0,
    colors: {surface: '#b9b7b0', accent: '#e3e1da', atmosphere: null},
    directorWeather: {kind: 'particle', title: 'Solar particle event', solar: 1, quality: 0.5, duration: 45, from: 70, span: 90},
    hazards: {
      thermal: 'Equatorial diurnal range 95 K to 390 K (fact sheet).',
      atmosphere: 'None, so no drag.',
      radiation: 'Solar particle events apply; no body-specific figure was read.',
      gravity: 'Mascons make low circular orbits unstable (GRAIL results); the game keeps the circular approximation.'
    },
    realReference: {mission: 'lro', note: 'LRO ~30 x 180 km science phase; GRAIL ~50-55 km.'},
    provenance: {
      radius: P(url.jplSats, 'direct', 'Mean radius 1,737.4 km.', {verified: '2026-10-06'}),
      mu: P(url.jplSats, 'direct', 'GM 4,902.800 km^3/s^2.', {verified: '2026-10-06'}),
      solarIrradiance: P(url.fact('moon'), 'direct', 'Earth solar constant at the Moon.', {verified: '2026-10-06'}),
      earthRangeNear: P(url.fact('moon'), 'direct', 'Mean perigee distance. Horizons range over 30 years is 356,740 to 406,663 km.', {verified: '2026-10-06'}),
      earthRangeMean: P(url.fact('moon'), 'direct', 'Semimajor axis, the reference link distance.', {verified: '2026-10-06'}),
      earthRangeFar: P(url.fact('moon'), 'direct', 'Mean apogee distance.', {verified: '2026-10-06'}),
      altitudeMin: A('The existing game range. Real references: LRO ~30 x 180 km, GRAIL ~50-55 km.', url.nssdca('2009-031A')),
      altitudeMax: A('The existing game range.', url.nssdca('2009-031A')),
      launchAltMax: A('Launch-vehicle envelope: educational assumption.')
    }
  },
  mars: {
    id: 'mars', name: 'Mars', kind: 'planet', host: 'sun', order: 2,
    radius: 3389.5, mu: 42828.37362, solarIrradiance: 586.2,
    earthRange: {near: 54600000, mean: 225000000, far: 400200000}, referenceDistance: 225000000,
    altitudeMin: 200, altitudeMax: 1000, defaultAltitude: 400,
    launchAltMax: {rideshare: 600, dedicated: 1000},
    heliocentricAu: 1.52366231,
    colors: {surface: '#cc5c38', accent: '#e08a63', atmosphere: '#d9a07a'},
    directorWeather: {kind: 'dust', title: 'Regional dust storm', solar: 0.4, quality: 1, duration: 90, from: 60, span: 80},
    hazards: {
      thermal: 'Mean about 214 K; Viking 1 diurnal 184-242 K (fact sheet).',
      atmosphere: '6.36 mb mean surface pressure; drag matters only near 125-150 km, below this game range.',
      radiation: 'Not modelled; no NASA figure was read.',
      dust: 'Regional dust storms cut solar power; NASA opacity statistics were not read, so storm size is a game assumption.'
    },
    realReference: {mission: 'mro', note: 'MRO 255 x 320 km; Odyssey ~400 km polar; MAVEN 150 km periapsis.'},
    provenance: {
      radius: P(url.jplPlanets, 'direct', 'JPL mean radius 3389.50 km.', {verified: '2026-11-06'}),
      mu: P(url.jplSats, 'direct', 'GM from MAR097 (NAIF gm_de440 BODY499_GM = 42828.37362).', {verified: '2026-10-10'}),
      solarIrradiance: P(url.fact('mars'), 'direct', 'Fact-sheet mean; no perihelion or aphelion split.', {verified: '2026-10-10'}),
      earthRangeNear: P('https://science.nasa.gov/mars/mars-relay-network/', 'direct', 'Near range scenario from the NASA relay page. Horizons 30-year minimum is 56,175,217 km.', {verified: '2026-10-10'}),
      earthRangeMean: A('Teaching reference range: a game choice used to normalise the link model, not an observed average.'),
      earthRangeFar: P('https://science.nasa.gov/mars/mars-relay-network/', 'direct', 'Far range scenario from the NASA relay page. Horizons 30-year maximum is 400,078,568 km.', {verified: '2026-10-10'}),
      altitudeMin: A('The existing game range. Real references: MRO 255 x 320 km, Odyssey ~400 km.', 'https://mars.nasa.gov/files/mro/MRO-060303.pdf'),
      altitudeMax: A('The existing game range.', 'https://mars.nasa.gov/files/mro/MRO-060303.pdf'),
      launchAltMax: A('Launch-vehicle envelope: educational assumption.')
    }
  },
  earth: {
    id: 'earth', name: 'Earth (low orbit)', kind: 'planet', host: 'sun', order: 3,
    radius: 6371.0, mu: 398600.4355, solarIrradiance: 1361,
    // Ground-station slant range for a 705 km circular orbit at 90, 30 and 10 degrees elevation (geometry; elevations are game choices).
    earthRange: {near: 705, mean: 1245, far: 2165}, referenceDistance: 1245,
    altitudeMin: 400, altitudeMax: 1000, defaultAltitude: 705,
    launchAltMax: {rideshare: 800, dedicated: 1000},
    heliocentricAu: 1.00000011,
    colors: {surface: '#2f6fb3', accent: '#5fa5e6', atmosphere: '#8cc4ff'},
    directorWeather: {kind: 'particle', title: 'Radiation belt enhancement', solar: 1, quality: 0.6, duration: 40, from: 70, span: 90},
    hazards: {
      thermal: 'Not modelled.',
      atmosphere: 'Drag decays low orbits; the game range starts at 400 km and ignores drag.',
      radiation: 'Van Allen belt dose not read from a NASA source; the director-level event is a game assumption.',
      sunSynchronous: 'Real Earth observers use sun-synchronous orbits that can avoid most eclipse; the central-shadow model overstates eclipse here.'
    },
    realReference: {mission: 'landsat-9', note: 'Landsat 9 705 km, 98.2 degrees, 99 min; PACE 676.5 km, 98 degrees.'},
    provenance: {
      radius: P(url.jplPlanets, 'derived', 'JPL mean radius 6371.0084 km, rounded to 6371.0 km for the game.', {verified: '2026-11-06'}),
      mu: P(url.naifGm, 'direct', 'BODY399_GM = 398600.4355 (fact sheet prints 0.39860e6).'),
      solarIrradiance: P(url.fact('earth'), 'direct', 'Solar constant.'),
      earthRangeNear: P(USGS_LANDSAT, 'derived', 'Geometry: slant range straight overhead for a 705 km orbit (Landsat 9 altitude). Elevation is a game choice.'),
      earthRangeMean: P(USGS_LANDSAT, 'derived', 'Geometry: slant range at 30 degrees elevation for a 705 km orbit. Elevation is a game choice.'),
      earthRangeFar: P(USGS_LANDSAT, 'derived', 'Geometry: slant range at 10 degrees elevation for a 705 km orbit. The elevation mask is a game choice; real station masks were not read.', {}),
      altitudeMin: A('Game range for low Earth orbit. Real references: Landsat 9 705 km (USGS), PACE 676.5 km (NTRS).', 'https://pubs.usgs.gov/fs/2019/3008/fs20193008.pdf'),
      altitudeMax: A('Game range for low Earth orbit.', 'https://pubs.usgs.gov/fs/2019/3008/fs20193008.pdf'),
      launchAltMax: A('Launch-vehicle envelope: educational assumption.')
    }
  },
  mercury: {
    id: 'mercury', name: 'Mercury', kind: 'planet', host: 'sun', order: 4,
    radius: 2439.4, mu: 22031.8686, solarIrradiance: 9082.7,
    earthRange: {near: 82743606, mean: 149939142, far: 217134678}, referenceDistance: 149939142,
    altitudeMin: 200, altitudeMax: 2000, defaultAltitude: 400,
    launchAltMax: {rideshare: 1000, dedicated: 2000},
    heliocentricAu: 0.38709893,
    colors: {surface: '#8f8a85', accent: '#c9c2b8', atmosphere: null},
    directorWeather: {kind: 'thermal', title: 'Sunward heat load', solar: 0.7, quality: 0.85, duration: 100, from: 60, span: 80, aftermath: 0.95},
    hazards: {
      thermal: 'Mean surface 440 K; 590-725 K on the sunward side (fact sheet). Irradiance is about 6.7 times Earth (derived).',
      atmosphere: 'Surface-bounded exosphere, no drag (fact sheet).',
      radiation: 'No NASA figure was read.'
    },
    realReference: {mission: 'messenger', note: 'MESSENGER 200 x 15,193 km, 80 degrees, 12 h (elliptical, not modelled).'},
    provenance: {
      radius: P(url.jplPlanets, 'direct', 'JPL mean radius 2439.4 km; do not confuse with equatorial radius 2440.53 km.', {verified: '2026-11-06'}),
      mu: P(url.naifGm, 'direct', 'BODY199_GM.'),
      solarIrradiance: P(url.fact('mercury'), 'direct', 'Single printed value; no perihelion or aphelion split.'),
      earthRangeNear: P(url.horizons, 'derived', HORIZONS),
      earthRangeMean: P(url.horizons, 'assumption', MEAN_NOTE),
      earthRangeFar: P(url.horizons, 'derived', HORIZONS),
      altitudeMin: A('Game range. Real reference: MESSENGER 200 km periapsis (elliptical).', url.nssdca('2004-030A')),
      altitudeMax: A('Game range.', url.nssdca('2004-030A')),
      launchAltMax: A('Launch-vehicle envelope: educational assumption.')
    }
  },
  venus: {
    id: 'venus', name: 'Venus', kind: 'planet', host: 'sun', order: 5,
    radius: 6051.8, mu: 324858.592, solarIrradiance: 2601.3,
    earthRange: {near: 39812857, mean: 149673064, far: 259533270}, referenceDistance: 149673064,
    altitudeMin: 300, altitudeMax: 2000, defaultAltitude: 400,
    launchAltMax: {rideshare: 1000, dedicated: 2000},
    heliocentricAu: 0.72333199,
    colors: {surface: '#d9b36a', accent: '#f0d48f', atmosphere: '#f3dca0'},
    directorWeather: {kind: 'thermal', title: 'Cloud-top heat and infrared load', solar: 0.8, quality: 0.9, duration: 90, from: 60, span: 80},
    hazards: {
      thermal: 'Mean surface 737 K, 92 bar (fact sheet). The spacecraft stays in orbit.',
      atmosphere: '96.5 percent CO2 (fact sheet). Magellan aerobraked to a circular orbit in 1993; the game starts from the mapping orbit.',
      radiation: 'No NASA figure was read.'
    },
    realReference: {mission: 'magellan', note: 'Magellan 294 x 8,463 km, 85.5 degrees, 243-day cycles (elliptical, not modelled).'},
    provenance: {
      radius: P(url.jplPlanets, 'direct', 'JPL mean radius 6051.8 km.', {verified: '2026-11-06'}),
      mu: P(url.naifGm, 'direct', 'BODY299_GM.'),
      solarIrradiance: P(url.fact('venus'), 'direct', 'Fact-sheet value.'),
      earthRangeNear: P(url.horizons, 'derived', HORIZONS),
      earthRangeMean: P(url.horizons, 'assumption', MEAN_NOTE),
      earthRangeFar: P(url.horizons, 'derived', HORIZONS),
      altitudeMin: A('Game range. Real reference: Magellan 294 km periapsis.', 'https://nssdc.gsfc.nasa.gov/planetary/magellan.html'),
      altitudeMax: A('Game range.', 'https://nssdc.gsfc.nasa.gov/planetary/magellan.html'),
      launchAltMax: A('Launch-vehicle envelope: educational assumption.')
    }
  },
  ceres: {
    id: 'ceres', name: 'Ceres', kind: 'dwarf_planet', host: 'sun', order: 6,
    radius: 469.7, mu: 62.6284, solarIrradiance: 177.9,
    earthRange: {near: 237166778, mean: 414486017, far: 591805255}, referenceDistance: 414486017,
    altitudeMin: 375, altitudeMax: 1000, defaultAltitude: 375,
    launchAltMax: {rideshare: 600, dedicated: 1000},
    heliocentricAu: 2.765552595034094,
    colors: {surface: '#8a8780', accent: '#d8d4cb', atmosphere: null},
    directorWeather: {kind: 'particle', title: 'Solar particle event', solar: 1, quality: 0.5, duration: 45, from: 70, span: 90},
    hazards: {
      power: 'Sunlight is about 13 percent of Earth (derived); Dawn arrays gave 1.3 kW end of life at 3 AU (NSSDCA).',
      gravity: 'Dawn flew a 375 km circular orbit; the 13,500 km first science orbit is outside the game range because its period would exceed the campaign.',
      radiation: 'No NASA figure was read.'
    },
    realReference: {mission: 'dawn', note: 'Dawn first science orbit 13,500 km, final circular 375 km.'},
    provenance: {
      radius: P(url.jplPlanets, 'direct', 'JPL dwarf-planet table: mean radius 469.7 km; equatorial radius is 482.1 km.', {verified: '2026-11-06'}),
      mu: P(url.sbdb(1), 'direct', 'GM 62.6284 km^3/s^2 from SBDB (Nature 537:515); NAIF gm_de440 prints 62.6289.'),
      solarIrradiance: P(url.sbdb(1), 'derived', 'DERIVED 1361 / a^2 at a = 2.7656 AU (perihelion 210.1, aphelion 152.6 W/m^2). No NASA printed value was read.'),
      earthRangeNear: P(url.horizons, 'derived', HORIZONS),
      earthRangeMean: P(url.horizons, 'assumption', MEAN_NOTE),
      earthRangeFar: P(url.horizons, 'derived', HORIZONS),
      altitudeMin: P(url.nssdca('2007-043A'), 'direct', 'Dawn final circular orbit 375 km.'),
      altitudeMax: A('Game limit: higher circular orbits have periods too long for a game campaign. Real first science orbit 13,500 km.', url.nssdca('2007-043A')),
      launchAltMax: A('Launch-vehicle envelope: educational assumption.')
    }
  },
  vesta: {
    id: 'vesta', name: 'Vesta', kind: 'asteroid', host: 'sun', order: 7,
    radius: 261.385, mu: 17.2882844, solarIrradiance: 244.1,
    earthRange: {near: 170474768, mean: 353488878, far: 536502988}, referenceDistance: 353488878,
    altitudeMin: 210, altitudeMax: 450, defaultAltitude: 210,
    launchAltMax: {rideshare: 350, dedicated: 450},
    heliocentricAu: 2.361365965127599,
    colors: {surface: '#a39a8c', accent: '#d9d0c0', atmosphere: null},
    directorWeather: {kind: 'particle', title: 'Solar particle event', solar: 1, quality: 0.5, duration: 45, from: 70, span: 90},
    hazards: {
      power: 'Sunlight is about 18 percent of Earth (derived).',
      gravity: 'Irregular figure (569 x 554 x 453 km); the game uses a sphere of the mean radius.',
      radiation: 'No NASA figure was read.'
    },
    realReference: {mission: 'dawn', note: 'Dawn survey 2,750 km (69 h), 680 km (12.3 h), 210 km (4.3 h).'},
    provenance: {
      radius: P(url.sbdb(4), 'derived', 'Derived: SBDB diameter 522.77 km divided by 2.'),
      mu: P(url.sbdb(4), 'direct', 'GM 17.2882844 km^3/s^2 from SBDB (2025 value); NAIF gm_de440 prints 17.2882329.'),
      solarIrradiance: P(url.sbdb(4), 'derived', 'DERIVED 1361 / a^2 at a = 2.3614 AU (perihelion 294.9, aphelion 205.4 W/m^2).'),
      earthRangeNear: P(url.horizons, 'derived', HORIZONS),
      earthRangeMean: P(url.horizons, 'assumption', MEAN_NOTE),
      earthRangeFar: P(url.horizons, 'derived', HORIZONS),
      altitudeMin: P(url.nssdca('2007-043A'), 'direct', 'Dawn low-altitude orbit 210 km (4.3 h).'),
      altitudeMax: A('Game limit: Dawn also flew 680 km and 2,750 km, whose periods (12.3 h, 69 h) exceed a game campaign.', url.nssdca('2007-043A')),
      launchAltMax: A('Launch-vehicle envelope: educational assumption.')
    }
  },
  europa: {
    id: 'europa', name: 'Europa', kind: 'moon', host: 'jupiter', order: 8,
    radius: 1560.8, mu: 3202.7121, solarIrradiance: 50.26,
    earthRange: {near: 591393871, mean: 778425660, far: 965457448}, referenceDistance: 778425660,
    altitudeMin: 25, altitudeMax: 200, defaultAltitude: 100,
    launchAltMax: {rideshare: 100, dedicated: 200},
    heliocentricAu: 5.20336301,
    colors: {surface: '#d8cdb8', accent: '#9a6b4f', atmosphere: null},
    directorWeather: {kind: 'radiation', title: 'Jupiter radiation belt pass', solar: 1, quality: 0.4, duration: 60, from: 50, span: 90, aftermath: 0.85},
    hazards: {
      radiation: 'Europa is bathed in radiation trapped in Jupiter\'s magnetic field; Europa Clipper electronics expect a few thousand to tens of thousands of rads per flyby even with a vault of aluminum-zinc up to 9.2 mm (JPL press kit). The game uses a relative event, not a dose.',
      thermal: 'Mean -170 C (Galilean fact table).',
      power: 'Sunlight is 50.26 W/m^2 at Jupiter, 3.7 percent of Earth; Clipper arrays give at least 700 W through the prime mission.',
      gravity: 'Orbiting Europa is not planned by NASA and Jupiter makes low circular orbits unstable. The game flies a circular orbit as a stand-in for the Clipper flyby tour.'
    },
    realReference: {mission: 'europa-clipper', note: 'Europa Clipper flies nearly 50 flybys as low as 25 km; it never orbits Europa.'},
    simplification: 'Circular orbit stand-in for a flyby tour. Real Clipper does not orbit Europa.',
    provenance: {
      radius: P(url.jplSats, 'direct', 'Mean radius 1,560.8 km.'),
      mu: P(url.jplSats, 'direct', 'GM from JUP365.'),
      solarIrradiance: P(url.fact('jupiter'), 'direct', 'Jupiter fact-sheet value used for the Jovian system.'),
      earthRangeNear: P(url.horizons, 'derived', HORIZONS),
      earthRangeMean: P(url.horizons, 'assumption', MEAN_NOTE),
      earthRangeFar: P(url.horizons, 'derived', HORIZONS),
      altitudeMin: P('https://science.nasa.gov/mission/europa-clipper/mission-overview/', 'direct', 'Europa Clipper minimum flyby altitude 25 km.'),
      altitudeMax: A('Game limit. The real maximum flyby altitude was not read from a NASA source.', 'https://science.nasa.gov/mission/europa-clipper/mission-overview/'),
      launchAltMax: A('Launch-vehicle envelope: educational assumption.')
    }
  }
};

export const BODY_IDS = Object.keys(BODIES);
export const DEFAULT_BODY = 'moon';
// The two destinations of the original game; share codes of format v1 may only name these.
export const LEGACY_BODY_IDS = ['moon', 'mars'];
export const isBodyId = id => typeof id === 'string' && Object.hasOwn(BODIES, id);
export const getBody = id => (isBodyId(id) ? BODIES[id] : null);
export const listBodies = () => BODY_IDS.map(id => BODIES[id]);

// Bodies considered and deliberately not shipped, with the honest reason (also in docs/ENGINE_BODIES.md).
export const SKIPPED_BODIES = [
  {id: 'phobos', reason: 'GM 7.1e-4 km^3/s^2 and Mars perturbation make a Keplerian circular orbit meaningless; no NASA orbiter has orbited it and no altitude range was sourced.'},
  {id: 'bennu', reason: 'GM 4.9e-9 km^3/s^2 gives a period of about 35 hours at 1 km; the once-per-orbit contact model and a few-hour campaign cannot represent it. Non-gravitational forces dominate.'},
  {id: 'ganymede', reason: 'No NASA orbit altitude range was sourced and the sunlight at Jupiter is the same problem as Europa; Europa covers that teaching case.'},
  {id: 'titan', reason: 'Sunlight is 14.8 W/m^2 at Saturn, so a solar kit is not feasible (Cassini used RTGs), the minimum safe altitude over the thick atmosphere was not sourced, and the game has no RTG class.'}
];

// Data and asset credits the UI can show verbatim. NASA insignia are not used; NASA does not endorse this game.
export const ATTRIBUTION = [
  {id: 'nssdc', name: 'NASA NSSDC Planetary Fact Sheets', url: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/', use: 'Radius, solar irradiance, Earth distance scenarios for the Moon and Mars; surface and atmosphere notes.', credit: 'Data: NASA Goddard Space Flight Center, NSSDC.'},
  {id: 'jpl-ssd', name: 'JPL Solar System Dynamics (physical parameters, SBDB, Horizons)', url: 'https://ssd.jpl.nasa.gov/', use: 'Body GM and radius, small-body parameters, Earth range minimum and maximum over 2026 to 2056.', credit: 'Data: NASA/JPL-Caltech Solar System Dynamics. Snapshots taken at development time; the game never calls these services.'},
  {id: 'naif', name: 'NAIF generic kernels (gm_de440.tpc)', url: 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/pck/gm_de440.tpc', use: 'Gravitational parameters for Mercury, Venus, Earth and Mars.', credit: 'Data: NASA/JPL NAIF.'},
  {id: 'nssdca', name: 'NASA NSSDCA spacecraft catalog', url: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/', use: 'Real mission masses, orbits and power used in the real-mission comparison.', credit: 'Data: NASA NSSDCA.'},
  {id: 'nasa-science', name: 'NASA Science mission pages and JPL press kits', url: 'https://science.nasa.gov/', use: 'Mission phases, Europa Clipper and Juno design facts, Dawn, MESSENGER, Magellan, GRAIL, PACE.', credit: 'Source: NASA Science and NASA/JPL press kits.'},
  {id: 'usgs', name: 'USGS Landsat 9 fact sheet', url: 'https://pubs.usgs.gov/fs/2019/3008/fs20193008.pdf', use: 'Landsat 9 orbit (705 km, 98.2 degrees, 99 min).', credit: 'Source: U.S. Geological Survey, Fact Sheet 2019-3008.'},
  {id: 'gold', name: 'GSFC-STD-1000 Rev I (GOLD Rules)', url: 'https://standards.nasa.gov/system/files/tmp/GSFC-STD-1000RevI_Approved_0.pdf', use: 'Mass and power margin policy used for readiness hints.', credit: 'Standard: NASA Goddard Space Flight Center.'},
  {id: 'smallsat', name: 'NASA SmallSat State-of-the-Art', url: 'https://www.nasa.gov/smallsat-institute/sst-soa/', use: 'Solar cell efficiency, specific power and propulsion ranges as concept references.', credit: 'Source: NASA Small Spacecraft Systems Virtual Institute.'},
  {id: 'disclaimer', name: 'No endorsement', url: 'https://www.nasa.gov/nasa-brand-center/images-and-media/', use: 'NASA content is used under the NASA media usage guidelines. The NASA insignia are not used. This game is not endorsed by or affiliated with NASA, and its hardware, credits and scores are fictional educational assumptions.', credit: 'NASA acknowledged as the source of data. Not an official NASA product.'}
];

// Numeric fields that must carry provenance (also used by the registry integrity test).
export const PROVENANCE_FIELDS = ['radius', 'mu', 'solarIrradiance', 'earthRangeNear', 'earthRangeMean', 'earthRangeFar', 'altitudeMin', 'altitudeMax', 'launchAltMax'];

// Rows for a data panel: value, unit, source URL, verified date and an honest label. `label` for unverified rows reads "game assumption".
const ROW_DEFS = [
  ['radius', 'Mean radius', 'km', b => b.radius, 'Circular orbit radius and period'],
  ['mu', 'Gravitational parameter (GM)', 'km³/s²', b => b.mu, 'Orbital period and speed'],
  ['solarIrradiance', 'Solar irradiance at the body', 'W/m²', b => b.solarIrradiance, 'Array output = irradiance × area × efficiency'],
  ['earthRangeNear', 'Earth range, near scenario', 'km', b => b.earthRange.near, 'Near communication scenario'],
  ['earthRangeMean', 'Earth range, reference', 'km', b => b.earthRange.mean, 'Reference link distance'],
  ['earthRangeFar', 'Earth range, far scenario', 'km', b => b.earthRange.far, 'Far communication scenario'],
  ['altitudeMin', 'Lowest game orbit altitude', 'km', b => b.altitudeMin, 'Orbit selector minimum'],
  ['altitudeMax', 'Highest game orbit altitude', 'km', b => b.altitudeMax, 'Orbit selector maximum']
];
export function bodyRows(id) {
  const b = getBody(id);
  if (!b) return [];
  return ROW_DEFS.map(([key, label, unit, get, use]) => {
    const p = b.provenance[key];
    const unverified = p.unverified === true;
    return {id: key, label: unverified ? `${label} · GAME ASSUMPTION` : label, value: get(b), unit, use, source: p.kind, kind: p.kind, url: p.url, verifiedOn: p.verified, unverified, note: p.note};
  });
}
