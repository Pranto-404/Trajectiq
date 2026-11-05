// Port of tests/v5-flight-guards.test.mjs to store actions (the UI-independent half of each test).
import {describe, it, expect} from 'vitest';
import {newRun, advance, resolve, runToEnd, robustness} from '@engine/model.js';
import {PRESETS, VERSION} from '@data/catalog.js';
import {makeStore} from './harness.js';

const toOperations = design => { let run = newRun(design); while (run.phase !== 'operations' && !run.done) run = run.crisis ? resolve(run, run.crisis.actions[0].id) : advance(run); return run; };

describe('flight lock and discard flow', () => {
  it('an active flight cannot be mutated through install, fields, custom fields, destination, presets or relaunch', () => {
    const h = makeStore(); h.a.init(); h.a['game-accept'](); h.a['game-launch'](); h.a.step();
    const baseline = h.stored();
    h.a.install('power', 'compact'); h.a.setField('fuel', '1'); h.a.setField('inclination', '30'); h.a.setField('name', 'Changed'); h.a.setField('destination', 'mars'); h.a.launch();
    expect(h.stored().design).toEqual(baseline.design);
    expect(h.stored().checkpoint.run).toEqual(baseline.checkpoint.run);
    expect(h.get().toasts.some(t => /Hardware is locked/.test(t.text))).toBe(true);
    h.a['preset-fragile']();
    expect(h.get().sheet.id).toBe('discard-flight');
    h.a.close(); expect(h.stored().checkpoint.run).toEqual(baseline.checkpoint.run);
    h.a.pitch(); expect(h.get().sheet.id).toBe('discard-flight'); h.a.close();
    expect(h.stored().checkpoint.run).toEqual(baseline.checkpoint.run);
    h.a.start(); h.a['confirm-discard']();
    expect(h.stored().checkpoint).toBeNull(); expect(h.get().screen).toBe('board'); expect(h.get().run).toBeNull();
  });

  it('a validated checkpoint returns paused on reload, including a pending decision', () => {
    let run = newRun(PRESETS.fragile); for (let i = 0; i < 100 && !run.crisis; i++) run = advance(run);
    expect(run.crisis).toBeTruthy();
    let h = makeStore({checkpoint: {schema: 1, version: VERSION, run}}); h.a.init();
    expect(h.get().sheet.id).toBe('resume'); expect(h.get().playing).toBe(false); expect(h.intervals.size).toBe(0);
    expect(h.stored().checkpoint.run).toEqual(run);
    h.a['resume-checkpoint'](); expect(h.get().screen).toBe('flight'); expect(h.get().run.crisis).toBeTruthy(); expect(h.get().sheet).toBeNull(); expect(h.get().playing).toBe(false);
    for (const patch of [{schema: 999}, {version: 'old'}, {run: {...run, battery: -4}}, {run: {...run, logs: [{}]}}, {run: {...run, phase: 'invalid'}}]) {
      h = makeStore({checkpoint: {schema: 1, version: VERSION, run, ...patch}}); h.a.init();
      expect(h.get().run).toBeNull(); expect(h.get().screen).toBe('board');
      expect(h.get().sheet).toMatchObject({id: 'rejected-save', props: {kind: 'checkpoint'}});
      expect(h.get().saveStatus.checkpointDamaged).toBe(true);
      h.a.launch(); expect(h.get().run).toBeNull();
      expect(h.stored().checkpoint.version).toBe(patch.version || VERSION);
      h.a['discard-rejected-save'](); expect(h.stored().checkpoint).toBeNull(); expect(h.get().saveStatus.checkpointDamaged).toBe(false);
    }
  });

  it('the power/comms fix has a preview sheet and keeps custom spacecraft fields', () => {
    const design = {...PRESETS.fragile, name: 'Custom mission', fuel: 48, altitude: 130, inclination: 60, livery: 'coral', batteryScale: 1.25, duty: .5};
    const h = makeStore({design}); h.a.init(); const before = h.stored().design;
    h.a['game-fix'](); expect(h.get().sheet.id).toBe('power-fix'); expect(h.stored().design).toEqual(before);
    h.a['confirm-power-fix']();
    const after = h.stored().design;
    for (const k of ['name', 'fuel', 'altitude', 'inclination', 'livery', 'batteryScale', 'duty', 'payload', 'bus', 'launch']) expect(after[k]).toBe(design[k]);
    expect(after.power).toBe('endurance'); expect(after.comms).toBe('highgain'); expect(h.get().screen).toBe('hangar'); expect(h.get().sheet).toBeNull();
  });

  it('opening a sheet pauses the clock and closing does not restart it', () => {
    const h = makeStore(); h.a.init(); h.a['game-accept'](); h.a['game-launch']();
    expect(h.get().playing).toBe(true); expect(h.intervals.size).toBe(1);
    h.a.mentor(); expect(h.get().playing).toBe(false); expect(h.intervals.size).toBe(0);
    h.a.play(); expect(h.get().playing).toBe(false); // refused while a sheet is open
    h.a.close(); expect(h.get().playing).toBe(false);
  });

  it('Mars destination loads its starter design with the Mars altitude range', () => {
    const h = makeStore(); h.a.init(); h.a['game-accept']();
    h.a.setField('destination', 'mars');
    expect(h.stored().design.destination).toBe('mars'); expect(h.stored().design.altitude).toBe(400); expect(h.get().design.name).toBe('Mars Polar Mapper');
  });

  it('uncertainty batches yield, reject duplicates, cancel safely and match the deterministic engine', () => {
    const h = makeStore(); h.a.init();
    h.a.robust(); expect(h.timeouts.size).toBe(1); h.a.robust(); expect(h.timeouts.size).toBe(1);
    h.nextTimeout(); expect(h.timeouts.size).toBe(1);
    h.a['cancel-robust'](); expect(h.timeouts.size).toBe(0); expect(h.get().toasts.at(-1).text).toMatch(/cancelled/); expect(h.get().robustProgress).toBeNull();
    h.a.robust(); for (let i = 0; i < 200; i++) h.nextTimeout();
    expect(h.timeouts.size).toBe(0);
    expect(h.get().robust.passed).toBe(robustness(PRESETS.balanced).passed); expect(h.get().robust.samples).toBe(200);
    h.a.robust(); h.a.go('hangar'); expect(h.timeouts.size).toBe(0);
  });

  it('commands cannot run before orbital operations or modify a finished mission', () => {
    const h = makeStore(); h.a.init(); h.a['game-launch'](); const before = h.get().run;
    h.a.command('aggressive'); expect(h.get().run).toBe(before);
    const run = runToEnd(PRESETS.balanced); Object.assign(run, {id: 'saved', label: 'R01', modelVersion: VERSION});
    const d = makeStore({runs: [run]}); d.a.init(); d.a.loadRun('saved'); expect(d.get().run.done).toBe(true); const report = d.get().run;
    d.a.command('coast'); expect(d.get().run).toBe(report); expect(d.get().screen).toBe('report');
  });

  it('the operations dropdown path changes mode without a log entry and survives a reload', () => {
    const run = toOperations(PRESETS.balanced);
    const h = makeStore({checkpoint: {schema: 1, version: VERSION, run}}); h.a.init(); h.a['resume-checkpoint']();
    const logs = h.get().run.logs.length;
    h.a.setField('mode', 'downlink');
    expect(h.get().run.mode).toBe('downlink'); expect(h.get().run.autoResume).toBe(false); expect(h.get().run.logs.length).toBe(logs);
    expect(h.stored().checkpoint.run.mode).toBe('downlink');
    const again = makeStore(h.stored()); again.a.init(); expect(again.get().run.mode).toBe('downlink'); expect(again.intervals.size).toBe(0);
    h.a.command('coast'); expect(h.get().run.mode).toBe('coast'); expect(h.get().run.logs.at(-1).title).toBe('Operations: coast');
  });

  it('malformed raw JSON is preserved until an explicit discard instead of being overwritten', () => {
    for (const raw of ['{broken', 'null', '[]']) {
      const h = makeStore(raw); h.a.init();
      expect(h.get().sheet).toMatchObject({id: 'rejected-save', props: {kind: 'save'}}); expect(h.get().saveStatus.rejected).toBe(true);
      h.a['game-launch'](); h.a.setField('name', 'Replacement'); h.a.install('power', 'compact'); h.a.persist();
      expect(h.raw()).toBe(raw);
      h.a['export-rejected-save'](); expect(h.downloads.at(-1).data).toBe(raw);
      h.a['discard-rejected-save'](); expect(h.stored().checkpoint).toBeNull();
      h.a['game-launch'](); expect(h.stored().checkpoint).toBeTruthy();
    }
  });
});
