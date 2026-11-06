import {runToEnd} from '@engine/model.js';
import {reviewDecisions, missionScore} from '@engine/review.js';
import {presetFor, VERSION} from '@data/catalog.js';
import {useGame} from '@/store/index.js';

export const EVIL = '<img src=x onerror=alert(1)><script>alert(2)</script>';

/** A finished, archived run (as the store would save it). */
export function makeRun({id = 'r1', label = 'R01', preset = 'fragile', mode = 'aggressive', destination = 'moon', patch = {}} = {}) {
  const run = runToEnd(presetFor(destination, preset), {mode});
  Object.assign(run, {id, label, modelVersion: VERSION, completedAt: '2026-11-05T10:00:00.000Z', crew: null}, patch);
  try { run.review = reviewDecisions(run); run.score = missionScore(run, null); } catch { run.review = []; }
  return run;
}

const initial = useGame.getState();
/** Reset the singleton store and show `run` as the finished mission on the report screen. */
export function resetStore(extra = {}) {
  localStorage.clear();
  useGame.getState().actions.dispose();
  useGame.setState({...initial, prefs: {...initial.prefs, reducedMotion: true}, ...extra}, true);
}
export function showReport(run, extra = {}) {
  resetStore({run, runs: [run], screen: 'report', reportTab: 'score', ...extra});
}
