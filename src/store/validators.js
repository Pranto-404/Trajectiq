// Persistence validators, ported verbatim in behaviour from dist/ui/app.js (v6). They are the only gate between
// localStorage (or a hostile/damaged blob) and the live state: anything they reject is dropped or preserved raw.
import {assignRoles} from '@engine/crew.js';
import {calculate, normalize, newRun} from '@engine/model.js';
import {missionFor, VERSION} from '@data/catalog.js';
import {ROLE_ORDER} from '@data/scenarios.js';

export const SAVE_KEY = 'trajectiq-v1';
export const CHECKPOINT_SCHEMA = 1;
export const MODEL_VERSIONS = ['2.0.0', '3.0.0', '4.0.0', '5.0.0', VERSION];
export const OPERATION_MODES = ['science', 'aggressive', 'coast', 'downlink'];
const CRISIS_IDS = ['propulsion', 'eclipse', 'storage', 'link', 'weather'];
const RECOVERY_IDS = ['nominal', 'wide', 'abort', 'conserve', 'continue', 'downlink', 'compress', 'boost', 'pause', 'wait', 'shield', 'reduce', 'ride'];

/** A completed run from the archive. Rejects wrong model versions, non-finite or negative outcomes, oversized arrays and non-string log fields. */
export const validSavedRun = r => {
  try {
    return !!(r && MODEL_VERSIONS.includes(r.modelVersion) && r.done === true && r.outcome && r.design && typeof r.id === 'string' && typeof r.label === 'string'
      && ['completion', 'cost', 'science', 'returned', 'lostMB', 'safeMinutes', 'retainedMB', 'finalBattery', 'efficiency', 'deltaVRemaining'].every(k => Number.isFinite(r.outcome[k]) && r.outcome[k] >= 0)
      && ['science', 'returned', 'lostMB', 'backlog', 'safeSteps'].every(k => Number.isFinite(r[k]) && r[k] >= 0)
      && ['logs', 'events', 'history', 'seen'].every(k => Array.isArray(r[k]) && r[k].length <= 5000)
      && r.logs.every(x => x && Number.isFinite(x.minute) && ['type', 'title', 'detail'].every(k => typeof x[k] === 'string'))
      && r.events.every(x => x && Array.isArray(x.chain) && x.chain.every(y => typeof y === 'string'))
      && r.history.every(x => x && Number.isFinite(x.battery) && Number.isFinite(x.minute)));
  } catch { return false; }
};

/** Crew session: 1 player is solo; 2-4 players pass the controls and share decisions. */
export function freshTeam(count = 1) {
  return {mode: count > 1 ? 'crew' : 'solo', players: assignRoles(count), active: 0, contributions: [], signed: {}, signedFor: '', concerns0: null, suggestions: [], votes: {}, crises: []};
}

/** Rebuilds a team from untrusted data. Votes and sign-offs never persist; strings are length-limited; roles must exist. */
export function loadTeam(raw) {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return freshTeam(1);
    const count = Array.isArray(raw.players) ? raw.players.length : 1;
    const players = assignRoles(count, (raw.players || []).map(p => p?.name));
    const crew = raw.mode === 'crew' && players.length > 1;
    const idx = Number.isInteger(raw.active) && raw.active >= 0 && raw.active < players.length ? raw.active : 0;
    const ids = new Set(ROLE_ORDER);
    const roleList = a => Array.isArray(a) ? a.filter(x => ids.has(x)) : [];
    return {
      mode: crew ? 'crew' : 'solo', players: crew ? players : assignRoles(1), active: crew ? idx : 0,
      contributions: roleList(raw.contributions), signed: {}, signedFor: '',
      concerns0: Array.isArray(raw.concerns0) ? raw.concerns0.filter(x => typeof x === 'string').slice(0, 20) : null,
      suggestions: (Array.isArray(raw.suggestions) ? raw.suggestions : []).filter(s => s && typeof s.id === 'string' && ids.has(s.owner) && ['pending', 'accepted', 'declined'].includes(s.status) && typeof s.kind === 'string' && typeof s.part === 'string' && typeof s.label === 'string' && typeof s.fromName === 'string').slice(0, 12).map(s => ({id: s.id.slice(0, 40), owner: s.owner, status: s.status, kind: s.kind.slice(0, 20), part: s.part.slice(0, 40), label: s.label.slice(0, 80), fromName: s.fromName.slice(0, 24)})),
      votes: {},
      crises: (Array.isArray(raw.crises) ? raw.crises : []).filter(c => c && typeof c.id === 'string').slice(0, 10).map(c => ({id: c.id.slice(0, 20), consulted: Math.min(4, Math.max(0, Number(c.consulted) || 0)), followedExpert: !!c.followedExpert}))
    };
  } catch { return freshTeam(1); }
}

