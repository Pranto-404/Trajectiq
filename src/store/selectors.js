// Selectors: pure functions of the store state, safe to pass to useGame(selector).
// Object-returning selectors are memoised on their inputs, so they return the SAME reference until an input changes
// (zustand 5 re-renders forever on a selector that returns a fresh object each call).
import {debrief, pareto} from '@engine/model.js';
import {roleVerdicts, signoffAllowed, tallyVotes} from '@engine/crew.js';
import {missionFor, neededScience} from '@data/catalog.js';
import {ROLES, ROLE_ORDER} from '@data/scenarios.js';
import {isFlightActive, activeDesign, reportRun, analyze, crisisDirections, crisisAdvice, runReview, runScore, runCode, teamLabel} from './derive.js';

function memo(inputs, compute) {
  let last = null, out;
  return state => {
    const args = inputs(state);
    if (last && args.length === last.length && args.every((a, i) => Object.is(a, last[i]))) return out;
    last = args; out = compute(...args); return out;
  };
}

export {isFlightActive, activeDesign, reportRun};
export const selectFlightActive = isFlightActive;
export const selectActiveDesign = activeDesign;

/** Memoised calculate() of the active design (flown design in flight, draft otherwise). Read-only. */
export const selectAnalysis = state => analyze(activeDesign(state));
export const selectMission = memo(s => [activeDesign(s)], design => missionFor(design));

const LEARN_FOR = {mass: 'mass', budget: 'budget', deltaV: 'deltav', eclipse: 'eclipse', schedule: 'schedule'};
const CRITICAL_ID = {deltaV: 'deltav', budget: 'budget', mass: 'mass', schedule: 'time', eclipse: 'power'};

/**
 * Design margins as gauge data. `rows[i]`: {id,title,unit,value,max,fraction,status:'pass'|'warn'|'fail',note,critical,learn,digits}.
 * `extras`: contact budget row data. Port of the v6 gameMargins() without markup.
 */
export function computeMargins(a) {
  const mission = missionFor(a.d);
  const spec = [['mass', 'Mass used', a.wet, a.c.launch.capacity, 'kg', a.margins.mass, 'kg remaining', 1], ['budget', 'Cost used', a.cost, mission.budget, 'cr', a.margins.budget, 'credits remaining', 1],
    ['schedule', 'Schedule used', a.months, mission.deadline, 'mo', a.margins.schedule, 'months of slack', 1], ['deltaV', 'Maneuver available', a.deltaV, mission.maneuver + mission.reserve, 'm/s', a.margins.deltaV, 'm/s reserve margin', 0],
    ['eclipse', 'Eclipse demand', a.eclipseEnergy, a.usableBattery, 'Wh', a.margins.eclipse, 'Wh energy reserve', 1]];
  const rows = spec.map(([id, title, value, max, unit, margin, noteUnit, digits]) => ({
    id, title, unit, value, max, margin, digits, fraction: Math.min(1, Math.max(0, value / max)),
    status: a.checks.find(c => c.id === id)?.status || 'pass', note: `${margin.toFixed(digits)} ${noteUnit}`,
    critical: mission.critical === CRITICAL_ID[id], learn: LEARN_FOR[id] || null
  }));
  const check = id => a.checks.find(c => c.id === id);
  const extras = {
    power: {margin: a.margins.power, unit: 'W', status: check('power')?.status || 'pass'},
    data: {margin: a.margins.data, unit: 'MB/orbit', status: check('data')?.status || 'pass'},
    pointing: {value: a.c.bus.pointing, max: a.c.payload.pointingMax},
    launchOrbit: {status: check('launchOrbit').status, compatible: check('launchOrbit').status === 'pass'},
    recorder: {status: check('recorder').status, ok: check('recorder').status === 'pass', why: check('recorder').why}
  };
  return {rows, extras, launchable: a.launchable, checks: a.checks};
}
export const selectMargins = memo(s => [analyze(activeDesign(s))], computeMargins);

/** Live telemetry for the flight screen, or null when no flight is active. Port of gameTelemetry() + the campaign clock. */
export function computeTelemetry(run) {
  if (!run || run.done) return null;
  const a = analyze(run.design), batt = a.c.power.battery, cap = a.c.storage.capacity;
  const g = (id, label, value, max, unit, warn, digits) => ({id, label, value, max, unit, digits, fraction: Math.min(1, Math.max(0, value / Math.max(1, max))), status: warn ? 'warn' : 'nominal'});
  return {
    gauges: [g('battery', 'Battery', run.battery, batt, 'Wh', run.battery / batt < .3, 1), g('recorder', 'Recorder', run.backlog, cap, 'MB', run.backlog / cap > .75, 0), g('science', 'Returned science', run.science, a.m.scienceTarget, 'units', false, 0), g('fuel', 'Propellant', run.fuel, run.design.fuel, 'kg', false, 1)],
    thresholds: {batterySafe: .15, batteryWarn: .3, recorderWarn: .75},
    objectivePercent: a.m.scienceSuccess,
    lostMB: run.lostMB, safeMinutes: run.safeSteps * 5, inContact: !!run.contact, inEclipse: !!run.eclipse, safe: !!run.safe,
    minute: run.minute, duration: a.m.duration, clock: Math.min(1, Math.max(0, run.minute / Math.max(1, a.m.duration))), phase: run.phase, mode: run.mode,
    history: run.history
  };
}
export const selectTelemetry = memo(s => [s.run], computeTelemetry);

/** Pending crisis data: {crisis, directions, advice, crewMode, votes, decided, forecastAvailable} or null. */
export const selectCrisis = memo(s => [s.run, s.team.mode, s.team.votes], (run, mode, votes) => {
  if (!run?.crisis || run.done) return null;
  return {crisis: run.crisis, directions: crisisDirections(run), advice: crisisAdvice(run), crewMode: mode === 'crew', votes, decided: tallyVotes(votes), forecastAvailable: (run.forecasts || 0) < 1};
});

