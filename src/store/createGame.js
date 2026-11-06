// The TRAJECTIQ game store (zustand). One factory so tests can build isolated stores with an injected storage, clock,
// timers, id source and browser I/O; src/store/index.js exports the singleton `useGame` built from the browser defaults.
//
// This file is a behavioural port of the v6 `dist/ui/app.js` state machine. Every legacy `actions` key exists as an
// action of the same name (see docs/plan/FOUNDATION_NOTES.md for the table); the data-attribute handlers of the old
// click/input/change listeners became explicit actions (install, resolve, command, setField, ...).
// Rules that make the port safe:
//   * state objects are immutable: actions replace `run`, `design`, `team` ... instead of mutating them;
//   * the engine is pure and is called exactly as before (normalize, calculate, newRun, advance, resolve);
//   * persistence goes through validators.js only; raw damaged saves are preserved until an explicit discard;
//   * nothing in here touches the DOM except through `env.io` and the optional visibility listener.
import {create} from 'zustand';
import {assignRoles, canEdit, ownerOf, roleVerdicts, signoffAllowed, tallyVotes, summarizeCrew, EXPERT_FOR, categoryName, partName} from '@engine/crew.js';
import {normalize, newRun, advance, resolve as engineResolve, runToEnd, seededRandom, clone, debrief, calculate} from '@engine/model.js';
import {reviewDecisions, missionScore} from '@engine/review.js';
import {encodeDesign, decodeDesign, verifyDesign} from '@engine/share.js';
import {nasaDataset, datasetCSV} from '@data/nasa.js';
import {isBodyId} from '@data/bodies.js';
import {CATALOG, missionFor, presetFor, PRESETS, SOURCES, UNCERTAINTY, VERSION} from '@data/catalog.js';
import {SCENARIOS, DIFFICULTY, ROLES, ROLE_ORDER} from '@data/scenarios.js';
import {LEARN} from '@data/learn.js';
import {announce} from '../ds/announce.js';
import {translate} from '../i18n/translate.js';
import {defaultIo} from './io.js';
import {SAVE_KEY, CHECKPOINT_SCHEMA, OPERATION_MODES, validSavedRun, validBoardEntry, validCheckpoint, loadTeam, freshTeam} from './validators.js';
import {isFlightActive, analyze, crisisAdvice, runScore, runCode, teamLabel, PHASE_LABEL} from './derive.js';
import {QUESTIONS} from './quiz.js';

export const SCREENS = ['board', 'hangar', 'flight', 'report'];
const CREW_FREE = new Set(['name', 'livery']);
const CUSTOM_FIELDS = new Set(['name', 'livery', 'duty', 'arrayScale', 'batteryScale', 'distance']);
const NUMERIC_FIELDS = new Set(['fuel', 'altitude', 'inclination', 'duty', 'arrayScale', 'batteryScale']);
const PRESET_NAMES = Object.keys(PRESETS);
const SHEETS_ON_ROBUST = new Set(['lab', 'launch-check']);

