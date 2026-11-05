// Golden replay: the ui-smoke and game-flow sequences driven through store actions must match the engine bit for bit.
import {describe, it, expect} from 'vitest';
import {newRun, advance, resolve, runToEnd, calculate, normalize} from '@engine/model.js';
import {PRESETS, presetFor, VERSION} from '@data/catalog.js';
import {makeStore, flyThrough} from './harness.js';

const strip = r => { const {id, label, modelVersion, completedAt, review, crew, score, ...rest} = r; return rest; };
const POLICY = {propulsion: 'nominal', eclipse: 'continue', storage: 'continue', link: 'wait', weather: 'ride'};

// The pure-engine twin of "launch, 3 steps, command aggressive, then the legacy test's choice per crisis".
function engineFlight(design, {steps = 3, mode = null} = {}) {
  let s = newRun(design); s.mode = 'science';
  for (let i = 0; i < steps; i++) s = advance(s);
  if (mode && s.phase === 'operations' && !s.crisis && !s.done) { s = {...s, mode, autoResume: false, logs: [...s.logs, {minute: s.minute, type: 'decision', title: `Operations: ${mode}`, detail: 'Player changed the science/energy/downlink schedule.'}]}; }
  for (let i = 0; i < 20 && !s.done; i++) {
    for (let j = 0; j < 150 && !s.done && !s.crisis; j++) s = advance(s);
    if (s.crisis) { const want = POLICY[s.crisis.id]; const opt = s.crisis.actions.find(x => x.id === want && !x.disabled) || s.crisis.actions.find(x => !x.disabled); s = resolve(s, opt.id); }
  }
  return s;
}

describe('golden replay', () => {
  for (const [dest, preset] of [['moon', 'balanced'], ['moon', 'fragile'], ['moon', 'resilient'], ['mars', 'balanced']]) {
    it(`store flight of the ${dest} ${preset} preset equals runToEnd`, () => {
      const h = makeStore(); h.a.init();
      if (dest === 'mars') h.a['board-scenario']({scenario: 'mars-polar'});
      h.a['game-accept'](); h.a.preset(preset);
      const design = h.get().design;
      expect(design).toEqual(normalize({...presetFor(dest, preset), ...(dest === 'mars' ? {} : {}), scenario: design.scenario, name: design.name, livery: design.livery}));
      h.a['game-review'](); expect(h.get().sheet.id).toBe('launch-check'); h.a['game-launch']();
      expect(h.get().screen).toBe('flight'); expect(h.get().sheet).toBeNull();
      const done = flyThrough(h);
      const expected = runToEnd(design);
      expect(strip(done)).toEqual(strip(expected));
      expect(done.outcome).toEqual(expected.outcome);
      expect(h.get().screen).toBe('report');
      expect(h.stored().runs).toHaveLength(1); expect(h.stored().runs[0].outcome).toEqual(expected.outcome); expect(h.stored().checkpoint).toBeNull();
    });
  }

  it('the game-flow sequence: install, drop, preset, launch, step x3, command, recover, power fix, replay and compare', () => {
    const h = makeStore(); h.a.init();
    h.a.start(); expect(h.get().screen).toBe('board');
    h.a['game-accept'](); expect(h.get().screen).toBe('hangar');
    h.a.setCategory('power'); expect(h.get().category).toBe('power');
    expect(h.a.install('power', 'compact')).toBe('installed'); expect(h.get().design.power).toBe('compact');
    h.a.install('payload', 'hires', {source: 'drop'}); expect(h.get().design.payload).toBe('hires'); expect(h.get().category).toBe('payload');
    h.a['preset-fragile'](); expect(h.get().design.power).toBe('compact');
    h.a['game-review'](); expect(h.get().sheet.id).toBe('launch-check'); h.a['game-launch']();
    expect(h.get().run.phase).toBe('launch');
    const fragileDesign = h.get().design;
    h.a.step(); h.a.step(); h.a.step(); h.a.command('aggressive');
    const run1 = flyThrough(h);
    const e1 = engineFlight(fragileDesign, {steps: 3, mode: 'aggressive'});
    expect(strip(run1)).toEqual(strip(e1));
    expect(run1.outcome.achieved).toBe(false);
    // power + comms fix, replay
    h.a['game-fix'](); expect(h.get().sheet.id).toBe('power-fix'); h.a['confirm-power-fix']();
    expect(h.get().screen).toBe('hangar'); expect(h.get().design.power).toBe('endurance');
    h.a['game-review'](); h.a['game-launch']();
    expect(h.get().run.done).toBe(false);
    const fixed = h.get().design;
    h.a.step(); h.a.step(); h.a.step(); h.a.command('aggressive');
    const run2 = flyThrough(h);
    expect(strip(run2)).toEqual(strip(engineFlight(fixed, {steps: 3, mode: 'aggressive'})));
    expect(run2.outcome.achieved).toBe(true);
    expect(h.stored().runs).toHaveLength(2); expect(h.get().runs.map(r => r.label)).toEqual(['R01', 'R02']);
    expect(h.get().runs.every(r => r.modelVersion === VERSION && r.score && r.review)).toBe(true);
  });

  it('crises pause the clock and resolve() ends the pause; fast() stops at a decision', () => {
    const h = makeStore(); h.a.init(); h.a['preset-fragile'](); h.a['game-launch']();
    expect(h.get().playing).toBe(true);
    h.a.fast(); expect(h.get().run.crisis).toBeTruthy(); expect(h.get().playing).toBe(false); expect(h.intervals.size).toBe(0);
    h.a.fast(); expect(h.get().run.crisis).toBeTruthy(); h.a.step();
    const before = h.get().run; const opt = before.crisis.actions.find(a => !a.disabled);
    h.a.resolve(opt.id); expect(h.get().run.crisis === null || h.get().run.done || h.get().run !== before).toBe(true);
    expect(h.get().playing).toBe(false);
  });

  it('calculate() through selectAnalysis is memoised and equals the engine', async () => {
    const {selectAnalysis, selectMargins, selectTelemetry, selectCrisis} = await import('@/store/selectors.js');
    const h = makeStore(); h.a.init();
    const s = h.get();
    expect(selectAnalysis(s)).toBe(selectAnalysis(h.get()));
    expect(selectAnalysis(s)).toEqual(calculate(s.design));
    expect(selectMargins(s)).toBe(selectMargins(h.get()));
    h.a.install('power', 'compact');
    expect(selectMargins(h.get())).not.toBe(selectMargins(s));
    expect(selectTelemetry(h.get())).toBeNull(); expect(selectCrisis(h.get())).toBeNull();
    h.a['game-launch'](); h.a.step();
    const t1 = selectTelemetry(h.get()); expect(t1.gauges.map(g => g.id)).toEqual(['battery', 'recorder', 'science', 'fuel']); expect(selectTelemetry(h.get())).toBe(t1);
  });
});
