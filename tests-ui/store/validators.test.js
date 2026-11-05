// The persistence validators must reject hostile and damaged data exactly as the v6 app did.
import {describe, it, expect} from 'vitest';
import {runToEnd, newRun, advance} from '@engine/model.js';
import {PRESETS, VERSION} from '@data/catalog.js';
import {validSavedRun, validCheckpoint, validBoardEntry, loadTeam, freshTeam} from '@/store/validators.js';
import {makeStore} from './harness.js';

const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>';
const goodRun = () => { const r = runToEnd(PRESETS.balanced); return Object.assign(r, {id: 'r1', label: 'R01', modelVersion: VERSION}); };
const crisisRun = () => { let run = newRun(PRESETS.fragile); for (let i = 0; i < 100 && !run.crisis; i++) run = advance(run); return run; };

describe('validSavedRun', () => {
  it('accepts a finished run and rejects every kind of damage', () => {
    expect(validSavedRun(goodRun())).toBe(true);
    const bad = [null, undefined, 'x', 5, [], {}, {...goodRun(), modelVersion: '1.0.0'}, {...goodRun(), done: false}, {...goodRun(), id: 7}, {...goodRun(), label: null},
      {...goodRun(), outcome: {...goodRun().outcome, science: NaN}}, {...goodRun(), outcome: {...goodRun().outcome, cost: -1}}, {...goodRun(), outcome: {...goodRun().outcome, lostMB: Infinity}},
      {...goodRun(), science: '5'}, {...goodRun(), logs: [{}]}, {...goodRun(), logs: [{minute: 1, type: 'a', title: 1, detail: 'x'}]}, {...goodRun(), events: [null]}, {...goodRun(), events: [{chain: [1]}]},
      {...goodRun(), history: [{battery: 'x', minute: 1}]}, {...goodRun(), logs: new Array(5001).fill({minute: 1, type: 'a', title: 'b', detail: 'c'})}, {...goodRun(), design: null}];
    for (const b of bad) expect(validSavedRun(b)).toBe(false);
  });
  it('does not throw on getters that throw or on prototype tricks', () => {
    const trap = {get id() { throw new Error('boom'); }};
    expect(validSavedRun(trap)).toBe(false);
    expect(validSavedRun(JSON.parse('{"__proto__":{"done":true},"constructor":{"prototype":{}}}'))).toBe(false);
  });
  it('keeps hostile strings as inert text (they are valid strings, rendering escapes them)', () => {
    const run = goodRun(); run.label = evil; run.logs[0].title = evil; run.events[0] = {...(run.events[0] || {}), chain: [evil], title: evil};
    if (run.events.length) expect(validSavedRun(run)).toBe(true);
    const h = makeStore({runs: [run]}); h.a.init();
    if (run.events.length) expect(h.get().runs[0].label).toBe(evil);
  });
});

describe('loadTeam', () => {
  it('rejects non-objects and fills a safe solo team', () => {
    for (const raw of [null, undefined, 'x', 3, [], true]) expect(loadTeam(raw)).toEqual(freshTeam(1));
  });
  it('limits and sanitises names, roles, suggestions and crises', () => {
    const raw = {mode: 'crew', players: [{name: evil + 'x'.repeat(100)}, {name: 7}, null], active: 99, contributions: ['commander', 'hacker', 5, '__proto__'],
      concerns0: ['a', 5, 'b'], signed: {commander: true}, votes: {commander: 'x'},
      suggestions: [...Array(20)].map((_, i) => ({id: 'i' + i + 'x'.repeat(100), owner: 'power', status: 'pending', kind: 'power', part: 'compact', label: 'L'.repeat(500), fromName: 'F'.repeat(100)})).concat([{id: 'bad', owner: 'nobody', status: 'pending', kind: 'a', part: 'b', label: 'c', fromName: 'd'}, {id: 'bad2', owner: 'power', status: 'hacked', kind: 'a', part: 'b', label: 'c', fromName: 'd'}, null, 5]),
      crises: [{id: 'c'.repeat(50), consulted: 99, followedExpert: 'yes'}, {id: 3}, null]};
    const t = loadTeam(raw);
    expect(t.mode).toBe('crew'); expect(t.players).toHaveLength(3); expect(t.active).toBe(0);
    for (const p of t.players) { expect(p.name.length).toBeLessThanOrEqual(24); expect(p.name).not.toMatch(/[<>]/); }
    expect(t.contributions).toEqual(['commander']);
    expect(t.concerns0).toEqual(['a', 'b']);
    expect(t.signed).toEqual({}); expect(t.votes).toEqual({}); expect(t.signedFor).toBe('');
    expect(t.suggestions).toHaveLength(12);
    for (const s of t.suggestions) { expect(s.id.length).toBeLessThanOrEqual(40); expect(s.label.length).toBeLessThanOrEqual(80); expect(s.fromName.length).toBeLessThanOrEqual(24); expect(s.owner).toBe('power'); }
    expect(t.crises).toEqual([{id: 'c'.repeat(20), consulted: 4, followedExpert: true}]);
  });
  it('a single saved player is solo even if the blob says crew', () => { expect(loadTeam({mode: 'crew', players: [{name: 'A'}]}).mode).toBe('solo'); });
});