/** The run the report shows (finished in memory, else the latest archived one). */
export const selectReportRun = reportRun;
/** Mission score of the report run ({total, grade, dims, ...}) or null (old model versions have none). */
export const selectScore = memo(s => [reportRun(s)], r => r ? runScore(r) : null);
/** Replayed decision review rows of the report run. */
export const selectReview = memo(s => [reportRun(s)], r => r ? runReview(r) : []);
/** Causal debrief of the report run: {items, tips, ...}. */
export const selectDebrief = memo(s => [reportRun(s)], r => { try { return r?.done ? debrief(r) : null; } catch { return null; } });
/** The previous archived run of the same destination and model version, for the redesign comparison. */
export const selectPreviousRun = memo(s => [reportRun(s), s.runs], (r, runs) => r ? runs.filter(x => x.id !== r.id && (x.design.destination || 'moon') === (r.design.destination || 'moon') && x.modelVersion === r.modelVersion).at(-1) || null : null);
/** Share code of the report run. */
export const selectShareCode = memo(s => [reportRun(s), s.team, s.design], (r, team, design) => r ? runCode({team, design}, r) : '');
/** Pareto/trade-space data for the archive. */
export const selectTrade = memo(s => [s.runs, s.design], (runs, d) => { const same = runs.filter(r => (r.design.destination || 'moon') === (d.destination || 'moon')); let frontier = []; try { frontier = pareto(same); } catch { /* empty */ } return {runs: same, frontier}; });

/** Pre-launch check: checks, verdicts per role, sign-off state and whether launch is allowed. */
export const selectLaunchCheck = memo(s => [s.design, s.team], (design, team) => {
  const a = analyze(design), crew = team.mode === 'crew';
  const verdicts = crew ? roleVerdicts(a.checks) : [];
  const key = JSON.stringify(a.d), signed = team.signedFor === key ? team.signed : {};
  const ready = !crew || (ROLE_ORDER.every(r => signed[r]) && signoffAllowed(verdicts));
  const failed = a.checks.filter(c => c.status === 'fail');
  return {checks: a.checks, launchable: a.launchable, crew, verdicts, signed, ready, canLaunch: a.launchable && ready, failedCount: failed.length, blockReason: !a.launchable ? `Fix ${failed.length} failed check${failed.length === 1 ? '' : 's'} to launch` : !ready ? 'Every role must sign off to launch' : ''};
});
/** True when the Launch readiness button should be enabled, with a human reason when not (for aria-disabled buttons). */
export const selectLaunchGate = memo(s => [selectLaunchCheck(s)], lc => ({ok: lc.launchable, reason: lc.launchable ? '' : lc.blockReason}));

/** The four orbit presets with their checked consequences (port of orbitOptions()). */
export const selectOrbitOptions = memo(s => [s.design], design => {
  const mission = missionFor(design);
  return [['Polar · low', 90, mission.referenceAltitude, 'Best for polar mapping and fine detail. Short orbit, frequent shadow and contact.'], ['Polar · high', 90, mission.altitudeMax, 'Wider view with less detail and a longer orbit.'], ['Mid-inclination', 60, mission.referenceAltitude, 'Covers mid-latitudes and misses the poles.'], ['Low-inclination', 30, mission.referenceAltitude, 'Equatorial band only; needs a launcher that can reach it.']]
    .map(([name, inclination, altitude, note]) => { const c = analyze({...design, inclination, altitude}); return {name, inclination, altitude, note, selected: design.inclination === inclination && design.altitude === altitude, reachable: c.checks.find(x => x.id === 'launchOrbit').status === 'pass', period: c.period, shadowMinutes: c.m.eclipseMinutes, launcher: c.c.launch.name}; });
});

/** Ghost preview of the hovered part or field: {analysis, deltas} against the current design, or null. */
export const selectPreview = memo(s => [s.design, s.preview], (design, preview) => {
  if (!preview) return null;
  const patch = preview.kind ? {[preview.kind]: preview.id} : {[preview.field]: preview.value};
  const base = analyze(design), next = analyze({...design, ...patch});
  const keys = ['wet', 'cost', 'months', 'deltaV', 'eclipseEnergy'];
  const deltas = Object.fromEntries(keys.map(k => [k, next[k] - base[k]]));
  deltas.power = next.margins.power - base.margins.power; deltas.data = next.margins.data - base.margins.data;
  deltas.massMargin = next.margins.mass - base.margins.mass;
  return {patch, analysis: next, margins: computeMargins(next), deltas, launchable: next.launchable};
});

/** Crew view: who has the controls, role labels and who owns a subsystem. */
export const selectCrew = memo(s => [s.team], team => ({crew: team.mode === 'crew', players: team.players, active: team.players[team.active], roles: ROLES, roleOrder: ROLE_ORDER, suggestions: team.suggestions, pendingSuggestions: team.suggestions.filter(x => x.status === 'pending')}));

/** Mission objective text pieces for the strip under the heading. */
export const selectObjective = memo(s => [activeDesign(s)], design => { const m = missionFor(design); return {name: design.name, needed: neededScience(m), target: m.scienceTarget, budget: m.budget, title: m.title, id: m.id}; });

/** Everything the assistant needs (read-only context for the engine). */
export const selectAssistantContext = memo(s => [s.design, s.run, s.screen, s.prefs.language, s.chat], (design, run, screen, language, chat) => ({design, run: ((run && !run.done) || screen === 'flight' || screen === 'report') ? run : null, language, history: chat}));

export {teamLabel};
