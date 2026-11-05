// Mission board data: scenarios, difficulty tiers and the four crew roles.
// Values are educational assumptions; each scenario states what it changes.
export const SCENARIOS = {
  'lunar-polar': {
    id: 'lunar-polar', destination: 'moon', title: 'Lunar Polar Mapper', tag: 'Beginner · Moon',
    summary: 'Map the Moon’s polar regions from a 100 km orbit and bring the observations home.',
    budget: 150, scienceTarget: 650, referenceAltitude: 100, polarExp: 1, altitudeExp: 1, weather: null, critical: 'data',
    why: 'Teaches the core loop: power, storage and the contact link all limit science.'
  },
  'lunar-ice': {
    id: 'lunar-ice', destination: 'moon', title: 'Lunar Ice Hunter', tag: 'Intermediate · Moon',
    summary: 'Search permanently shadowed craters for water ice. Needs a near-polar, low orbit, and a solar particle event can strike mid-campaign.',
    budget: 140, scienceTarget: 600, referenceAltitude: 75, polarExp: 2, altitudeExp: 1.5, critical: 'mass',
    weather: { kind: 'particle', title: 'Solar particle event', solar: 1, quality: 0.5, duration: 45, from: 70, span: 90 },
    why: 'Orbit geometry matters more: inclination and altitude drive science value.'
  },
  'mars-polar': {
    id: 'mars-polar', destination: 'mars', title: 'Mars Polar Mapper', tag: 'Advanced · Mars',
    summary: 'Map Mars’s polar caps with weaker sunlight and a much longer Earth link.',
    budget: 150, scienceTarget: 650, referenceAltitude: 400, polarExp: 1, altitudeExp: 1, weather: null, critical: 'comms',
    why: 'Same engineering, harder constraints: Mars receives 43% of lunar sunlight.'
  },
  'mars-dust': {
    id: 'mars-dust', destination: 'mars', title: 'Mars Dust Season', tag: 'Expert · Mars',
    summary: 'A regional dust storm dims the Sun during the campaign. Power margin decides whether you keep observing.',
    budget: 150, scienceTarget: 560, referenceAltitude: 400, polarExp: 1, altitudeExp: 1, critical: 'power',
    weather: { kind: 'dust', title: 'Regional dust storm', solar: 0.4, quality: 1, duration: 90, from: 60, span: 80 },
    why: 'Teaches energy margin under changing environmental conditions.'
  },
  // ---- NASA-grounded destinations (engine v7). Each says which numbers are real, derived or game assumptions. ----
  'earth-observer': {
    id: 'earth-observer', destination: 'earth', title: 'Earth Observer on a Clock', tag: 'Beginner · Earth',
    summary: 'Image land from a Landsat-class orbit near 705 km. Sunlight is plentiful, but the ground station is only overhead for a short pass each orbit.',
    subtitle: 'Many short orbits. Make every pass count.',
    budget: 150, scienceTarget: 650, referenceAltitude: 705, polarExp: 1, altitudeExp: 1, weather: null, critical: 'data',
    duration: 300, contactMinutes: 12,
    realMission: 'landsat-9',
    why: 'Teaches that an observer in low orbit circles the Earth about every 99 minutes, so it cycles its battery through shadow dozens of times and can only send data in short ground passes.',
    assumptions: 'Ground-pass length (12 minutes, unverified) and the 300-minute campaign are game assumptions. Real Earth observers fly sun-synchronous orbits that avoid most eclipse; the central-shadow model overstates it here. Inclinations are folded to 0-90 degrees (Landsat 9 flies 98.2).',
    realNumbers: [
      {label: 'Landsat 9 orbit', value: '705 km, 98.2°, 99 min, 14 orbits per day', source: 'https://pubs.usgs.gov/fs/2019/3008/fs20193008.pdf'},
      {label: 'PACE orbit and instrument', value: '676.5 km, 98.3 min; OCI 260 kg / 280 W', source: 'https://ntrs.nasa.gov/citations/20190030760'},
      {label: 'Eclipse battery cycles', value: 'about 5,300 per year (derived from the 99 min period)', source: 'https://pubs.usgs.gov/fs/2019/3008/fs20193008.pdf'}
    ]
  },
  'mercury-thermal': {
    id: 'mercury-thermal', destination: 'mercury', title: 'Mercury Thermal Squeeze', tag: 'Advanced · Mercury',
    summary: 'Map Mercury from a low orbit. Sunlight is nearly seven times Earth’s, so power is easy and heat is the enemy: a sunshade costs mass and a sunward heat load can strike mid-campaign.',
    subtitle: 'Plenty of sunlight. Survive it.',
    budget: 150, scienceTarget: 600, referenceAltitude: 200, polarExp: 1, altitudeExp: 1, critical: 'mass',
    duration: 240, arrayEfficiency: 0.12, thermalMass: 30,
    weather: {kind: 'thermal', title: 'Sunward heat load', solar: 0.5, quality: 0.8, duration: 100, from: 60, span: 80},
    realMission: 'messenger',
    why: 'Teaches that more sunlight is not always better: heat limits the arrays and instruments, and thermal protection takes mass away from propellant and payload.',
    assumptions: 'Array efficiency 12% (arrays are turned off the Sun and run hot) and the 30 kg sunshade are game assumptions; hardware temperature limits were not read from a NASA source. The heat-load event (power to 50%, observations 80% as useful) is a game assumption. Real MESSENGER flew a 12-hour elliptical orbit; the game flies a circular one.',
    realNumbers: [
      {label: 'Mercury sunlight', value: '9,082.7 W/m² (about 6.7 times Earth)', source: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html'},
      {label: 'Sunward surface', value: '590-725 K', source: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html'},
      {label: 'MESSENGER', value: '485.2 kg dry, 607.8 kg propellant, 450 W at Mercury, 200 x 15,193 km orbit', source: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2004-030A'}
    ]
  },
  'venus-radar': {
    id: 'venus-radar', destination: 'venus', title: 'Venus Radar Cycles', tag: 'Advanced · Venus',
    summary: 'Map Venus through its clouds with a radar-class imager. Power is abundant, but the data are heavy and every orbit passes through a long shadow.',
    subtitle: 'Cloud-piercing radar. A flood of data.',
    budget: 150, scienceTarget: 700, referenceAltitude: 300, polarExp: 1, altitudeExp: 1, weather: null, critical: 'data',
    duration: 360, contactMinutes: 20,
    realMission: 'magellan',
    why: 'Teaches that coverage is limited by how fast data can reach Earth, the lesson of Magellan, which returned 1,200 Gbit over 4,225 radar orbits.',
    assumptions: 'The 20-minute contact, the 360-minute campaign and the 700 science-unit target are game assumptions. Real Magellan flew an elliptical 294 x 8,463 km orbit and aerobraked to a circular one in 1993; the game flies a circular orbit. Venus has an atmosphere that the game does not model.',
    realNumbers: [
      {label: 'Venus sunlight', value: '2,601.3 W/m² (1.9 times Earth)', source: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html'},
      {label: 'Magellan', value: '3,445 kg launch, 85.5°, 243-day cycles, 98% coverage, 1,200 Gbit returned', source: 'https://nssdc.gsfc.nasa.gov/planetary/magellan.html'}
    ]
  },
  'dawn-vesta': {
    id: 'dawn-vesta', destination: 'vesta', title: 'Dawn at Vesta', tag: 'Advanced · Vesta',
    summary: 'Orbit the asteroid Vesta at Dawn’s 210 km altitude. Sunlight is 18% of Earth’s, so the arrays must be much larger, and a 4-hour orbit leaves few contacts.',
    subtitle: 'Weak sunlight. Few windows to call home.',
    budget: 150, scienceTarget: 600, referenceAltitude: 210, polarExp: 1, altitudeExp: 1, weather: null, critical: 'power',
    duration: 600, arrayScaleMax: 4,
    realMission: 'dawn',
    why: 'Teaches the power-versus-distance trade: at 2.4 AU the same array makes about one fifth of the power, so power systems grow heavy.',
    assumptions: 'The array may be scaled up to 4 times the standard kit (game assumption; Dawn’s arrays produced 10.3 kW at 1 AU and 1.3 kW at 3 AU). The 600-minute campaign covers about 2.3 orbits at 210 km. Vesta is modelled as a sphere of its mean radius; the real figure is irregular.',
    realNumbers: [
      {label: 'Dawn orbits at Vesta', value: '2,750 km (69 h), 680 km (12.3 h), 210 km (4.3 h)', source: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2007-043A'},
      {label: 'Sunlight at Vesta', value: '244 W/m² (derived 1361 / a²)', source: 'https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=4&phys-par=1&full-prec=1'},
      {label: 'Dawn power', value: '10.3 kW at 1 AU; 1.3 kW end of life at 3 AU', source: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2007-043A'}
    ]
  },
  'dawn-ceres': {
    id: 'dawn-ceres', destination: 'ceres', title: 'Dawn at Ceres', tag: 'Expert · Ceres',
    summary: 'Orbit the dwarf planet Ceres at 375 km. Sunlight is 13% of Earth’s and a 5-hour orbit leaves very few chances to send data home.',
    subtitle: 'The far end of the belt.',
    budget: 150, scienceTarget: 560, referenceAltitude: 375, polarExp: 1, altitudeExp: 1, weather: null, critical: 'power',
    duration: 720, arrayScaleMax: 5,
    realMission: 'dawn',
    why: 'Teaches that deep-space missions are power-starved and contact-starved at the same time.',
    assumptions: 'The array may be scaled up to 5 times the standard kit (game assumption). The 720-minute campaign covers about 2.2 orbits at 375 km. The Dawn ion engine is not modelled; the chemical thruster classes stay.',
    realNumbers: [
      {label: 'Dawn at Ceres', value: 'first science orbit 13,500 km; final circular 375 km', source: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2007-043A'},
      {label: 'Sunlight at Ceres', value: '178 W/m² (derived 1361 / a²)', source: 'https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=1&phys-par=1&full-prec=1'}
    ]
  },
  'europa-flyby': {
    id: 'europa-flyby', destination: 'europa', title: 'Europa Clipper-style Orbiter', tag: 'Expert · Europa',
    summary: 'Study Europa from a low circular orbit as a stand-in for the Europa Clipper flyby tour. Sunlight is 3.7% of Earth’s and Jupiter’s radiation belts will strike.',
    subtitle: 'Tiny sunlight. Brutal radiation.',
    budget: 150, scienceTarget: 500, referenceAltitude: 50, polarExp: 1, altitudeExp: 1, critical: 'power',
    duration: 240, arrayScaleMax: 10, thermalMass: 25,
    weather: {kind: 'radiation', title: 'Jupiter radiation belt pass', solar: 1, quality: 0.4, duration: 60, from: 50, span: 90},
    realMission: 'europa-clipper',
    why: 'Teaches the extreme end of the power trade, and that radiation, not distance, can limit a mission.',
    assumptions: 'The array may be scaled up to 10 times the standard kit and the radiation event (observations 40% as useful, stored data at risk) is a relative game assumption; no dose in rads is modelled. The 25 kg thermal and radiation mass is a game assumption. Real Europa Clipper never orbits Europa: it flies nearly 50 flybys as low as 25 km, so this circular orbit is a simplification.',
    realNumbers: [
      {label: 'Europa Clipper', value: '5,800 kg at launch, 2,750 kg propellant, 102 m² arrays, at least 700 W at Jupiter, vault up to 9.2 mm', source: 'https://www.jpl.nasa.gov/press-kits/europa-clipper/quick-facts/'},
      {label: 'Real array efficiency', value: '14% of gross area at Jupiter (700 W / 102 m² / 50.26 W/m²)', source: 'https://www.jpl.nasa.gov/press-kits/europa-clipper/quick-facts/'},
      {label: 'Sunlight at Jupiter', value: '50.26 W/m²', source: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html'}
    ]
  }
};
export const DEFAULT_SCENARIO = { moon: 'lunar-polar', mars: 'mars-polar', earth: 'earth-observer', mercury: 'mercury-thermal', venus: 'venus-radar', vesta: 'dawn-vesta', ceres: 'dawn-ceres', europa: 'europa-flyby' };

export const DIFFICULTY = {
  cadet: { id: 'cadet', label: 'Cadet', blurb: 'More budget, forgiving objective, coaching on.', budgetScale: 1.25, deadlineScale: 1.25, success: 70, weather: false, factors: { solar: 1, link: 1 } },
  engineer: { id: 'engineer', label: 'Engineer', blurb: 'The standard mission.', budgetScale: 1, deadlineScale: 1, success: 80, weather: false, factors: { solar: 1, link: 1 } },
  director: { id: 'director', label: 'Flight Director', blurb: 'Tighter budget, 85% objective, degraded environment and a space-weather event.', budgetScale: 0.92, deadlineScale: 0.9, success: 85, weather: true, factors: { solar: 0.94, link: 0.9 } }
};

// Roles for 1–4 players. Each role owns subsystems and one lens on readiness.
export const ROLES = {
  commander: { id: 'commander', label: 'Mission Commander', short: 'Commander', owns: ['launch'], lens: ['budget', 'mass', 'schedule', 'launchOrbit'], crisis: [], blurb: 'Owns budget and the launch vehicle. Casts the deciding vote.' },
  engineer: { id: 'engineer', label: 'Spacecraft Engineer', short: 'Engineer', owns: ['bus', 'propulsion'], lens: ['compatibility', 'deltaV', 'pointing'], crisis: ['propulsion'], blurb: 'Owns the bus and propulsion. Guards structure, pointing and maneuver reserve.' },
  science: { id: 'science', label: 'Science Lead', short: 'Science', owns: ['payload'], lens: ['orbit', 'pointing'], crisis: ['weather'], blurb: 'Owns the instrument and orbit choice. Defends scientific value.' },
  power: { id: 'power', label: 'Power & Comms Officer', short: 'Power/Comms', owns: ['power', 'comms', 'storage'], lens: ['power', 'eclipse', 'data', 'recorder'], crisis: ['eclipse', 'storage', 'link'], blurb: 'Owns power, communications and the recorder. Keeps the spacecraft alive and the data flowing.' }
};
export const ROLE_ORDER = ['commander', 'engineer', 'science', 'power'];