/** A leaderboard row. Scores outside 0-1000 and codes over 2,500 characters are rejected. */
export const validBoardEntry = e => {
  try {
    return !!(e && typeof e.id === 'string' && typeof e.team === 'string' && typeof e.label === 'string' && typeof e.scenarioTitle === 'string' && typeof e.difficulty === 'string' && typeof e.mode === 'string' && typeof e.grade === 'string' && Number.isFinite(e.score) && e.score >= 0 && e.score <= 1000 && typeof e.code === 'string' && e.code.length < 2500);
  } catch { return false; }
};

/**
 * A flight checkpoint. Strict: the design must be launchable and already normalised, the run must have every field of a
 * fresh run with sane numeric ranges, conservation of data/science must hold, and a pending crisis must be well formed.
 */
export function validCheckpoint(c) {
  try {
    if (!c || c.schema !== CHECKPOINT_SCHEMA || c.version !== VERSION || !c.run || c.run.done) return false;
    const r = c.run, a = calculate(r.design), baseline = newRun(r.design);
    if (!a.launchable || JSON.stringify(normalize(r.design)) !== JSON.stringify(r.design) || !['launch', 'transfer', 'capture', 'operations'].includes(r.phase) || !OPERATION_MODES.includes(r.mode)) return false;
    if (Object.keys(baseline).some(k => !(k in r))) return false;
    for (const [k, v] of Object.entries(baseline)) {
      if (typeof v === 'number' && (!Number.isFinite(r[k]) || r[k] < 0)) return false;
      if (typeof v === 'boolean' && typeof r[k] !== 'boolean') return false;
    }
    if (r.minute > missionFor(r.design).duration || r.battery > a.c.power.battery + 1e-6 || r.backlog > a.c.storage.capacity + 1e-6 || r.fuel > r.design.fuel || r.throttle > 1) return false;
    if (!['solar', 'link', 'isp', 'pointing'].every(k => Number.isFinite(r.factors?.[k]) && r.factors[k] >= 0 && r.factors[k] <= 10)) return false;
    if (!['logs', 'events', 'history', 'seen'].every(k => Array.isArray(r[k]) && r[k].length <= 5000)) return false;
    if (!r.logs.every(x => x && Number.isFinite(x.minute) && ['type', 'title', 'detail'].every(k => typeof x[k] === 'string'))) return false;
    if (!r.events.every(x => x && typeof x === 'object' && Array.isArray(x.chain) && x.chain.every(y => typeof y === 'string'))) return false;
    if (!r.seen.every(x => CRISIS_IDS.includes(x)) || new Set(r.seen).size !== r.seen.length) return false;
    if (Math.abs(r.generated - r.returned - r.backlog - r.lostMB) > 1e-5 || Math.abs(r.generatedScience - r.science - r.qualityBacklog - r.lostScience) > 1e-5) return false;
    if (!r.history.every(x => x && Number.isFinite(x.minute) && Number.isFinite(x.battery))) return false;
    if (r.crisis && (!CRISIS_IDS.includes(r.crisis.id) || typeof r.crisis.title !== 'string' || typeof r.crisis.body !== 'string' || !Array.isArray(r.crisis.chain) || !r.crisis.chain.every(x => typeof x === 'string') || !Array.isArray(r.crisis.actions) || !r.crisis.actions.length || !r.crisis.actions.every(x => x && RECOVERY_IDS.includes(x.id) && typeof x.name === 'string' && typeof x.effect === 'string'))) return false;
    return true;
  } catch { return false; }
}
