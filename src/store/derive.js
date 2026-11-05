// Pure helpers over the state shape. No store access, no side effects: safe to call from selectors, actions and tests.
import {calculate, clone} from '@engine/model.js';
import {reviewDecisions, missionScore, forecastDirections, roleAdvice} from '@engine/review.js';
import {encodeDesign} from '@engine/share.js';
import {VERSION} from '@data/catalog.js';

/** True while a launched flight has not finished (hardware is locked). */
export const isFlightActive = s => !!(s.run && !s.run.done);
/** The design the player is looking at: the flown design during a flight, the draft otherwise. */
export const activeDesign = s => isFlightActive(s) ? s.run.design : s.design;
/** The run the report screen shows: the finished run in memory, else the most recent archived one. */
export const reportRun = s => s.run?.done ? s.run : s.runs.at(-1) || null;

// ---- memoised engine calls -------------------------------------------------------------------------------------------
const analysisCache = new Map();
/** calculate() memoised by design content. The result is shared: treat it as read-only. */
export function analyze(design) {
  const key = JSON.stringify(design);
  let hit = analysisCache.get(key);
  if (!hit) {
    if (analysisCache.size >= 96) analysisCache.delete(analysisCache.keys().next().value);
    hit = calculate(design);
    analysisCache.set(key, hit);
  }
  return hit;
}

const directionCache = new Map(), adviceCache = new Map();
/** Cache key of a pending crisis: same minute, same crisis, same available options. */
export const crisisKey = run => `${run.minute}|${run.crisis.id}|${run.crisis.actions.map(a => a.id + (a.disabled ? 'x' : '')).join()}`;
export function crisisDirections(run) {
  const key = crisisKey(run);
  if (!directionCache.has(key)) { if (directionCache.size > 6) directionCache.clear(); try { directionCache.set(key, forecastDirections(run)); } catch { directionCache.set(key, []); } }
  return directionCache.get(key);
}
export function crisisAdvice(run) {
  const key = crisisKey(run);
  if (!adviceCache.has(key)) { if (adviceCache.size > 6) adviceCache.clear(); try { adviceCache.set(key, roleAdvice(run)); } catch { adviceCache.set(key, []); } }
  return adviceCache.get(key);
}

// ---- run archive helpers (verbatim behaviour of the v6 app) ----------------------------------------------------------------
export function runReview(s) { try { return s.review || reviewDecisions(s); } catch { return []; } }
export function runScore(s) {
  try {
    if (s.score) return s.score;
    if (s.modelVersion && s.modelVersion !== VERSION) return null;
    return missionScore({...s, review: runReview(s)}, s.crew);
  } catch { return null; }
}
export const teamLabel = s => s.team.mode === 'crew' ? s.team.players.map(p => p.name).join(' & ').slice(0, 40) : s.design.name;
export function runCode(s, run) { try { return encodeDesign(run.design, {score: runScore(run)?.total, team: teamLabel(s)}); } catch { return ''; } }

export const lensIssues = (roleVerdicts, a) => roleVerdicts(a.checks).flatMap(v => v.issues.map(i => i.id));
export const copy = clone;

/** Human readable phase names used by announcements and the phase ribbon. */
export const PHASES = ['Brief', 'Architecture', 'Readiness', 'Launch', 'Transfer', 'Capture', 'Operations', 'Debrief'];
export const PHASE_LABEL = {launch: 'Launch', transfer: 'Transfer', capture: 'Capture', operations: 'Operations'};