/** Resolve browser dependencies lazily so tests (and SSR-less tooling) can replace any of them. */
function resolveEnv(o = {}) {
  const g = globalThis;
  let storage = o.storage;
  if (!storage) { try { storage = g.localStorage; } catch { storage = null; } }
  storage = storage || {getItem: () => null, setItem: () => { throw new Error('Storage unavailable'); }};
  return {
    storage,
    matchMedia: o.matchMedia || (q => g.matchMedia?.(q)),
    now: o.now || (() => Date.now()),
    uuid: o.uuid || (() => g.crypto?.randomUUID ? g.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    timers: o.timers || {setTimeout: (...a) => g.setTimeout(...a), clearTimeout: (...a) => g.clearTimeout(...a), setInterval: (...a) => g.setInterval(...a), clearInterval: (...a) => g.clearInterval(...a)},
    location: o.location || (() => g.location),
    history: o.history || (() => g.history),
    document: o.document || (() => g.document),
    io: {...defaultIo, ...(o.io || {})}
  };
}

function readSave(storage) {
  let saved = {}, rawSave = null, rejectedSave = null;
  try {
    rawSave = storage.getItem(SAVE_KEY);
    saved = JSON.parse(rawSave || '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Invalid save shape');
  } catch { if (rawSave !== null) rejectedSave = rawSave; saved = {}; }
  return {saved, rejectedSave};
}

/**
 * Build a game store. `options`: storage, matchMedia, now, uuid, timers, location(), history(), document(), io.
 * Returns the zustand hook (`useGame(selector)`, `useGame.getState()`, `useGame.subscribe`).
 */
export function createGame(options = {}) {
  const env = resolveEnv(options);
  const loaded = readSave(env.storage);
  let saved = loaded.saved, rejectedSave = loaded.rejectedSave;
  let timer = null, pendingDiscard = null, robustJob = null, sheetSeq = 0, toastSeq = 0, initialised = false, resumeOnVisible = false, storageWarned = false, detachVisibility = null;

  const okCache = new WeakMap();
  const checkpointOk = c => { if (!c || typeof c !== 'object') return false; if (!okCache.has(c)) okCache.set(c, validCheckpoint(c)); return okCache.get(c); };
  const checkpointDamaged = () => !!saved.checkpoint && !checkpointOk(saved.checkpoint);

  const useGame = create((set, get) => {
    const t = (text, vars) => translate(get().prefs.language, text, vars);
    const A = {};
    const isFlight = () => isFlightActive(get());
    const mission = () => missionFor(get().design);

    // ---- toast, persistence, clock -------------------------------------------------------------------------------------
    function toast(text, kind = 'info') {
      const entry = {id: ++toastSeq, text: t(text), kind};
      set(s => ({toasts: [...s.toasts, entry].slice(-3)}));
      return entry.id;
    }
    function saveStatus() { return {rejected: rejectedSave !== null, checkpointDamaged: rejectedSave === null && checkpointDamaged()}; }
    function snapshot(s) {
      const prefs = {language: s.prefs.language, guided: s.prefs.guided, reducedMotion: s.prefs.reducedMotion};
      if (s.prefs.sound) prefs.sound = true; // additive keys appear only once the player opts in, so legacy blobs round-trip with the same shape
      if (s.prefs.haptics) prefs.haptics = true;
      return {design: s.design, runs: s.runs, prefs, team: s.team, board: s.board, checkpoint: isFlightActive(s) ? {schema: CHECKPOINT_SCHEMA, version: VERSION, run: s.run} : (checkpointDamaged() ? saved.checkpoint : null)};
    }
    function persist() {
      if (rejectedSave !== null) return;
      try { env.storage.setItem(SAVE_KEY, JSON.stringify(snapshot(get()))); storageWarned = false; }
      catch { if (!storageWarned) { storageWarned = true; toast('Browser storage unavailable. Export your mission report to keep it.'); } }
    }
    function pause() {
      if (timer) { env.timers.clearInterval(timer); timer = null; }
      if (get().playing) set({playing: false});
    }
    // Legacy cadence: 1.9 s per step outside operations, 1.4 s / speed inside operations (never faster than 100 ms).
    const clockDelay = () => get().run?.phase !== 'operations' ? 1900 : Math.max(100, 1400 / get().speed);
    function startTimer() { if (timer) env.timers.clearInterval(timer); timer = env.timers.setInterval(() => tick(), clockDelay()); }
    function play() {
      const s = get();
      if (!s.run || s.run.done || s.run.crisis || s.sheet) return;
      set({playing: true}); startTimer();
    }
    function announceTelemetry(prev, next) {
      try {
        if (prev.phase !== next.phase) announce(t('Phase: {name}.', {name: t(PHASE_LABEL[next.phase] || next.phase)}));
        const a = analyze(next.design), battery = a.c.power.battery, cap = a.c.storage.capacity;
        const b0 = prev.battery / battery, b1 = next.battery / battery;
        if (b0 >= .3 && b1 < .3) announce(t('Battery low: {pct} percent.', {pct: Math.round(b1 * 100)}), {assertive: true});
        if (b0 >= .15 && b1 < .15) announce(t('Battery critical: {pct} percent. Safe mode is near.', {pct: Math.round(b1 * 100)}), {assertive: true});
        if (prev.backlog / cap <= .75 && next.backlog / cap > .75) announce(t('Recorder above 75 percent. Downlink before it fills.'), {assertive: true});
        if (!prev.safe && next.safe) announce(t('Spacecraft entered safe mode.'), {assertive: true});
      } catch { /* announcements are best effort */ }
    }
    function tick() {
      const s = get();
      if (!s.run || s.run.done || s.run.crisis) return;
      const old = s.run, run = advance(old);
      set({run});
      if (run.crisis) { pause(); announce(`${t('Decision required')}: ${run.crisis.title}. ${t('Simulation paused.')}`, {assertive: true}); }
      else if (run.done) finish();
      else { if (old.phase !== run.phase && get().playing) startTimer(); announceTelemetry(old, run); }
    }
    function finish() {
      pause();
      const s = get(); let r = s.run, runs = s.runs;
      if (!r.id) {
        r = {...r, id: env.uuid(), label: `R${String(runs.length + 1).padStart(2, '0')}`, modelVersion: VERSION, completedAt: new Date(env.now()).toISOString()};
        try { r.review = reviewDecisions(r); r.crew = summarizeCrew(s.team); r.score = missionScore(r, r.crew); } catch { r.review = []; }
        runs = [...runs, clone(r)].slice(-20);
        set({run: r, runs}); persist();
        announce(t('Mission complete. Report ready.'));
      }
      set({screen: 'report', reportTab: 'score'});
    }

    // ---- guards ------------------------------------------------------------------------------------------------------------
    // draftGuard: may the player change the design right now? Mirrors the v6 order exactly.
    function draftGuard() {
      if (rejectedSave !== null) { restoreCheckpoint(); return false; }
      if (checkpointDamaged() && !get().run) { toast('Export or discard the incompatible checkpoint before changing this mission.'); restoreCheckpoint(); return false; }
      if (!isFlight()) return true;
      toast('Hardware is locked. Finish or explicitly discard this flight first.');
      return false;
    }
    // discardThen: run `next` now, or after the player confirms discarding the active flight.
    function discardThen(next) {
      if (!isFlight()) { next(); return; }
      pause(); persist(); pendingDiscard = next;
      openSheet('discard-flight');
    }
    function ownerGuard(kind) {
      const s = get();
      if (s.team.mode !== 'crew' || CREW_FREE.has(kind) || canEdit(s.team, kind)) return true;
      toast('Only the {role} can change this. Ask them, or use a part\'s button to send a suggestion.'.replace('{role}', ROLES[ownerOf(kind)].label));
      return false;
    }
    function updateTeam(fn) { const team = JSON.parse(JSON.stringify(get().team)); fn(team); set({team}); return team; }
    function noteContribution(kind) {
      if (get().team.mode !== 'crew') return;
      const role = ownerOf(kind);
      if (!get().team.contributions.includes(role)) updateTeam(tm => { tm.contributions.push(role); });
    }
    function resetCrewRound() { updateTeam(tm => { tm.concerns0 = null; tm.crises = []; tm.votes = {}; tm.signed = {}; tm.signedFor = ''; tm.contributions = []; }); }
    function setDesign(design) { set({design: normalize(design), robust: null}); }

    // ---- sheets -------------------------------------------------------------------------------------------------------------
    function openSheet(id, props = {}) {
      if (get().playing) pause();
      set({sheet: {id, props, key: ++sheetSeq}});
    }
    function closeSheet() {
      const open = get().sheet;
      pendingDiscard = null;
      if (open) set({sheet: null});
      if (open && SHEETS_ON_ROBUST.has(open.id)) cancelRobustness(false);
    }

    // ---- save / checkpoint ------------------------------------------------------------------------------------------------------
    function restoreCheckpoint() {
      if (rejectedSave !== null) { openSheet('rejected-save', {kind: 'save'}); return; }
      if (!checkpointOk(saved.checkpoint)) {
        if (saved.checkpoint) {
          toast('Saved flight could not be restored: incompatible version or invalid data. The original is retained until you explicitly discard it.');
          openSheet('rejected-save', {kind: 'checkpoint'});
        }
        return;
      }
      const run = clone(saved.checkpoint.run);
      set({run, design: clone(run.design), screen: 'flight'});
      openSheet('resume', {minute: run.minute});
    }

    // ---- navigation ---------------------------------------------------------------------------------------------------------------
    function go(target) {
      const s = get();
      const hasRun = !!s.run;
      let screen = target, sheet = null, tab = null;
      switch (target) {
        case 'game': screen = s.screen; break;
        case 'landing': case 'home': screen = isFlight() ? 'flight' : 'board'; break;
        case 'brief': screen = 'board'; break;
        case 'architect': screen = isFlight() ? s.screen : 'hangar'; sheet = 'lab'; break;
        case 'readiness': screen = s.screen === 'board' ? 'hangar' : s.screen; sheet = 'launch-check'; break;
        case 'control': screen = hasRun ? (s.run.done ? 'report' : 'flight') : s.screen; break;
        case 'debrief': screen = 'report'; tab = 'debrief'; break;
        case 'trade': screen = 'report'; tab = 'trade'; break;
        case 'sources': screen = s.screen; sheet = 'sources'; break;
        default: if (!SCREENS.includes(target)) return;
      }
      if (!SHEETS_ON_ROBUST.has(sheet)) cancelRobustness(false);
      if (s.playing && screen !== 'flight' && screen !== 'hangar' && screen !== 'board' && screen !== 'report') pause();
      set({screen, ...(tab ? {reportTab: tab} : {})});
      if (sheet === 'launch-check') A['game-review']();
      else if (sheet) openSheet(sheet);
    }

    // ---- simulation actions ---------------------------------------------------------------------------------------------------------
    function launch() {
      if (!draftGuard()) return;
      if (!crewReady()) { gameReview(); return; }
      pause();
      try {
        const s = get();
        if (s.team.mode === 'crew') {
          const now = new Set(lensIssues(analyze(s.design))), before = s.team.concerns0 || [];
          updateTeam(tm => { tm.goNoGoSummary = {raised: before.length, resolved: before.filter(x => !now.has(x)).length}; tm.crises = []; tm.votes = {}; });
        }
        const run = newRun(get().design);
        run.mode = get().pitch ? 'aggressive' : 'science';
        set(st => ({run, screen: 'flight', launchCount: st.launchCount + 1, reportTab: 'score', sheet: null}));
        persist();
        play();
      } catch (e) { toast(e.message); }
    }
    function fast() {
      pause();
      let run = get().run; if (!run) return;
      for (let i = 0; i < 150 && !run.done && !run.crisis; i++) run = advance(run);
      set({run});
      if (run.done) finish();
      else if (run.crisis) announce(`${t('Decision required')}: ${run.crisis.title}. ${t('Simulation paused.')}`, {assertive: true});
    }
    function applyRecovery(id) {
      try {
        const run = engineResolve(get().run, id);
        set({run});
        if (run.done) finish(); else { pause(); toast('Decision applied. Review your spacecraft, then Resume.'); }
      } catch (err) { toast(err.message); }
    }
    function preset(name) {
      if (isFlight()) { discardThen(() => preset(name)); return; }
      if (!PRESET_NAMES.includes(name) || !draftGuard() || !ownerGuard('destination')) return;
      pause();
      set(s => {
        const {scenario, difficulty, sandbox, livery, name: missionName} = s.design;
        return {design: normalize({...presetFor(s.design.destination, name, scenario), scenario, difficulty, sandbox, livery, name: missionName}), robust: null, category: 'payload', screen: 'hangar'};
      });
      persist();
      toast('{name} architecture loaded.'.replace('{name}', name[0].toUpperCase() + name.slice(1)));
    }

    // ---- crew -----------------------------------------------------------------------------------------------------------------------
    const lensIssues = a => roleVerdicts(a.checks).flatMap(v => v.issues.map(i => i.id));
    function ensureSigned() {
      const key = JSON.stringify(normalize(get().design));
      if (get().team.signedFor !== key) updateTeam(tm => { tm.signed = {}; tm.signedFor = key; });
    }
    function crewReady() {
      if (get().team.mode !== 'crew') return true;
      ensureSigned();
      return ROLE_ORDER.every(r => get().team.signed[r]);
    }
    function setPlayers(count) {
      const names = get().team.players.map(p => p.name), team = freshTeam(count);
      team.players = assignRoles(count, names);
      set({team});
    }
    function suggest(kind, part) {
      if (!CATALOG[kind]?.some(c => c.id === part)) return;
      const s = get(), owner = ownerOf(kind), active = s.team.players[s.team.active];
      if (s.team.suggestions.some(x => x.status === 'pending' && x.kind === kind && x.part === part)) { toast('That suggestion is already waiting for its owner.'); return; }
      const entry = {id: 's' + env.now().toString(36) + s.team.suggestions.length, owner, status: 'pending', kind, part, label: `${categoryName(kind)} → ${partName(kind, part)}`, fromName: active.name};
      updateTeam(tm => {
        tm.suggestions = tm.suggestions.filter(x => x.status === 'pending').slice(-5).concat([entry]);
        for (const r of active.roles) if (!tm.contributions.includes(r)) tm.contributions.push(r);
      });
      persist();
      toast('Suggestion sent to the {role}.'.replace('{role}', ROLES[owner].label));
    }
    function suggestAnswer(id, accept) {
      const s = get(), sug = s.team.suggestions.find(x => x.id === id && x.status === 'pending'); if (!sug) return;
      const active = s.team.players[s.team.active];
      if (!active.roles.includes(sug.owner)) { toast('Only the owner can answer this.'); return; }
      if (accept) {
        if (!draftGuard()) return;
        if (!CATALOG[sug.kind]?.some(c => c.id === sug.part)) return;
        set(st => ({design: normalize({...st.design, [sug.kind]: sug.part}), robust: null}));
        noteContribution(sug.kind);
      }
      updateTeam(tm => { tm.suggestions.find(x => x.id === id).status = accept ? 'accepted' : 'declined'; });
      persist();
      toast(accept ? 'Suggestion accepted and installed.' : 'Suggestion declined.');
    }
    function gameReview() {
      if (!draftGuard()) return;
      if (get().team.mode === 'crew') {
        ensureSigned();
        if (get().team.concerns0 === null) {
          const verdicts = roleVerdicts(analyze(get().design).checks);
          updateTeam(tm => { tm.concerns0 = [...new Set(verdicts.flatMap(v => v.issues.map(i => i.id)))]; });
        }
      }
      openSheet('launch-check');
    }

    // ---- board, share, compare ------------------------------------------------------------------------------------------------------
    function chooseScenario(id) {
      if (!Object.hasOwn(SCENARIOS, id) || !draftGuard() || !ownerGuard('scenario')) return;
      const sc = SCENARIOS[id], old = get().design, custom = Object.values(SCENARIOS).some(x => x.title === old.name) ? undefined : old.name;
      let design = sc.destination !== old.destination
        ? normalize({...presetFor(sc.destination), livery: old.livery, difficulty: old.difficulty, sandbox: old.sandbox, name: custom, scenario: id})
        : normalize({...old, scenario: id, name: custom});
      const m = missionFor(design);
      design = normalize({...design, altitude: Math.min(m.altitudeMax, Math.max(m.altitudeMin, m.referenceAltitude))});
      set({design, robust: null}); persist();
    }
    function setBoardMode(mode) {
      if (!draftGuard()) return;
      if (mode === 'crew') setPlayers(Math.max(2, get().team.players.length)); else setPlayers(1);
      set(s => ({design: normalize({...s.design, sandbox: mode === 'sandbox'})})); persist();
    }
    function boardAdd() {
      const s = get(), r = s.run?.done ? s.run : s.runs.at(-1); if (!r) return;
      if (r.design.sandbox) { toast('Sandbox runs are not ranked.'); return; }
      const sc = runScore(r); if (!sc) return;
      if (s.board.some(e => e.id === r.id)) { toast('This mission is already on the leaderboard.'); return; }
      const m = missionFor(r.design), crew = r.crew?.players?.length > 1;
      const board = s.board.concat([{id: r.id, team: teamLabel(s).slice(0, 40), label: r.label, scenarioTitle: m.title, difficulty: m.difficultyLabel, mode: crew ? `Crew · ${r.crew.players.length}` : 'Solo', score: sc.total, grade: sc.grade, code: runCode(s, r)}]).sort((a, b) => b.score - a.score).slice(0, 30);
      set({board}); persist();
      toast('Added to the leaderboard: {points} points.'.replace('{points}', sc.total));
    }
    async function copyText(text, message) {
      const ok = await env.io.copy(text);
      toast(ok ? message : 'Select the code and copy it manually.');
      return ok;
    }
    function setDestination(destination) {
      if (!draftGuard() || !isBodyId(destination) || !ownerGuard('destination')) return;
      const old = get().design;
      set({design: normalize({...presetFor(destination), difficulty: old.difficulty, sandbox: old.sandbox, livery: old.livery, ...(!Object.values(SCENARIOS).some(sc => sc.title === old.name) ? {name: old.name} : {})}), robust: null, screen: 'hangar'});
      persist();
      toast('Destination starter design loaded. Review the new power, distance and orbit constraints.');
    }
    function applyHash() {
      try {
        const loc = env.location(), hist = env.history();
        const hash = loc?.hash || ''; if (!hash) return;
        const clear = () => hist?.replaceState?.(null, '', loc.pathname + loc.search);
        if (hash.startsWith('#design=')) {
          const r = decodeDesign(hash); clear();
          if (!r.ok) { toast(r.error); return; }
          set({pendingImport: r.design});
          openSheet('import-confirm', {});
        } else if (hash.startsWith('#challenge=')) {
          const [sc, df] = decodeURIComponent(hash.slice(11)).split(':'); clear();
          if (Object.hasOwn(SCENARIOS, sc) && !isFlight()) {
            let design = normalize({...presetFor(SCENARIOS[sc].destination), scenario: sc, difficulty: Object.hasOwn(DIFFICULTY, df) ? df : 'engineer', livery: get().design.livery});
            const m = missionFor(design);
            design = normalize({...design, altitude: m.referenceAltitude});
            set({design, screen: 'board'}); persist();
            toast('Challenge loaded: {title} · {level}.'.replace('{title}', m.title).replace('{level}', m.difficultyLabel));
          }
        }
      } catch { /* a malformed link is ignored */ }
    }

    // ---- uncertainty job ---------------------------------------------------------------------------------------------------------------
    function cancelRobustness(announceIt = true) {
      if (!robustJob) return;
      env.timers.clearTimeout(robustJob.timer); robustJob = null;
      set({robustProgress: null});
      if (announceIt) toast('Sampling cancelled. Previous completed results are unchanged.');
    }
    function startRobustness() {
      if (robustJob || !analyze(get().design).launchable) return;
      const job = {design: clone(get().design), rng: seededRandom(UNCERTAINTY.seed), results: [], passed: 0, total: 0, timer: null};
      robustJob = job; set({robustProgress: {done: 0, total: UNCERTAINTY.samples}});
      const batch = () => {
        if (robustJob !== job) return;
        try {
          const factors = Object.fromEntries(['solar', 'link', 'isp', 'pointing'].map(k => [k, UNCERTAINTY[k][0] + job.rng() * (UNCERTAINTY[k][1] - UNCERTAINTY[k][0])]));
          const run = runToEnd(job.design, {factors, policy: 'conservative'});
          job.passed += Number(run.outcome.achieved); job.total += run.outcome.completion; job.results.push(run.outcome.completion);
          if (job.results.length === UNCERTAINTY.samples) {
            robustJob = null; set({robustProgress: null});
            if (JSON.stringify(get().design) === JSON.stringify(job.design)) {
              set({robust: {index: job.passed / UNCERTAINTY.samples * 100, passed: job.passed, samples: UNCERTAINTY.samples, seed: UNCERTAINTY.seed, meanCompletion: job.total / UNCERTAINTY.samples, results: job.results, blocked: false}});
              toast('Sample complete. Model sensitivity, not real-world mission probability.');
            }
            return;
          }
          if (job.results.length % 10 === 0) set({robustProgress: {done: job.results.length, total: UNCERTAINTY.samples}});
          job.timer = env.timers.setTimeout(batch, 0);
        } catch { robustJob = null; set({robustProgress: null}); toast('Sampling stopped because the simulation failed. Your flight and design are unchanged.'); }
      };
      job.timer = env.timers.setTimeout(batch, 0);
    }

    // ---- assistant (engine modules are loaded on first use to keep the first paint small) ---------------------------------------------------
    function assistantContext() {
      const s = get();
      return {design: s.design, run: (isFlight() || s.screen === 'flight' || s.screen === 'report') ? s.run : null, language: s.prefs.language, history: s.chat};
    }
    async function askAssistant(q) {
      if (!String(q).trim()) return;
      const {answerQuestion} = await import('@engine/assistant.js');
      const answer = answerQuestion(q, assistantContext());
      set(s => ({chat: [...s.chat, {q: String(q).slice(0, 500), answer}].slice(-12),
        ...(answer.consumesForecast && s.run?.crisis ? {run: {...s.run, forecasts: (s.run.forecasts || 0) + 1}} : {})}));
      openSheet('assistant');
    }
    function applyAssistant(index) {
      const s = get(), proposal = s.chat[Number(index)]?.answer?.proposal;
      if (!proposal || (s.run && !s.run.done)) { toast('Finish the current flight before changing hardware.'); return; }
      const current = normalize(s.design);
      if (Object.keys(proposal.base).some(k => proposal.base[k] !== current[k])) { toast('Your design has changed. Preview this experiment again before applying it.'); return; }
      set({design: normalize({...current, ...proposal.patch}), robust: null, screen: 'hangar'});
      persist(); closeSheet();
      toast('Draft updated. Review launch readiness before flying.');
    }

    // ---- actions: every legacy key keeps its name ----------------------------------------------------------------------------------------------
    Object.assign(A, {
      // lifecycle
      init() {
        if (initialised) return; initialised = true;
        set({saveStatus: saveStatus()});
        restoreCheckpoint(); applyHash();
        const doc = env.document();
        if (doc?.addEventListener) {
          const onVisibility = () => {
            const hidden = !!doc.hidden; set({hidden});
            if (hidden) { if (get().playing) { resumeOnVisible = true; pause(); } }
            else if (resumeOnVisible) { resumeOnVisible = false; const s = get(); if (s.run && !s.run.done && !s.run.crisis && !s.sheet) play(); }
          };
          doc.addEventListener('visibilitychange', onVisibility);
          detachVisibility = () => doc.removeEventListener('visibilitychange', onVisibility);
        }
      },
      dispose() { pause(); cancelRobustness(false); detachVisibility?.(); detachVisibility = null; initialised = false; },
      persist,
      toast, dismissToast: id => set(s => ({toasts: s.toasts.filter(x => x.id !== id)})),
      announce,

      // sheets
      openSheet, closeSheet, close: closeSheet,

      // navigation (new screens and legacy page names)
      go, home: () => go('home'), brief: () => go('brief'), architect: () => go('architect'), readiness: () => go('readiness'), trade: () => go('trade'),
      'game-debrief': () => go('debrief'),
      'game-sources': () => openSheet('sources'), sources: () => openSheet('sources'),
      setCategory: category => { if (CATALOG[category]) set({category}); },
      setReportTab: reportTab => set({reportTab}),
      focus: () => set(s => ({game: {...s.game, fullscreen: !s.game.fullscreen}})),
      'camera-reset': () => { set(s => ({cameraResets: s.cameraResets + 1})); toast('Camera reset.'); },

      // mission board
      start: () => discardThen(() => { pause(); set({screen: 'board', run: null}); resetCrewRound(); persist(); }),
      'board-mode': ({mode}) => setBoardMode(mode),
      'board-scenario': ({scenario}) => chooseScenario(scenario),
      'board-difficulty': ({difficulty}) => {
        if (!Object.hasOwn(DIFFICULTY, difficulty) || !draftGuard() || !ownerGuard('difficulty')) return;
        set(s => ({design: normalize({...s.design, difficulty}), robust: null})); persist();
      },
      'board-players': ({players}) => { const n = Number(players); if (![2, 3, 4].includes(n) || !draftGuard()) return; setPlayers(n); persist(); },
      'game-accept': () => { if (!draftGuard()) return; set({screen: 'hangar', guide: 0}); },
      pitch: () => discardThen(() => { set({pitch: true}); preset('fragile'); }),
      'exit-pitch': () => set({pitch: false}),

      // hangar
      preset, 'preset-balanced': () => preset('balanced'), 'preset-fragile': () => preset('fragile'), 'preset-resilient': () => preset('resilient'),
      install(kind, id, {source = 'click'} = {}) {
        if (!draftGuard()) return 'blocked';
        if (!CATALOG[kind]?.some(c => c.id === id)) return 'blocked';
        if (get().team.mode === 'crew' && !canEdit(get().team, kind)) { suggest(kind, id); return 'suggested'; }
        noteContribution(kind);
        set(s => ({design: normalize({...s.design, [kind]: id}), robust: null, ...(source === 'drop' ? {category: kind} : {})}));
        persist();
        const a = analyze(get().design);
        announce(t('Installed {name}. Mass {mass} of {max} kilograms, {margin} kilograms margin.', {name: a.c[kind].name, mass: Math.round(a.wet), max: Math.round(a.c.launch.capacity), margin: Math.round(a.margins.mass)}));
        if (source === 'drop') toast('{name} installed. Margins updated.'.replace('{name}', a.c[kind].name));
        return 'installed';
      },
      setField(field, value) {
        if (field === 'destination') { setDestination(value); return; }
        if (field === 'mode') { A.command(value, {silent: true}); return; }
        if (!NUMERIC_FIELDS.has(field) && !CUSTOM_FIELDS.has(field)) return;
        if (!ownerGuard(field) || !draftGuard()) return;
        const v = NUMERIC_FIELDS.has(field) ? Number(value) : value;
        set(s => ({design: normalize({...s.design, [field]: v}), robust: null}));
        if (['altitude', 'inclination'].includes(field)) noteContribution(field);
        persist();
      },
      setDestination,
      'orbit-preset': ({inc, alt}) => {
        if (!draftGuard() || !ownerGuard('altitude')) return;
        const inclination = Number(inc), altitude = Number(alt);
        if (!Number.isFinite(inclination) || !Number.isFinite(altitude)) return;
        set(s => ({design: normalize({...s.design, inclination, altitude}), robust: null}));
        noteContribution('altitude'); persist();
      },
      previewPart: (kind, id) => set({preview: kind && id ? {kind, id} : null}),
      previewField: (field, value) => set({preview: field ? {field, value: Number(value)} : null}),
      clearPreview: () => set({preview: null}),
      customize: () => openSheet('lab'),
      'apply-custom': () => { closeSheet(); toast('Customization saved. Mass, power, data and cost updated.'); },
      'game-review': gameReview,
      'game-fix'() { if (!draftGuard()) return; openSheet('power-fix'); },
      'confirm-power-fix'() {
        if (!draftGuard()) return;
        set(s => ({design: normalize({...s.design, power: 'endurance', comms: 'highgain'}), robust: null, screen: 'hangar'}));
        persist(); closeSheet();
      },
      'game-launch': () => { closeSheet(); launch(); },
      launch,
      robust: startRobustness, 'cancel-robust': () => cancelRobustness(),

      // flight clock and commands
      play: () => get().playing ? pause() : play(),
      pause, resume: play,
      step: () => { pause(); tick(); },
      fast,
      setSpeed(n) { n = Number(n); if (![1, 3, 10].includes(n)) return; set({speed: n}); if (get().playing) play(); },
      'speed-1': () => A.setSpeed(1), 'speed-3': () => A.setSpeed(3), 'speed-10': () => A.setSpeed(10),
      command(mode, {silent = false} = {}) {
        const run = get().run;
        if (!run || run.done || run.crisis || run.phase !== 'operations' || !OPERATION_MODES.includes(mode)) return;
        const next = {...run, mode, autoResume: false};
        if (!silent) next.logs = [...run.logs, {minute: run.minute, type: 'decision', title: `Operations: ${mode}`, detail: 'Player changed the science/energy/downlink schedule.'}];
        set({run: next});
      },
      resolve(id) {
        if (get().team.mode === 'crew') { toast('In crew mode the team votes: every role adds its vote below.'); return; }
        applyRecovery(id);
      },
      'game-history': () => openSheet('history', {kind: 'battery'}),

      // crew
      'crew-pass'() {
        const n = get().team.players.length;
        updateTeam(tm => { tm.active = (tm.active + 1) % n; }); persist();
        const p = get().team.players[get().team.active];
        toast('{name} has the controls as {roles}.'.replace('{name}', p.name).replace('{roles}', p.roles.map(r => ROLES[r].short).join(' + ')));
      },
      'crew-vote'({role, option}) {
        const run = get().run;
        if (!run?.crisis || !ROLE_ORDER.includes(role)) return;
        const opt = run.crisis.actions.find(a => a.id === option && !a.disabled); if (!opt) return;
        updateTeam(tm => { tm.votes[role] = opt.id; });
      },
      'crew-resolve'() {
        const run = get().run; if (!run?.crisis) return;
        const decided = tallyVotes(get().team.votes);
        if (!decided) { toast('No decision yet. Finish the vote, or break the tie with the Commander.'); return; }
        const advice = crisisAdvice(run), expert = advice.find(a => a.role === EXPERT_FOR[run.crisis.id]);
        updateTeam(tm => {
          tm.crises.push({id: run.crisis.id, consulted: Object.keys(tm.votes).length, followedExpert: !expert?.optionId || expert.optionId === decided});
          for (const r of Object.keys(tm.votes)) if (!tm.contributions.includes(r)) tm.contributions.push(r);
          tm.votes = {};
        });
        applyRecovery(decided);
      },
      'crew-signoff'({role}) {
        if (!ROLE_ORDER.includes(role)) return;
        ensureSigned();
        const v = roleVerdicts(analyze(get().design).checks).find(x => x.role === role);
        if (!v || v.status === 'nogo') return;
        updateTeam(tm => { tm.signed[role] = true; }); persist();
        if (get().sheet?.id !== 'rollcall') gameReview();
      },
      'suggest-accept': ({id}) => suggestAnswer(id, true),
      'suggest-decline': ({id}) => suggestAnswer(id, false),
      suggest, setPlayers: n => { if (!draftGuard()) return; setPlayers(Number(n)); persist(); },
      setTeamName(index, value) {
        const p = get().team.players[Number(index)]; if (!p) return;
        const clean = assignRoles(1, [value])[0].name;
        if (String(value).trim()) { updateTeam(tm => { tm.players[Number(index)].name = clean; }); persist(); }
      },

      // run archive, report, sharing
      loadRun: id => discardThen(() => { const found = get().runs.find(r => r.id === id); if (!found) return; pause(); set({run: clone(found), screen: 'report', reportTab: 'debrief'}); persist(); }),
      redesign() {
        if (!draftGuard()) return;
        const s = get(), r = s.run?.done ? s.run : s.runs.at(-1);
        set({...(r ? {design: normalize(r.design)} : {}), robust: null, screen: 'hangar'}); persist();
      },
      'game-redesign'() {
        if (!draftGuard()) return;
        resetCrewRound();
        set(s => ({design: normalize(s.run?.design || s.design), robust: null, screen: 'hangar'})); persist();
      },
      markScoreSeen: id => set({scoreSeen: id}),
      'board-add': boardAdd,
      'clear-history': () => openSheet('confirm-clear'),
      'confirm-clear': () => { set({runs: []}); persist(); closeSheet(); },
      export() {
        const s = get(), r = s.run || s.runs.at(-1), d = r?.design || s.design;
        const doc = {nasaSnapshot: nasaDataset(d), project: 'TRAJECTIQ', version: VERSION, mission: missionFor(d), reportType: 'read-only; cannot import or restore a flight', design: d, run: r, debrief: r?.done ? debrief(r) : null, robustness: s.robust, classification: 'Educational first-order model; no real-world mission probability', sources: SOURCES};
        env.io.download(JSON.stringify(doc, null, 2), 'application/json', 'TRAJECTIQ_mission_report.json');
      },
      'export-nasa'() {
        const s = get(), d = (assistantContext().run?.design) || s.design;
        const bodyName = d.destination[0].toUpperCase() + d.destination.slice(1);
        env.io.download(datasetCSV(d.destination), 'text/csv', `TRAJECTIQ_NASA_${bodyName}_Data.csv`);
      },
      'copy-code'() { const s = get(), r = s.run?.done ? s.run : s.runs.at(-1); return copyText(r ? runCode(s, r) : encodeDesign(s.design), 'Mission code copied.'); },
      'copy-design': () => copyText(encodeDesign(get().design, {team: teamLabel(get())}), 'Design code copied.'),
      'copy-challenge'() { const m = mission(), loc = env.location(); return copyText(`${loc?.origin || ''}${loc?.pathname || ''}#challenge=${m.scenarioId}:${m.difficulty}`, 'Challenge link copied.'); },
      print: () => env.io.print(),
      'compare-run'({code} = {}) {
        const r = decodeDesign(code || '');
        if (!r.ok) { set({compare: {error: r.error}}); return; }
        const s = get();
        set({compare: {mine: verifyDesign(s.design), theirs: verifyDesign(r.design), theirName: r.team || r.design.name, claimed: r.claimedScore}});
        toast('Both designs flown with the same seed and autopilot.');
      },
      'import-design'() {
        const d = get().pendingImport; if (!d || !draftGuard()) return;
        set({design: normalize(d), pendingImport: null, robust: null, screen: 'hangar'}); persist(); closeSheet();
        toast('Shared design loaded into your hangar. Review launch readiness before flying.');
      },
      'cancel-import': () => { set({pendingImport: null}); closeSheet(); },

      // save protection and the flight lock
      'export-rejected-save': () => env.io.download(rejectedSave ?? JSON.stringify(saved.checkpoint, null, 2), 'application/json', 'TRAJECTIQ_original_checkpoint.json'),
      'discard-rejected-save'() { rejectedSave = null; saved.checkpoint = null; closeSheet(); persist(); set({saveStatus: saveStatus()}); },
      'resume-checkpoint'() { closeSheet(); set({screen: 'flight'}); },
      'discard-checkpoint': () => discardThen(() => { set({run: null, screen: 'board'}); persist(); }),
      'confirm-discard'() { const next = pendingDiscard; pendingDiscard = null; pause(); set({run: null}); closeSheet(); persist(); next?.(); },
      discardThen,

      // assistant, learning, help (state only; the sheets render them)
      mentor: () => openSheet('assistant'),
      ask: askAssistant, applyAssistant,
      'clear-chat': () => { set({chat: []}); },
      setMentorLevel: mentorLevel => set({mentorLevel}),
      learn: ({topic}) => { if (Object.hasOwn(LEARN, topic)) openSheet('concept', {topic}); },
      'learn-index': () => openSheet('concept', {index: true}),
      quiz() { set({quiz: {i: 0, answers: []}}); openSheet('quiz'); },
      answerQuiz(index) { const q = get().quiz; if (!q || q.answers[q.i] !== undefined) return; const answers = q.answers.slice(); answers[q.i] = Number(index); set({quiz: {...q, answers}}); },
      'next-question'() { const q = get().quiz; if (q && q.i < QUESTIONS.length - 1) set({quiz: {...q, i: q.i + 1}}); },
      'game-help': () => openSheet('help'),
      'nasa-data': () => openSheet('nasa'),
      'learn-quiz-reset': () => set({quiz: null}),
      'guide-next': () => set(s => ({guide: Math.min(3, s.guide + 1)})),
      'guide-toggle'() { set(s => ({guide: 0, prefs: {...s.prefs, guided: !s.prefs.guided}})); persist(); },

      // preferences
      setPref(key, value) {
        if (!['language', 'guided', 'reducedMotion', 'sound', 'haptics'].includes(key)) return;
        const v = key === 'language' ? (value === 'bn' ? 'bn' : 'en') : !!value;
        set(s => ({prefs: {...s.prefs, [key]: v}})); persist();
      },
      'toggle-motion'() { set(s => ({prefs: {...s.prefs, reducedMotion: !s.prefs.reducedMotion}})); persist(); },
      'toggle-language'() { set(s => ({prefs: {...s.prefs, language: s.prefs.language === 'bn' ? 'en' : 'bn'}})); persist(); },
      'toggle-sound'() { set(s => ({prefs: {...s.prefs, sound: !s.prefs.sound}})); persist(); },
      'toggle-haptics'() { set(s => ({prefs: {...s.prefs, haptics: !s.prefs.haptics}})); persist(); }
    });

    return {
      screen: 'board', category: 'payload', ...hydrate(saved, env),
      compare: null, run: null, playing: false, speed: 1, pitch: false, robust: null, robustProgress: null,
      mentorLevel: 'Beginner', quiz: null, guide: 0, chat: [], game: {fullscreen: false},
      pendingImport: null, scoreSeen: null, reportTab: 'score', launchCount: 0, cameraResets: 0,
      sheet: null, toasts: [], preview: null, hidden: false, saveStatus: saveStatus(),
      actions: A
    };
  });

  // The v6 app persisted on every render while a flight was active (every tick). Same here, on relevant changes only.
  useGame.subscribe((s, prev) => {
    if (isFlightActive(s) && (s.run !== prev.run || s.team !== prev.team || s.prefs !== prev.prefs || s.design !== prev.design)) useGame.getState().actions.persist();
  });
  return useGame;
}

function hydrate(saved, env) {
  const reduced = typeof saved.prefs?.reducedMotion === 'boolean' ? saved.prefs.reducedMotion : (env.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false);
  return {
    design: normalize(saved.design || PRESETS.balanced),
    team: loadTeam(saved.team),
    board: (Array.isArray(saved.board) ? saved.board : []).filter(validBoardEntry).slice(0, 30),
    runs: (Array.isArray(saved.runs) ? saved.runs : []).filter(validSavedRun).slice(-20),
    prefs: {language: saved.prefs?.language === 'bn' ? 'bn' : 'en', guided: saved.prefs?.guided !== false, reducedMotion: reduced, sound: saved.prefs?.sound === true, haptics: saved.prefs?.haptics === true}
  };
}
