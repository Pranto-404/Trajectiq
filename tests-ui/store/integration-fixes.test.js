import {describe, it, expect} from 'vitest';
import {makeStore} from './harness.js';
import {BODIES} from '@data/bodies.js';
import {DEFAULT_SCENARIO} from '@data/scenarios.js';

describe('v7 integration regressions', () => {
  it('preserves mission intent when swapping an architecture', () => {
    const h = makeStore();
    h.a['board-scenario']({scenario: 'mars-dust'});
    h.a['board-difficulty']({difficulty: 'cadet'});
    h.a['board-mode']({mode: 'sandbox'});
    h.a.setField('name', 'Our mission');
    const before = h.get().design;
    h.a.preset('resilient');
    for (const key of ['scenario', 'difficulty', 'sandbox', 'name', 'livery']) expect(h.get().design[key]).toEqual(before[key]);
  });
  it('loads a valid starter for every destination while keeping difficulty', () => {
    const h = makeStore(); h.a['board-difficulty']({difficulty: 'cadet'});
    for (const id of Object.keys(BODIES)) {
      h.a.setDestination(id);
      expect(h.get().design).toMatchObject({destination: id, scenario: DEFAULT_SCENARIO[id], difficulty: 'cadet'});
      h.a['export-nasa']();
      expect(h.downloads.at(-1).name).toBe(`TRAJECTIQ_NASA_${id[0].toUpperCase() + id.slice(1)}_Data.csv`);
      expect(h.downloads.at(-1).data).toContain('source_url');
    }
  });
  it('spends exactly one forecast even through concurrent assistant requests', async () => {
    const h = makeStore(); h.a.preset('fragile'); h.a.launch(); h.a.fast();
    expect(h.get().run.crisis).toBeTruthy();
    await Promise.all([h.a.ask('Use my one forecast'), h.a.ask('Use my one forecast')]);
    expect(h.get().run.forecasts).toBe(1);
    expect(h.get().chat.filter(x => x.answer.consumesForecast)).toHaveLength(1);
    expect(h.stored().checkpoint.run.forecasts).toBe(1);
  });
  it('redesign without an archived flight does not crash', () => {
    const h = makeStore(); expect(() => h.a['game-redesign']()).not.toThrow();
    expect(h.get().screen).toBe('hangar');
  });
  it('keeps the roll call open after a crew sign-off', () => {
    const h = makeStore(); h.a['board-mode']({mode: 'crew'}); h.a.preset('resilient');
    h.a.openSheet('rollcall'); h.a['crew-signoff']({role: 'commander'});
    expect(h.get().team.signed.commander).toBe(true);
    expect(h.get().sheet.id).toBe('rollcall');
  });
});