describe('validBoardEntry', () => {
  const entry = {id: 'a', team: 'T', label: 'R01', scenarioTitle: 'S', difficulty: 'Engineer', mode: 'Solo', grade: 'A', score: 500, code: 'TQ6.abc'};
  it('accepts a good row and rejects damaged ones', () => {
    expect(validBoardEntry(entry)).toBe(true);
    for (const bad of [null, {...entry, score: 1001}, {...entry, score: -1}, {...entry, score: NaN}, {...entry, score: '5'}, {...entry, code: 'x'.repeat(2500)}, {...entry, id: 4}, {...entry, grade: undefined}, 'x', []]) expect(validBoardEntry(bad)).toBe(false);
  });
  it('the store caps the leaderboard at 30 valid rows', () => {
    const board = [...Array(40)].map((_, i) => ({...entry, id: 'e' + i})).concat([{...entry, score: 5000}]);
    const h = makeStore({board}); h.a.init(); expect(h.get().board).toHaveLength(30);
  });
});

describe('validCheckpoint', () => {
  const cp = run => ({schema: 1, version: VERSION, run});
  it('accepts a real mid-flight checkpoint, including a pending crisis', () => { expect(validCheckpoint(cp(crisisRun()))).toBe(true); expect(validCheckpoint(cp(newRun(PRESETS.balanced)))).toBe(true); });
  it('rejects tampering', () => {
    const run = crisisRun(), ok = newRun(PRESETS.balanced);
    const mut = (r, f) => { const c = JSON.parse(JSON.stringify(r)); f(c); return cp(c); };
    const bad = [null, {}, {schema: 1}, {...cp(run), schema: 2}, {...cp(run), version: '5.0.0'}, cp({...run, done: true}), cp(null),
      mut(ok, r => r.battery = 1e9), mut(ok, r => r.battery = -1), mut(ok, r => r.backlog = 1e9), mut(ok, r => r.fuel = 1e6), mut(ok, r => r.minute = 1e6), mut(ok, r => r.throttle = 5),
      mut(ok, r => r.phase = 'warp'), mut(ok, r => r.mode = 'turbo'), mut(ok, r => { delete r.history; }), mut(ok, r => r.factors.solar = 99), mut(ok, r => r.seen = ['storage', 'storage']), mut(ok, r => r.seen = ['alien']),
      mut(ok, r => r.generated = 123456), mut(ok, r => r.design.fuel = 9999), mut(ok, r => r.design.power = 'nuclear'), mut(ok, r => r.design.name = 5),
      mut(run, r => r.crisis.id = 'ufo'), mut(run, r => r.crisis.actions = []), mut(run, r => r.crisis.actions[0].id = 'selfdestruct'), mut(run, r => r.crisis.chain = [1]), mut(run, r => r.crisis.title = 5),
      mut(ok, r => r.logs = [{minute: 'x'}]), mut(ok, r => r.events = [{chain: [1]}]), mut(ok, r => r.minute = NaN)];
    bad.forEach((b, i) => expect(validCheckpoint(b), `case ${i}`).toBe(false));
  });
  it('never throws on exotic input', () => { for (const v of [undefined, 1, 'x', () => 1, Symbol.iterator.toString(), {run: {design: {get x() { throw 1; }}}}]) expect(validCheckpoint(v)).toBe(false); });
});

describe('a fully hostile save loads as inert data and never as markup', () => {
  it('survives and strips what the engine sanitises', () => {
    const blob = {design: {name: evil, livery: evil, scenario: evil, power: evil}, runs: [goodRun()], prefs: {language: evil, guided: evil, reducedMotion: evil}, team: {mode: 'crew', players: [{name: evil}, {name: evil}], suggestions: [{id: evil, owner: 'power', status: 'pending', kind: 'power', part: 'compact', label: evil, fromName: evil}]}, board: [{id: 'x', team: evil, label: evil, scenarioTitle: evil, difficulty: evil, mode: evil, grade: evil, score: 500, code: evil}], checkpoint: {schema: 1, version: VERSION, run: {design: evil}}};
    const h = makeStore(blob); h.a.init();
    const s = h.get();
    expect(s.prefs.language).toBe('en'); expect(typeof s.prefs.guided).toBe('boolean'); expect(typeof s.prefs.reducedMotion).toBe('boolean');
    expect(s.design.name).not.toContain('<'); expect(s.design.name.length).toBeLessThanOrEqual(60);
    expect(s.team.players.every(p => !/[<>]/.test(p.name))).toBe(true);
    expect(s.run).toBeNull(); expect(s.sheet.id).toBe('rejected-save');
    expect(s.board[0].team).toBe(evil); // kept as a plain string; React escapes it on render
  });
});
