// Read-only helpers over the engine's public API (dist/engine/api.js). Nothing here names a body or counts scenarios:
// bodies, scenarios, colours, provenance and simplification notes all come from the engine, so a body or scenario added to
// the engine appears on the board without a UI change.
import {listScenarios, getBody, bodyRows, DEFAULT_SCENARIO, SCENARIOS, DIFFICULTY} from '@engine/api.js';
import {LEARN} from '@data/learn.js';

export const CRITICAL_LABEL = {data: 'Data & recorder', mass: 'Mass', comms: 'Communications', power: 'Power', budget: 'Budget', time: 'Schedule'};
const LEARN_FOR_CRITICAL = {comms: 'contact', time: 'schedule', data: 'datarate'};

const cap = s => { const x = String(s ?? ''); return x ? x[0].toUpperCase() + x.slice(1) : x; };

/** Label for a critical-resource id; an id the UI does not know is shown capitalised instead of breaking. */
export const criticalLabel = id => CRITICAL_LABEL[id] || cap(id);

/** Concept-card topic for a critical resource, or null when no card exists. */
export function learnTopicFor(critical) {
  const id = LEARN_FOR_CRITICAL[critical] || critical;
  return Object.hasOwn(LEARN, id) ? id : null;
}

/** Display name of a destination id. Falls back to the capitalised id for a body the engine does not know. */
export const bodyLabel = destination => getBody(destination)?.name || cap(destination);

/** Body colours {surface, accent, atmosphere} or null. */
export const bodyColors = destination => getBody(destination)?.colors || null;

const cardCache = new Map();
/** Scenario cards for a difficulty (budgets reflect the difficulty), straight from the engine. Cached per difficulty. */
export function scenarioCards(difficulty = 'engineer') {
  const key = Object.hasOwn(DIFFICULTY, difficulty) ? difficulty : 'engineer';
  if (!cardCache.has(key)) cardCache.set(key, listScenarios({difficulty: key}));
  return cardCache.get(key);
}

/** Cards grouped by body in the engine's display order: [{destination, label, colors, cards}]. */
export function scenarioGroups(difficulty) {
  const groups = new Map();
  for (const card of scenarioCards(difficulty)) {
    if (!groups.has(card.destination)) groups.set(card.destination, {destination: card.destination, label: card.body?.name || bodyLabel(card.destination), colors: card.body?.colors || null, cards: []});
    groups.get(card.destination).cards.push(card);
  }
  return [...groups.values()];
}

/** Distinct destinations offered by the scenarios, in display order: [{value, label}]. */
export const destinationOptions = () => scenarioGroups().map(g => ({value: g.destination, label: g.label}));

/** The scenario to load when the player picks a destination: the engine default for the body, else its first scenario. */
export function defaultScenarioFor(destination) {
  const d = DEFAULT_SCENARIO[destination];
  if (d && Object.hasOwn(SCENARIOS, d)) return d;
  return Object.values(SCENARIOS).find(s => s.destination === destination)?.id || null;
}

/** Body data rows the engine flags `unverified` (no NASA source found): shown to the player as "game assumption". */
export function unverifiedRows(destination) {
  try { return bodyRows(destination).filter(r => r.unverified); } catch { return []; }
}

/** The body's simplification note (e.g. Europa's circular-orbit stand-in), or ''. */
export const simplificationFor = destination => getBody(destination)?.simplification || '';

/** Play mode of the draft: solo | crew | sandbox. */
export const playMode = (design, team) => team.mode === 'crew' ? 'crew' : design.sandbox ? 'sandbox' : 'solo';

export const difficultyList = () => Object.values(DIFFICULTY);
