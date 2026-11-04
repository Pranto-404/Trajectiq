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
    weather: { kind: 'dust', title: 'Regional dust storm', solar: 0.6, quality: 1, duration: 70, from: 60, span: 80 },
    why: 'Teaches energy margin under changing environmental conditions.'
  }
};
export const DEFAULT_SCENARIO = { moon: 'lunar-polar', mars: 'mars-polar' };

export const DIFFICULTY = {
  cadet: { id: 'cadet', label: 'Cadet', blurb: 'More budget, forgiving objective, coaching on.', budgetScale: 1.25, deadlineScale: 1.25, success: 70, weather: false, factors: { solar: 1, link: 1 } },
  engineer: { id: 'engineer', label: 'Engineer', blurb: 'The standard mission.', budgetScale: 1, deadlineScale: 1, success: 80, weather: false, factors: { solar: 1, link: 1 } },
  director: { id: 'director', label: 'Flight Director', blurb: 'Tighter budget, 85% objective, degraded environment and a space-weather event.', budgetScale: 0.92, deadlineScale: 0.9, success: 85, weather: true, factors: { solar: 0.94, link: 0.9 } }
};

// Roles for 1–4 players. Each role owns subsystems and one lens on readiness.
export const ROLES = {
  commander: { id: 'commander', label: 'Mission Commander', short: 'Commander', owns: ['launch'], lens: ['budget', 'mass'], crisis: [], blurb: 'Owns budget and the launch vehicle. Casts the deciding vote.' },
  engineer: { id: 'engineer', label: 'Spacecraft Engineer', short: 'Engineer', owns: ['bus', 'propulsion'], lens: ['compatibility', 'deltaV', 'pointing'], crisis: ['propulsion'], blurb: 'Owns the bus and propulsion. Guards structure, pointing and maneuver reserve.' },
  science: { id: 'science', label: 'Science Lead', short: 'Science', owns: ['payload'], lens: ['orbit', 'pointing'], crisis: ['weather'], blurb: 'Owns the instrument and orbit choice. Defends scientific value.' },
  power: { id: 'power', label: 'Power & Comms Officer', short: 'Power/Comms', owns: ['power', 'comms', 'storage'], lens: ['power', 'eclipse', 'data', 'recorder'], crisis: ['eclipse', 'storage', 'link'], blurb: 'Owns power, communications and the recorder. Keeps the spacecraft alive and the data flowing.' }
};
export const ROLE_ORDER = ['commander', 'engineer', 'science', 'power'];
