// Saves produced by the current live (v6) app, exported by scripts/export-legacy-saves.mjs, must load into the new
// store, resume paused, and re-save with an identical shape (same keys, same values).
import {describe, it, expect} from 'vitest';
import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {normalize} from '@engine/model.js';
import {makeStore} from './harness.js';

const dir = path.resolve(process.cwd(), 'tests-ui/fixtures/legacy-saves');
const files = readdirSync(dir).filter(f => f.endsWith('.json')).sort();
const load = f => readFileSync(path.join(dir, f), 'utf8');

/** Recursive key-structure of a JSON value (arrays by their first element), for "identical shape" assertions. */
const shape = v => Array.isArray(v) ? [v.length ? shape(v[0]) : null] : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, shape(v[k])])) : typeof v;

describe('legacy saves', () => {
  it('there are fixtures for every important situation', () => { expect(files.length).toBeGreaterThanOrEqual(6); });

  for (const file of files) {
    it(`${file} loads, resumes paused and re-saves with identical shape and content`, () => {
      const raw = load(file), blob = JSON.parse(raw);
      const h = makeStore(raw); h.a.init();
      const s = h.get();
      expect(s.saveStatus).toEqual({rejected: false, checkpointDamaged: false});
      expect(s.design).toEqual(normalize(blob.design)); expect(s.runs).toHaveLength(blob.runs.length); expect(s.board).toEqual(blob.board);
      expect(s.prefs.language).toBe(blob.prefs.language); expect(s.prefs.reducedMotion).toBe(blob.prefs.reducedMotion);
      expect(s.team.mode).toBe(blob.team.mode); expect(s.team.suggestions).toEqual(blob.team.suggestions);
      expect(h.raw()).toBe(raw); // loading never rewrites the save
      expect(s.playing).toBe(false); expect(h.intervals.size).toBe(0);
      if (blob.checkpoint) {
        expect(s.sheet.id).toBe('resume'); expect(s.run).toEqual(blob.checkpoint.run); expect(s.screen).toBe('flight');
        expect(!!s.run.crisis).toBe(!!blob.checkpoint.run.crisis);
        h.a['resume-checkpoint'](); expect(h.get().sheet).toBeNull(); expect(h.get().playing).toBe(false);
      } else { expect(s.sheet).toBeNull(); expect(s.run).toBeNull(); }
      h.a.persist();
      const again = h.stored();
      expect(shape(again)).toEqual(shape(blob));
      expect(again).toEqual(blob);
    });
  }

  it('a resumed checkpoint can be finished and archived like a live flight', () => {
    const raw = load('03-flight-operations.json'); const h = makeStore(raw); h.a.init(); h.a['resume-checkpoint']();
    for (let i = 0; i < 40 && !h.get().run.done; i++) { const r = h.get().run; if (r.crisis) h.a.resolve(r.crisis.actions.find(a => !a.disabled).id); else h.a.fast(); }
    expect(h.get().run.done).toBe(true); expect(h.stored().runs).toHaveLength(1); expect(h.stored().checkpoint).toBeNull();
  });

  it('a pending crisis from a legacy checkpoint can be answered', () => {
    const h = makeStore(load('02-flight-pending-crisis.json')); h.a.init(); h.a['resume-checkpoint']();
    const run = h.get().run; expect(run.crisis).toBeTruthy();
    h.a.resolve(run.crisis.actions.find(a => !a.disabled).id); expect(h.get().run.crisis === null || h.get().run.done).toBeTruthy();
  });

  it('the damaged raw fixture is preserved byte for byte until an explicit discard', () => {
    const raw = readFileSync(path.join(dir, '07-damaged-raw.txt'), 'utf8'); const h = makeStore(raw); h.a.init();
    expect(h.get().sheet).toMatchObject({id: 'rejected-save', props: {kind: 'save'}});
    h.a.persist(); h.a['game-accept'](); expect(h.raw()).toBe(raw);
    h.a['discard-rejected-save'](); expect(h.stored().runs).toEqual([]);
  });

  it('new preferences (sound, haptics) are added to the save only after the player turns them on', () => {
    const h = makeStore(load('01-hangar-draft.json')); h.a.init(); h.a.persist();
    expect(Object.keys(h.stored().prefs)).toEqual(['language', 'guided', 'reducedMotion']);
    h.a['toggle-sound'](); expect(h.stored().prefs.sound).toBe(true);
    h.a['toggle-sound'](); expect(Object.keys(h.stored().prefs)).toEqual(['language', 'guided', 'reducedMotion']);
  });
});
