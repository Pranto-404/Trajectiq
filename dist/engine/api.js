// Public engine API for the React UI: one import point. Everything here is pure and offline.
// See docs/ENGINE_BODIES.md for the contract. Nothing in this file adds behaviour to the engine itself except the
// read-only scenario and preset helpers at the bottom.
import {SCENARIOS, DEFAULT_SCENARIO, DIFFICULTY} from '../data/scenarios.js';
import {BODIES, getBody} from '../data/bodies.js';
import {presetFor, missionFor, neededScience} from '../data/catalog.js';

export {BODIES, BODY_IDS, DEFAULT_BODY, LEGACY_BODY_IDS, SKIPPED_BODIES, ATTRIBUTION, PROVENANCE_FIELDS, getBody, listBodies, isBodyId, bodyRows} from '../data/bodies.js';
export {REAL_MISSIONS, REAL_MISSIONS_VERIFIED, REAL_MISSIONS_CONVENTIONS, PROPELLANT_FRACTIONS, ODYSSEY_SUBSYSTEMS, GOLD_RULES, REAL_ARRAY_EFFICIENCY, getRealMission, missionsFor} from '../data/real-missions.js';
export {SCENARIOS, DEFAULT_SCENARIO, DIFFICULTY, ROLES, ROLE_ORDER} from '../data/scenarios.js';
export {nasaDataset, distanceOptions, datasetCSV, DISTANCES} from '../data/nasa.js';
export {CATALOG, CATEGORIES, MISSION, PRESETS, SOURCES, sourcesFor, UNCERTAINTY, VERSION, missionFor, presetFor, neededScience, developmentMonths, orbitPeriodMinutes, shadowMinutes, ARRAY_EFFICIENCY, ARRAY_SCALE_MAX} from '../data/catalog.js';
export {calculate, normalize, newRun, advance, resolve, runToEnd, robustness, diagnose, debrief, pareto, linkEnvironment, rocketDeltaV, components, clone, clamp, seededRandom} from './model.js';
export {reviewDecisions, forecastDirections, forecastRanges, roleAdvice, missionScore, crewScore, scoreParts} from './review.js';
export {assignRoles, canEdit, ownerOf, roleVerdicts, signoffAllowed, tallyVotes, summarizeCrew, FIELD_OWNER, EXPERT_FOR, categoryName, partName} from './crew.js';
export {encodeDesign, decodeDesign, verifyDesign} from './share.js';
export {answerQuestion, HELP_TOPICS, decisionAnswer} from './assistant.js';
export {advancedAnswer, designPreview, reviewDesign, EXPERIMENT_FIELDS} from './copilot.js';

export const PRESET_KEYS = ['balanced', 'resilient', 'fragile'];

// Scenario to body mapping.
export const bodyForScenario = id => (SCENARIOS[id] ? BODIES[SCENARIOS[id].destination] : null);
export const scenariosForBody = bodyId => Object.values(SCENARIOS).filter(s => s.destination === bodyId).map(s => s.id);

// Preset factory by scenario: { balanced, resilient, fragile } complete designs that normalize() accepts unchanged.
export function presetsForScenario(id) {
  const s = SCENARIOS[id];
  if (!s) return null;
  return Object.fromEntries(PRESET_KEYS.map(k => [k, {...presetFor(s.destination, k, id), scenario: id}]));
}

// Cards for the mission board, in display order (original four first, then by body distance from Earth's neighbourhood).
// Every card is built from SCENARIOS and BODIES, so a new scenario appears automatically.
export function listScenarios({difficulty = 'engineer'} = {}) {
  return Object.values(SCENARIOS).map(s => {
    const body = getBody(s.destination), m = missionFor({destination: s.destination, scenario: s.id, difficulty});
    return {
      id: s.id, title: s.title, tag: s.tag, summary: s.summary, subtitle: s.subtitle || null, why: s.why,
      destination: s.destination, body: {id: body.id, name: body.name, colors: body.colors, order: body.order},
      isDefaultForBody: DEFAULT_SCENARIO[s.destination] === s.id,
      budget: m.budget, scienceTarget: s.scienceTarget, scienceNeeded: neededScience(m), durationMinutes: m.duration,
      altitudeRange: [m.altitudeMin, m.altitudeMax], referenceAltitude: s.referenceAltitude, arrayScaleMax: m.arrayScaleMax,
      contactMinutes: m.contactMinutes, critical: s.critical, weather: m.weather ? {kind: m.weather.kind, title: m.weather.title} : null,
      realMission: s.realMission || body.realReference?.mission || null, realNumbers: s.realNumbers || [], assumptions: s.assumptions || '',
      simplification: body.simplification || null, presets: PRESET_KEYS
    };
  });
}
